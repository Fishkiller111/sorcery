import { useEffect, useState } from 'react';
import { LogBox, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleAnalytics } from '../src/components/analytics/GoogleAnalytics';
import { MetrikaAnalytics } from '../src/components/analytics/MetrikaAnalytics';
import { AppStripeProvider } from '../src/components/payments/AppStripeProvider';
import { ApiSessionBridge } from '../src/components/common/ApiSessionBridge';
import { AuthRouteGuard } from '../src/components/common/AuthRouteGuard';
import { AffiliateAttributionCapture } from '../src/components/common/AffiliateAttributionCapture';
import { AppLaunchSplash } from '../src/components/common/AppLaunchSplash';
import { TelegramWebAppAuth } from '../src/components/common/TelegramWebAppAuth';
import { TelegramStartParamRedirect } from '../src/components/common/TelegramStartParamRedirect';
import { UserLangSync } from '../src/components/common/UserLangSync';
import { WebSeoHead } from '../src/components/seo/WebSeoHead';
import { MessageHost } from '../src/components/ui/Message';
import { AiDataConsentModal } from '../src/components/privacy/AiDataConsentModal';
import { I18nProvider } from '../src/i18n/I18nContext';
import { ThemeProvider } from '../src/theme/useTheme';
import { ThemeAccessSync } from '../src/theme/system/ThemeAccessSync';
import { useAppFonts } from '../src/theme/useAppFonts';
import { useAuthStore } from '../src/stores/authStore';
import { loadMatureSettings } from '../src/engine/flagStore';
import { PRIMARY_SCENE_ID } from '../src/constants/scene';
import { setLocalMatureOptIn } from '../src/utils/matureOptIn';

// Transient WS reconnect noise must not cover the chat UI in Expo Go / LogBox.
LogBox.ignoreLogs([
  'WebSocket error',
  '[ChatWebSocket] connection error',
  '[StoryWebSocket] connection error',
]);

SplashScreen.preventAutoHideAsync();

function AuthInitializer() {
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    let cancelled = false;
    void loadMatureSettings(PRIMARY_SCENE_ID).then((settings) => {
      if (cancelled) return;
      // App Store: iOS never enables mature; ignore leftover local flags.
      setLocalMatureOptIn(Platform.OS === 'ios' ? false : settings.enabled);
    }).finally(() => {
      if (!cancelled) restore();
    });
    return () => {
      cancelled = true;
    };
  }, [restore]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const [webFontGiveUp, setWebFontGiveUp] = useState(Platform.OS !== 'web');
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const timer = setTimeout(() => setWebFontGiveUp(true), 15_000);
    return () => clearTimeout(timer);
  }, []);

  const appReady =
    fontsLoaded || fontError != null || (Platform.OS === 'web' && webFontGiveUp);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!splashFinished) {
    return (
      <AppLaunchSplash
        ready={appReady}
        onFinish={() => setSplashFinished(true)}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <AppStripeProvider>
        <I18nProvider>
          <ThemeProvider>
            <ThemeAccessSync />
            <AuthInitializer />
            <AffiliateAttributionCapture />
            <TelegramWebAppAuth />
            <TelegramStartParamRedirect />
            <AuthRouteGuard />
            <ApiSessionBridge />
            <UserLangSync />
            <MessageHost />
            <AiDataConsentModal />
            <StatusBar style="light" />
            <Stack
              screenLayout={({ children }) => (
                <>
                  <WebSeoHead />
                  {Platform.OS === 'web' ? <GoogleAnalytics /> : null}
                  {Platform.OS === 'web' ? <MetrikaAnalytics /> : null}
                  {children}
                </>
              )}
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0a0b0f' },
              }}
            >
              {/* Primary bottom-nav destinations: instant switch, no slide. */}
              <Stack.Screen name="index" options={{ animation: 'none' }} />
              <Stack.Screen name="mode-select" options={{ animation: 'none' }} />
              <Stack.Screen name="social" options={{ animation: 'none' }} />
              <Stack.Screen name="free-chat/index" options={{ animation: 'none' }} />
              <Stack.Screen name="create-agent" options={{ animation: 'none' }} />
              <Stack.Screen name="profile" options={{ animation: 'none' }} />
            </Stack>
          </ThemeProvider>
        </I18nProvider>
      </AppStripeProvider>
    </SafeAreaProvider>
  );
}
