import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { captureAffFromUrl } from '../../utils/affiliateAttribution';
import { captureUtmFromUrl, getUtmSession, hasUtmParams } from '../../utils/utm';
import { trackCampaignLanding } from '../../utils/analytics';

/**
 * 任意入口捕获 ?aff= 与 utm_*（Web URL / 深链）。
 * aff → 30 天本地 → 注册传后端；utm → 30 天本地 → GA4 渠道事件。
 */
export function AffiliateAttributionCapture() {
  useEffect(() => {
    const ingest = (url: string) => {
      void captureAffFromUrl(url);
      const isNew = captureUtmFromUrl(url);
      if (isNew && hasUtmParams(getUtmSession())) {
        trackCampaignLanding();
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      ingest(window.location.href);
    }

    void Linking.getInitialURL().then((url) => {
      if (url) ingest(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      ingest(url);
    });
    return () => sub.remove();
  }, []);

  return null;
}
