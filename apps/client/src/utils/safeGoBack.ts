import { type Href, router } from 'expo-router';

type RouterLike = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
};

/**
 * Go back when the stack has history; otherwise replace to a fallback.
 * Avoids the Expo Router "GO_BACK was not handled" warning after tab-style `replace` navigations.
 */
export function safeGoBack(fallback: Href = '/', r: RouterLike = router): void {
  if (r.canGoBack()) {
    r.back();
    return;
  }
  r.replace(fallback);
}
