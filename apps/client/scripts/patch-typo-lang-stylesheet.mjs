import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const SKIP = new Set([
  'src/theme/typography.ts',
  'src/pages/modern/theme/typography.ts',
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'scripts') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function langImportPath(fileRel) {
  if (fileRel.startsWith('app/')) return '../src/i18n/types';
  if (fileRel.includes('pages/default/components/creation-center/')) return '../../../../i18n/types';
  if (fileRel.includes('pages/default/components/')) return '../../../../i18n/types';
  if (fileRel.startsWith('src/pages/')) return '../../i18n/types';
  return '../../i18n/types';
}

function i18nImportPath(fileRel) {
  return langImportPath(fileRel).replace('/types', '/I18nContext');
}

function addLangToTypoCalls(content) {
  // Multiline: 'role',\n) -> 'role', lang)
  content = content.replace(
    /'(display|sans|mono|serif)',\s*\n(\s*)\)/g,
    "'$1', lang\n$2)",
  );
  // Single line: Typo(..., 'role') -> Typo(..., 'role', lang)
  content = content.replace(
    /([Tt]ypo\([\s\S]*?,\s*'(display|sans|mono|serif)')\s*\)/g,
    (match, prefix) => {
      if (/,\s*(?:lang|uiLang|vm\.lang|appLang)\s*\)/.test(match)) return match;
      return `${prefix}, lang)`;
    },
  );
  return content;
}

function wrapStyleSheet(content) {
  const marker = 'const styles = StyleSheet.create(';
  const idx = content.indexOf(marker);
  if (idx === -1) return content;
  if (content.includes('function createStyles(lang')) return content;

  let i = idx + marker.length;
  if (content[i] !== '{') return content;

  let depth = 0;
  let end = -1;
  for (; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1 || content[end + 1] !== ')') return content;

  const before = content.slice(0, idx);
  const sheetBody = content.slice(idx + marker.length, end + 2);
  const after = content.slice(end + 2);
  return `${before}function createStyles(lang: Lang) {\n  return StyleSheet.create${sheetBody};\n}${after}`;
}

function ensureImports(content, fileRel) {
  if (!content.includes('createStyles(lang')) return content;

  if (!content.includes("import type { Lang }")) {
    const line = `import type { Lang } from '${langImportPath(fileRel)}';\n`;
    const m = content.match(/^import .+\n/m);
    content = m ? content.replace(m[0], m[0] + line) : line + content;
  }

  if (content.includes('useMemo(() => createStyles(lang)') && !/\buseMemo\b/.test(content)) {
    content = content.replace(/import \{([^}]+)\} from 'react';/, (m, inner) => {
      if (inner.includes('useMemo')) return m;
      return `import { ${inner.trim()}, useMemo } from 'react';`;
    });
  }

  return content;
}

function injectStylesInExportFunctions(content, fileRel) {
  if (!content.includes('createStyles(lang')) return content;

  const hookLine = '  const styles = useMemo(() => createStyles(lang), [lang]);';
  const fnRe = /export default function (\w+)|export function (\w+)/g;
  let result = content;
  const inserts = [];

  let m;
  while ((m = fnRe.exec(content)) !== null) {
    const fnName = m[1] || m[2];
    const bodyStart = content.indexOf('{', m.index) + 1;
    const chunk = content.slice(bodyStart, bodyStart + 6000);
    if (!chunk.includes('styles.')) continue;
    if (/const styles = useMemo\(\(\) => createStyles\(lang\)/.test(chunk.slice(0, 800))) continue;
    inserts.push({ bodyStart, fnName });
  }

  inserts.sort((a, b) => b.bodyStart - a.bodyStart);

  for (const ins of inserts) {
    const chunk = result.slice(ins.bodyStart, ins.bodyStart + 800);
    let prefix = '';

    if (!/\blang\b/.test(chunk.slice(0, 600))) {
      if (chunk.includes('useI18n()')) {
        // patch destructure later
      } else if (/\buiLang\b/.test(chunk.slice(0, 200))) {
        prefix = '  const lang = uiLang;\n';
      } else if (/\bvm\.lang\b/.test(chunk)) {
        prefix = '  const lang = vm.lang;\n';
      } else {
        if (!result.includes('useI18n')) {
          const line = `import { useI18n } from '${i18nImportPath(fileRel)}';\n`;
          const imp = result.match(/^import .+\n/m);
          result = imp ? result.replace(imp[0], imp[0] + line) : line + result;
        }
        prefix = '  const { lang } = useI18n();\n';
      }
    }

    result = result.slice(0, ins.bodyStart) + prefix + hookLine + '\n' + result.slice(ins.bodyStart);
  }

  result = result.replace(/const \{([^}]+)\} = useI18n\(\);/g, (full, inner) => {
    if (!result.includes('createStyles(lang)')) return full;
    if (/\blang\b/.test(inner)) return full;
    return `const { ${inner.trim()}, lang } = useI18n();`;
  });

  return result;
}

function shouldProcess(fileRel, content) {
  if (SKIP.has(fileRel)) return false;
  if (fileRel.includes('pages/modern/') && !fileRel.includes('Settings.tsx')) return false;
  if (!/(?:Typo|typo)\(/.test(content)) return false;
  if (!content.includes('StyleSheet.create')) return false;
  if (!/:\s*(?:Typo|typo)\(/.test(content) && !/(?:Typo|typo)\(\{/.test(content)) return false;
  return /(?:Typo|typo)\([\s\S]*?,\s*'(display|sans|mono|serif)'\s*(?:,\s*(?:lang|uiLang|vm\.lang|appLang)\b)?\s*\)/.test(content);
}

function patchFile(filePath) {
  const fileRel = rel(filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!shouldProcess(fileRel, content)) return false;

  content = content.replace(/import \{ typo \}/g, 'import { Typo }');
  content = content.replace(/import \{ typo, Typo \}/g, 'import { Typo }');
  content = content.replace(/import \{ Typo, typo \}/g, 'import { Typo }');
  content = content.replace(/\btypo\(/g, 'Typo(');

  content = wrapStyleSheet(content);
  content = addLangToTypoCalls(content);
  content = ensureImports(content, fileRel);
  content = injectStylesInExportFunctions(content, fileRel);

  fs.writeFileSync(filePath, content);
  return true;
}

let count = 0;
for (const f of walk(root)) {
  try {
    if (patchFile(f)) {
      count++;
      console.log('patched:', rel(f));
    }
  } catch (e) {
    console.error('failed:', rel(f), e.message);
  }
}
console.log('done', count);
