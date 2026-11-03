#!/usr/bin/env node
/**
 * Batch-translate App UI strings (en -> jp/ru/es) via OpenRouter.
 * Reads OPENROUTER_API_KEY from ai-character/.env
 *
 * Usage: node scripts/translate-locales.mjs [--lang jp|ru|es] [--batch 40]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const KEYS_PATH = path.join(ROOT, 'src/i18n/_keys_export.json');
const ENV_PATH = path.join(ROOT, '../ai-character/.env');

const LANG_NAMES = {
  jp: 'Japanese',
  ru: 'Russian',
  es: 'Spanish',
};

function loadApiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  if (!fs.existsSync(ENV_PATH)) throw new Error(`Missing ${ENV_PATH}`);
  const line = fs
    .readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('OPENROUTER_API_KEY='));
  if (!line) throw new Error('OPENROUTER_API_KEY not found');
  return line.split('=').slice(1).join('=').trim();
}

async function translateBatch(items, targetLang, apiKey) {
  const targetName = LANG_NAMES[targetLang];
  const payload = Object.fromEntries(items.map((i) => [i.path, i.en]));
  const system = `You are a professional UI translator for a mobile game app called Soulthread.
Translate each JSON string value from English to natural ${targetName}.
Keep placeholders like {count}, {name}, {seconds} unchanged.
Keep brand names (Soulthread, VIP, Mature, Art Deco) as appropriate for ${targetName} readers.
Output ONLY valid JSON with the same keys, no markdown.`;
  const user = JSON.stringify(payload);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-v3.2',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 8192,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  let content = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start >= 0 && end > start) {
    content = content.slice(start, end + 1);
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`invalid JSON from model (${targetLang}): ${String(err).slice(0, 80)}`);
  }
  return parsed;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const langs = args.includes('--lang')
    ? [args[args.indexOf('--lang') + 1]]
    : ['jp', 'ru', 'es'];
  const batchSize = args.includes('--batch')
    ? Number(args[args.indexOf('--batch') + 1])
    : 35;

  const keys = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf8'));
  const apiKey = loadApiKey();
  const localesDir = path.join(ROOT, 'src/i18n/locales');
  fs.mkdirSync(localesDir, { recursive: true });

  for (const lang of langs) {
    if (!LANG_NAMES[lang]) throw new Error(`Unknown lang ${lang}`);
    const outPath = path.join(localesDir, `${lang}.json`);
    const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
    const pending = keys.filter((k) => !existing[k.path]);
    console.log(`[${lang}] ${pending.length} keys to translate (${Object.keys(existing).length} cached)`);
    const batches = chunk(pending, batchSize);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`  batch ${i + 1}/${batches.length} (${batch.length} keys)...`);
      let translated;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          translated = await translateBatch(batch, lang, apiKey);
          break;
        } catch (err) {
          if (attempt === 3) throw err;
          console.warn(`    retry ${attempt}/3: ${err.message?.slice(0, 120)}`);
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      for (const [pathKey, value] of Object.entries(translated)) {
        if (typeof value === 'string' && value.trim()) existing[pathKey] = value;
      }
      fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
      await new Promise((r) => setTimeout(r, 800));
    }
    console.log(`[${lang}] wrote ${Object.keys(existing).length} entries -> ${outPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
