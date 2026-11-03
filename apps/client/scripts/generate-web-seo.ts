#!/usr/bin/env node
/// <reference types="node" />
/**
 * Writes public/sitemap.xml, robots.txt, and llms.txt for the Expo web app.
 * Requires EXPO_PUBLIC_APP_SITE_URL (set via .env.test / .env.production / deploy overlay).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAppLlmsTxt,
  buildAppRobotsTxt,
  buildAppSitemapXml,
} from '../src/constants/appSitemap';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const siteUrl = process.env.EXPO_PUBLIC_APP_SITE_URL?.trim()?.replace(/\/$/, '');
if (!siteUrl) {
  console.error('[generate-web-seo] EXPO_PUBLIC_APP_SITE_URL is required');
  process.exit(1);
}

const marketingSiteUrl =
  process.env.EXPO_PUBLIC_MARKETING_SITE_URL?.trim()?.replace(/\/$/, '') ||
  siteUrl;

const lastmod = new Date().toISOString().slice(0, 10);

writeFileSync(join(root, 'public', 'robots.txt'), buildAppRobotsTxt(siteUrl), 'utf8');
writeFileSync(join(root, 'public', 'sitemap.xml'), buildAppSitemapXml(siteUrl, lastmod), 'utf8');
writeFileSync(
  join(root, 'public', 'llms.txt'),
  buildAppLlmsTxt(siteUrl, marketingSiteUrl, lastmod),
  'utf8',
);

console.log(
  `[generate-web-seo] ${siteUrl} → robots.txt, sitemap.xml, llms.txt (${lastmod})`,
);
