#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '../src/i18n/common.ts'), 'utf8');
const start = src.indexOf('const COMMON');
const end = src.indexOf('export function getCommon');
let body = src.slice(start, end);
body = body.replace(/const COMMON: Record<string, unknown> =/, 'const COMMON =');
body = body.replace(/ as const/g, '');
const fn = new Function(`${body}; return COMMON;`);
const COMMON = fn();

const keys = [];
function collect(o, pathParts) {
  if (o && typeof o === 'object' && typeof o.zh === 'string' && typeof o.en === 'string') {
    keys.push({ path: pathParts.join('.'), zh: o.zh, en: o.en });
    return;
  }
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) collect(v, [...pathParts, k]);
  }
}
collect(COMMON, []);
const out = path.join(__dirname, '../src/i18n/_keys_export.json');
fs.writeFileSync(out, JSON.stringify(keys, null, 2));
console.log(`exported ${keys.length} keys -> ${out}`);
