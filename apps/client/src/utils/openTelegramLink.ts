import { Linking, Platform } from 'react-native';

/** Open a t.me URL inside Telegram Mini App when possible; otherwise the system browser. */
export async function openTelegramLink(url: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const webApp = window.Telegram?.WebApp;
    if (typeof webApp?.openTelegramLink === 'function' && /^(https:\/\/)?t\.me\//i.test(url)) {
      webApp.openTelegramLink(url);
      return;
    }
    if (typeof webApp?.openLink === 'function') {
      webApp.openLink(url);
      return;
    }
  }
  await Linking.openURL(url);
}
