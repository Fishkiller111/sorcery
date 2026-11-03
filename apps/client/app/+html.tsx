import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { GA_MEASUREMENT_ID } from '../src/constants/config';
import { APP_SEO, APP_SITE_URL, buildAppJsonLd } from '../src/constants/seo';
import {
  HIDDEN_SCROLLBAR_GLOBAL_CSS,
  THEMED_SCROLLBAR_GLOBAL_CSS,
} from '../src/theme/webScrollbar';

const gaBootstrap = GA_MEASUREMENT_ID
  ? `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`
  : '';

const jsonLd = JSON.stringify(buildAppJsonLd());

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>{APP_SEO.title}</title>
        <meta name="description" content={APP_SEO.description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${APP_SITE_URL}/`} />
        <meta property="og:title" content={APP_SEO.ogTitle} />
        <meta property="og:description" content={APP_SEO.ogDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${APP_SITE_URL}/`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={APP_SEO.ogTitle} />
        <meta name="twitter:description" content={APP_SEO.ogDescription} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
        {/* Required for Mini App initData → platform JWT (Telegram account sync). */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
        {GA_MEASUREMENT_ID ? (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: gaBootstrap }} />
          </>
        ) : null}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
html {
  color-scheme: dark;
}
input[data-auth-input] {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none;
  appearance: none;
}
input[data-auth-input]:hover,
input[data-auth-input]:active,
input[data-auth-input]:focus,
input[data-auth-input]:focus-visible {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}
/* Chrome/Safari autofill paints an opaque white/yellow inner box that ignores background. */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active,
textarea:-webkit-autofill,
select:-webkit-autofill {
  -webkit-text-fill-color: #F2F2F4 !important;
  caret-color: #F2F2F4;
  border: none !important;
  box-shadow: 0 0 0 1000px #080A0F inset !important;
  -webkit-box-shadow: 0 0 0 1000px #080A0F inset !important;
  transition: background-color 99999s ease-out 0s;
}
input[data-auth-input]:-webkit-autofill,
input[data-auth-input]:-webkit-autofill:hover,
input[data-auth-input]:-webkit-autofill:focus,
input[data-auth-input]:-webkit-autofill:active {
  -webkit-text-fill-color: #F2F2F4 !important;
  caret-color: #F2F2F4;
  border: none !important;
  box-shadow: 0 0 0 1000px #080A0F inset !important;
  -webkit-box-shadow: 0 0 0 1000px #080A0F inset !important;
}
${THEMED_SCROLLBAR_GLOBAL_CSS}
${HIDDEN_SCROLLBAR_GLOBAL_CSS}
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
