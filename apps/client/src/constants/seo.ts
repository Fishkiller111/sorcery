/** Web app origin — baked at build time from EXPO_PUBLIC_APP_SITE_URL. */
function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, '');
}

function resolveAppSiteUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_APP_SITE_URL?.trim();
  if (fromEnv) return normalizeOrigin(fromEnv);

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeOrigin(window.location.origin);
  }

  return '';
}

function resolveMarketingSiteUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_MARKETING_SITE_URL?.trim();
  if (fromEnv) return normalizeOrigin(fromEnv);
  return '';
}

export const APP_SITE_URL = resolveAppSiteUrl();

/** Marketing site — canonical source for long-form SEO content. */
export const MARKETING_SITE_URL = resolveMarketingSiteUrl();

export const APP_SEO = {
  title: 'Soulthread — AI Characters That Remember',
  description:
    'Play Soulthread in your browser — Story Mode with branching paths, Free Chat with layered long-term memory, and official Still Here characters.',
  ogTitle: 'Soulthread — Play Story Mode & Free Chat',
  ogDescription:
    'Memory-driven AI companions. Play Still Here: Red Long Night, talk to official characters, and shape branching stories in your browser.',
} as const;

export function buildAppJsonLd() {
  const siteUrl = APP_SITE_URL || resolveAppSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: 'Soulthread',
        description: APP_SEO.description,
        inLanguage: 'en',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#application`,
        name: 'Soulthread',
        applicationCategory: 'EntertainmentApplication',
        operatingSystem: 'Web',
        url: `${siteUrl}/`,
        description: APP_SEO.description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Story Mode with branching narrative',
          'Free Chat with layered long-term memory',
          'Official Still Here: Red Long Night characters',
          'Web app — no install required',
        ],
      },
      {
        '@type': 'VideoGame',
        name: 'Still Here: Red Long Night',
        description:
          'Alternate-history resistance drama — play the prologue free in Soulthread Story Mode.',
        url: `${MARKETING_SITE_URL}/still-here/`,
        isPartOf: { '@id': `${siteUrl}/#application` },
      },
    ],
  };
}
