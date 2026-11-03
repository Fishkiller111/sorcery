/**
 * Single source of truth for configured app SEO surfaces.
 * Used by generate-web-seo.ts (build) and WebSeoHead (runtime).
 */

export type AppSitemapRoute = {
  /** App path, e.g. `/` or `/login` */
  path: string;
  priority: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
};

/** Pages we intentionally submit to Google — must stay aligned with WebSeoHead robots meta. */
export const APP_INDEXABLE_ROUTES: readonly AppSitemapRoute[] = [
  {
    path: '/',
    priority: '1.0',
    changefreq: 'weekly',
    title: 'Soulthread — AI Characters That Remember',
    description:
      'Play Soulthread in your browser — Story Mode with branching paths, Free Chat with layered long-term memory, and official Still Here characters.',
    ogTitle: 'Soulthread — Play Story Mode & Free Chat',
    ogDescription:
      'Memory-driven AI companions. Play Still Here: Red Long Night, talk to official characters, and shape branching stories in your browser.',
  },
  {
    path: '/login',
    priority: '0.85',
    changefreq: 'monthly',
    title: 'Log In or Sign Up — Soulthread',
    description:
      'Create your Soulthread account to play Story Mode, start Free Chat with memory-driven AI characters, and continue your progress across devices.',
    ogTitle: 'Join Soulthread — Story Mode & Free Chat',
    ogDescription:
      'Sign up free in your browser. Play Still Here: Red Long Night, chat with official characters, and build layered long-term memory.',
  },
] as const;

/** In-app surfaces — disallow in robots.txt and noindex at runtime. */
export const APP_ROBOTS_DISALLOW_PREFIXES = [
  '/free-chat',
  '/story',
  '/settings',
  '/profile',
  '/mode-select',
  '/agent',
  '/explore',
  '/points',
  '/soul',
  '/referral',
  '/prologue',
  '/vip',
  '/scene',
  '/create-agent',
  '/survey',
] as const;

export function normalizeAppPathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const withoutQuery = pathname.split('?')[0]?.split('#')[0] ?? pathname;
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed || '/';
}

export function getIndexableRoute(pathname: string): AppSitemapRoute | undefined {
  const normalized = normalizeAppPathname(pathname);
  return APP_INDEXABLE_ROUTES.find((route) => route.path === normalized);
}

export function shouldNoindexAppPath(pathname: string): boolean {
  return getIndexableRoute(pathname) == null;
}

export function buildAppCanonicalUrl(siteUrl: string, pathname: string): string {
  const base = siteUrl.replace(/\/$/, '');
  const normalized = normalizeAppPathname(pathname);
  return normalized === '/' ? `${base}/` : `${base}${normalized}`;
}

export function buildAppSitemapXml(siteUrl: string, lastmod: string): string {
  const base = siteUrl.replace(/\/$/, '');
  const body = APP_INDEXABLE_ROUTES.map((route) => {
    const loc = route.path === '/' ? `${base}/` : `${base}${route.path}`;
    return `<url>
<loc>${loc}</loc>
<lastmod>${lastmod}</lastmod>
<changefreq>${route.changefreq}</changefreq>
<priority>${route.priority}</priority>
</url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function buildAppRobotsTxt(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  const disallowLines = APP_ROBOTS_DISALLOW_PREFIXES.map(
    (prefix) => `Disallow: ${prefix}`,
  ).join('\n');

  return `User-agent: *
Allow: /
Allow: /login
${disallowLines}

Sitemap: ${base}/sitemap.xml
`;
}

export function buildAppLlmsTxt(siteUrl: string, marketingSiteUrl: string, lastUpdated: string): string {
  const base = siteUrl.replace(/\/$/, '');
  const marketing = marketingSiteUrl.replace(/\/$/, '');

  return `# Soulthread Web App
# Last updated: ${lastUpdated}

> Memory-driven AI companions — Story Mode and Free Chat in your browser.

## Product

- **Web app (play now):** ${base}/
- **Sign up / log in:** ${base}/login
- **Marketing site:** ${marketing}/
- **Status:** Self-hosted instance.

## What you can do

- **Story Mode:** Branching interactive narratives (Still Here: Red Long Night prologue playable free).
- **Free Chat:** Open conversation with official characters that remember prior sessions.
- **Layered memory:** Characters retain context across sessions as lived experience.

## Key pages (indexable)

${APP_INDEXABLE_ROUTES.map((route) => {
  const url = route.path === '/' ? `${base}/` : `${base}${route.path}`;
  return `- ${url} — ${route.description}`;
}).join('\n')}

## FAQ

### How do I start playing?
Open ${base}/ in your browser or create an account at ${base}/login.

### Is Soulthread free?
The web app is free to start. Story prologue and Free Chat are available after sign-up.

### Where is the full product story?
See ${marketing}/still-here/ for Still Here: Red Long Night and ${marketing}/characters/ for character profiles.
`;
}
