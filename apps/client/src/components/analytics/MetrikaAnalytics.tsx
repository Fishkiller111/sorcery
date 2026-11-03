import { useEffect } from 'react';
import { Platform } from 'react-native';

import { YANDEX_METRIKA_ID } from '../../constants/config';
import { shouldTrackAnalytics } from '../../utils/analytics';

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

/**
 * 可选分析服务：使用部署方自己的 EXPO_PUBLIC_YANDEX_METRIKA_ID。
 * Never reuse marketing counter 110876717.
 *
 * Do NOT pass ecommerce:"dataLayer" — breaks GA4 gtag on the same page.
 */
export function MetrikaAnalytics() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!YANDEX_METRIKA_ID) return;
    if (!shouldTrackAnalytics()) return;

    const id = YANDEX_METRIKA_ID;
    const w = window as Window & { ym?: typeof window.ym };

    if (typeof w.ym === 'function') {
      try {
        w.ym(id, 'hit', window.location.href);
      } catch {
        // ignore
      }
      return;
    }

    const scriptSrc = `https://mc.yandex.ru/metrika/tag.js?id=${id}`;
    if (document.querySelector(`script[src="${scriptSrc}"]`)) return;

    // Standard Metrika bootstrap (same shape as landing; no ecommerce dataLayer).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (function (m: any, e: Document, t: string, r: string, i: string) {
      m[i] =
        m[i] ||
        function (...args: unknown[]) {
          (m[i].a = m[i].a || []).push(args);
        };
      m[i].l = 1 * new Date().getTime();
      for (let j = 0; j < e.scripts.length; j++) {
        if (e.scripts[j].src === r) return;
      }
      const k = e.createElement(t) as HTMLScriptElement;
      const a = e.getElementsByTagName(t)[0];
      k.async = true;
      k.src = r;
      a?.parentNode?.insertBefore(k, a);
    })(window, document, 'script', scriptSrc, 'ym');

    try {
      (window as Window).ym?.(id, 'init', {
        ssr: true,
        webvisor: true,
        clickmap: true,
        referrer: document.referrer,
        url: location.href,
        accurateTrackBounce: true,
        trackLinks: true,
      });
    } catch {
      // ignore
    }
  }, []);

  return null;
}
