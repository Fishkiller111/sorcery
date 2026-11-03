import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { DefaultShell } from './components/DefaultShell';
import { DefaultAuthPrimaryButton } from './components/DefaultAuthPrimaryButton';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';

/** Default 主题：支付取消回跳页（Stripe / PayPal / NOWPayments cancel_url） */
export default function DefaultVipCancel() {
  const router = useRouter();
  const { t } = useI18n();
  const pageContentPadding = useMobilePageContentPaddingStyle();

  return (
    <DefaultShell scrollable={false}>
      <View style={[styles.root, pageContentPadding]}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('vip.cancel.title')}</Text>
          <Text style={styles.body}>{t('vip.cancel.body')}</Text>
          <DefaultAuthPrimaryButton
            label={t('vip.cancel.retry')}
            onPress={() => router.replace('/vip/shop')}
            style={styles.btn}
          />
        </View>
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    paddingHorizontal: 28,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
    },
    'display',
  ),
  body: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 8,
    },
    'sans',
  ),
  btn: {
    width: '100%',
    maxWidth: 280,
  },
});
