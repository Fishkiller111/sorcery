import { Platform } from 'react-native';
import Head from 'expo-router/head';
import { usePathname } from 'expo-router';

import {
  buildAppCanonicalUrl,
  getIndexableRoute,
  shouldNoindexAppPath,
} from '../../constants/appSitemap';
import { APP_SITE_URL } from '../../constants/seo';

export function WebSeoHead() {
  const pathname = usePathname() ?? '/';
  const noindex = shouldNoindexAppPath(pathname);
  const route = getIndexableRoute(pathname);
  const canonical = buildAppCanonicalUrl(APP_SITE_URL, pathname);

  const title = route?.title ?? 'Soulthread';
  const description = route?.description ?? '';
  const ogTitle = route?.ogTitle ?? title;
  const ogDescription = route?.ogDescription ?? description;

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Head>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={ogTitle} />
      {ogDescription ? <meta property="og:description" content={ogDescription} /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      {ogDescription ? <meta name="twitter:description" content={ogDescription} /> : null}
    </Head>
  );
}
