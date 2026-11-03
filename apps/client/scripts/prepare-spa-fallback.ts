#!/usr/bin/env node
/// <reference types="node" />
/**
 * After `expo export`, copy index.html → spa.html for nginx history fallback
 * (non-/ routes). Previously also injected a TAAFT featured embed; that is gone.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const indexPath = join(distDir, 'index.html');
const spaPath = join(distDir, 'spa.html');

if (!existsSync(indexPath)) {
  console.error(`[prepare-spa-fallback] missing ${indexPath} — run expo export first`);
  process.exit(1);
}

copyFileSync(indexPath, spaPath);
console.log('[prepare-spa-fallback] spa.html ← copy of index.html');
