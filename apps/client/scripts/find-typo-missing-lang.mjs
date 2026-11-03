import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const exts = ['.tsx', '.ts'];
const results = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'scripts') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (exts.some((e) => ent.name.endsWith(e))) {
      const rel = path.relative(root, p).replace(/\\/g, '/');
      if (rel === 'src/theme/typography.ts' || rel === 'src/pages/modern/theme/typography.ts') continue;
      const content = fs.readFileSync(p, 'utf8');

      // Match Typo(..., 'role') or Typo(..., 'role',) without lang/uiLang/vm.lang/appLang after role
      const re =
        /Typo\([\s\S]*?,\s*'(display|sans|mono|serif)'\s*(?:,\s*(?:lang|uiLang|vm\.lang|appLang)\b[\s\S]*?)?\)/g;

      let m;
      while ((m = re.exec(content)) !== null) {
        const full = m[0];
        if (/,\s*'(display|sans|mono|serif)'\s*,\s*(?:lang|uiLang|vm\.lang|appLang)\b/.test(full)) {
          continue;
        }
        const line = content.slice(0, m.index).split('\n').length;
        results.push({
          file: rel,
          line,
          role: m[1],
          snippet: full.replace(/\s+/g, ' ').slice(0, 100),
        });
      }
    }
  }
}

walk(root);
console.log('Total missing lang:', results.length);
for (const r of results) {
  console.log(`${r.file}:${r.line} [${r.role}] ${r.snippet}`);
}
