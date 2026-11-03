import { resolveLocale } from "../src/i18n/resolveLocale.js";
import { parseLanguageText } from "../src/i18n/languageText.js";

const localeCases: Array<[string | undefined, string]> = [
  [undefined, "en"],
  ["en", "en"],
  ["en-US", "en"],
  ["zh", "zh-Hans"],
  ["zh-cn", "zh-Hans"],
  ["zh-hans", "zh-Hans"],
  ["zh-tw", "zh-Hant"],
  ["zh-HK", "zh-Hant"],
  ["zh-hant", "zh-Hant"],
  ["es", "es"],
  ["es-MX", "es"],
  ["ru", "ru"],
  ["ru-RU", "ru"],
  ["fr", "en"],
  ["ja", "en"],
];

let failed = 0;
for (const [input, expected] of localeCases) {
  const got = resolveLocale(input);
  if (got !== expected) {
    console.error(`FAIL resolveLocale(${JSON.stringify(input)}) => ${got}, want ${expected}`);
    failed += 1;
  }
}

const textCases: Array<[string, string]> = [
  ["语言", "picker"],
  ["Language", "picker"],
  ["idioma", "picker"],
  ["English", "set:en"],
  ["简体中文", "set:zh-Hans"],
  ["繁體中文", "set:zh-Hant"],
  ["Español", "set:es"],
  ["Русский", "set:ru"],
  ["hello", "none"],
];

for (const [input, expected] of textCases) {
  const intent = parseLanguageText(input);
  const got = intent.kind === "set" ? `set:${intent.locale}` : intent.kind;
  if (got !== expected) {
    console.error(`FAIL parseLanguageText(${JSON.stringify(input)}) => ${got}, want ${expected}`);
    failed += 1;
  }
}

if (failed > 0) {
  process.exit(1);
}
console.log(`ok ${localeCases.length} locale + ${textCases.length} language-text cases`);
