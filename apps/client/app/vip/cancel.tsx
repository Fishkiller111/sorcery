import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemePage } from '../../src/theme/useThemePage';
import { useTheme } from '../../src/theme/useTheme';
import DefaultVipCancel from '../../src/pages/default/VipCancel';
import { ShellLayout } from '../../src/components/shell/ShellLayout';
import { useI18n } from '../../src/i18n/I18nContext';
import { COLORS } from '../../src/theme/colors';
import { Typo } from '../../src/theme/typography';
import { useMobilePageContentPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';

export default function VipCancel() {
  const { loaded } = useTheme();
  const ThemedPage = useThemePage({ default: DefaultVipCancel });
  if (ThemedPage) return <ThemedPage />;
  // 支付回跳是整页刷新；主题尚未读出时先走默认新 UI，避免闪旧 Soviet 壳
  if (!loaded) return <DefaultVipCancel />;
  return <SovietVipCancel />;
}

function SovietVipCancel() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const pageContentPadding = useMobilePageContentPaddingStyle();

  return (
    <ShellLayout scrollable={false} showLangToggle={false}>
      <View style={[styles.root, pageContentPadding]}>
        <Text style={Typo(styles.title, 'display', lang)}>{t('vip.cancel.title')}</Text>
        <Text style={Typo(styles.body, 'sans', lang)}>{t('vip.cancel.body')}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/vip/shop')} activeOpacity={0.85}>
          <Text style={Typo(styles.btnText, 'sans', lang)}>{t('vip.cancel.retry')}</Text>
        </TouchableOpacity>
      </View>
    </ShellLayout>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  title: { color: COLORS.text.primary, fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  body: { color: COLORS.text.secondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn: {
    backgroundColor: COLORS.accent.gold,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  btnText: { color: '#0a0b0f', fontSize: 15, fontWeight: '700' },
});
