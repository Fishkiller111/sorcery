import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemePage } from '../../../src/theme/useThemePage';
import DefaultWorldEditor from '../../../src/pages/default/WorldEditor';
import { useI18n } from '../../../src/i18n/I18nContext';
import { useAuthStore } from '../../../src/stores/authStore';
import { TOKENS } from '../../../src/pages/default/theme/tokens';
import { requireLoginForAction } from '../../../src/utils/requireLogin';
import { useMobilePageContentPaddingStyle } from '../../../src/hooks/useMobileSafeAreaPadding';

export default function WorldEditRoute() {
  const ThemedPage = useThemePage({ default: DefaultWorldEditor });
  if (ThemedPage) return <Guarded Page={ThemedPage} />;
  return <Guarded Page={DefaultWorldEditor} />;
}

function Guarded({ Page }: { Page: React.ComponentType }) {
  const router = useRouter();
  const { t } = useI18n();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);

  React.useEffect(() => {
    if (isRestored && !isLoggedIn) {
      requireLoginForAction(false, router, t('errors.authTokenMissing'));
    }
  }, [isLoggedIn, isRestored, router, t]);

  if (!isRestored || !isLoggedIn) {
    return (
      <View style={[styles.loadingRoot, pageContentPadding]}>
        <ActivityIndicator color={TOKENS.colors.accent} />
      </View>
    );
  }

  return <Page />;
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.bg,
  },
});
