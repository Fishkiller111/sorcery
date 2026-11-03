import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import DefaultCreateSimulator from '../../src/pages/default/CreateSimulator';
import { useSimulatorAccess } from '../../src/hooks/useSimulatorAccess';
import { useI18n } from '../../src/i18n/I18nContext';
import { useAuthStore } from '../../src/stores/authStore';
import { requireLoginForAction } from '../../src/utils/requireLogin';
import { safeGoBack } from '../../src/utils/safeGoBack';
import { useMobilePageContentPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';
import { DefaultMainBackground } from '../../src/pages/default/components/DefaultMainBackground';
import { TOKENS } from '../../src/pages/default/theme/tokens';
import { Typo } from '../../src/theme/typography';

export default function CreateSimulatorRoute() {
  const router = useRouter();
  const { t } = useI18n();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
  const { canAccessSimulator } = useSimulatorAccess();

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

  if (!canAccessSimulator) {
    return (
      <View style={styles.gate}>
        <DefaultMainBackground />
        <View style={styles.gateCard}>
          <Text style={styles.gateTitle}>{t('simulator.devOnlyTitle')}</Text>
          <Text style={styles.gateDesc}>{t('simulator.devOnlyDesc')}</Text>
          <Pressable style={styles.gateBtn} onPress={() => safeGoBack('/simulator', router)}>
            <Text style={styles.gateBtnText}>{t('menu.back')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return <DefaultCreateSimulator />;
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.bg,
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: TOKENS.colors.bg,
  },
  gateCard: {
    width: '100%',
    maxWidth: 400,
    padding: 28,
    gap: 14,
    alignItems: 'center',
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.72)',
  },
  gateTitle: Typo(
    { color: TOKENS.colors.text, fontSize: 20, fontWeight: '600', textAlign: 'center' },
    'display',
  ),
  gateDesc: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    'sans',
  ),
  gateBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
  },
  gateBtnText: Typo({ color: TOKENS.colors.text, fontWeight: '700', fontSize: 15 }, 'sans'),
});
