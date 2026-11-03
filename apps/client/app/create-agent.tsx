import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useThemePage } from '../src/theme/useThemePage';
import DefaultCreateAgent from '../src/pages/default/CreateAgent';
import { FreeChatShell } from '../src/components/shell/FreeChatShell';
import { CreateAgentWizard } from '../src/components/create-agent/CreateAgentWizard';
import { useI18n } from '../src/i18n/I18nContext';
import { useAuthStore } from '../src/stores/authStore';
import { COLORS } from '../src/theme/colors';
import { requireLoginForAction } from '../src/utils/requireLogin';
import { useMobilePageContentPaddingStyle } from '../src/hooks/useMobileSafeAreaPadding';

export default function CreateAgent() {
  const ThemedPage = useThemePage({ default: DefaultCreateAgent });
  if (ThemedPage) return <ThemedCreateAgentPage Page={ThemedPage} />;
  return <SovietCreateAgent />;
}

function ThemedCreateAgentPage({ Page }: { Page: React.ComponentType }) {
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
        <ActivityIndicator color={COLORS.agents.brightGold} />
      </View>
    );
  }

  return <Page />;
}

function SovietCreateAgent() {
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
      <FreeChatShell>
        <LinearGradient colors={['#1c1f28', '#0a0b0f', '#0a0b0f']} style={styles.gradient} />
        <View style={[styles.loadingRoot, pageContentPadding]}>
          <ActivityIndicator color={COLORS.agents.brightGold} />
        </View>
      </FreeChatShell>
    );
  }

  return (
    <FreeChatShell>
      <LinearGradient colors={['#1c1f28', '#0a0b0f', '#0a0b0f']} style={styles.gradient} />
      <CreateAgentWizard />
    </FreeChatShell>
  );
}

const styles = StyleSheet.create({
  gradient: { ...StyleSheet.absoluteFill },
  loadingRoot: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});
