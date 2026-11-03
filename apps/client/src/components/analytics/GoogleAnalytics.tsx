import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { trackCampaignLanding, trackPageView } from '../../utils/analytics';
import {
  captureAppLandingUtm,
  getUtmSession,
  hasUtmParams,
} from '../../utils/utm';

/** SPA 路由切换时上报 GA page_view 与重点页面自定义事件 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const utmCaptured = useRef(false);

  useEffect(() => {
    if (utmCaptured.current) return;
    utmCaptured.current = true;
    const isNew = captureAppLandingUtm();
    if (isNew && hasUtmParams(getUtmSession())) {
      trackCampaignLanding();
    }
  }, []);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
