import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';

import { VIP_PRIVACY_URL, VIP_TERMS_URL, VIP_LEGAL_READY } from '../../constants/legal';
export { VIP_PRIVACY_URL, VIP_TERMS_URL, VIP_LEGAL_READY } from '../../constants/legal';

type VipSubscriptionLegalLinksProps = {
  /** Visual variant for soviet vs default skins. */
  tone?: 'soviet' | 'default';
};

/**
 * App Store 3.1.2(c): auto-renewable subscription purchase UI must include
 * functional Privacy Policy and Terms of Use (EULA) links.
 */
export function VipSubscriptionLegalLinks({ tone = 'soviet' }: VipSubscriptionLegalLinksProps) {
  const { t } = useI18n();
  const linkStyle = tone === 'default' ? styles.linkDefault : styles.linkSoviet;
  const sepStyle = tone === 'default' ? styles.sepDefault : styles.sepSoviet;
  const hintStyle = tone === 'default' ? styles.hintDefault : styles.hintSoviet;

  const open = useCallback((url: string) => {
    if (url) void Linking.openURL(url);
  }, []);

  if (!VIP_LEGAL_READY) {
    return <Text style={hintStyle}>{t('login.legalConfigMissing')}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <Text style={hintStyle}>{t('vip.shop.legalHint')}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('vip.shop.privacyPolicy')}
          onPress={() => open(VIP_PRIVACY_URL)}
          hitSlop={8}
        >
          <Text style={linkStyle}>{t('vip.shop.privacyPolicy')}</Text>
        </Pressable>
        <Text style={sepStyle}>·</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('vip.shop.termsOfUse')}
          onPress={() => open(VIP_TERMS_URL)}
          hitSlop={8}
        >
          <Text style={linkStyle}>{t('vip.shop.termsOfUse')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  hintSoviet: Typo(
    {
      color: '#9a948a',
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },
    'sans',
  ),
  hintDefault: Typo(
    {
      color: 'rgba(255,255,255,0.45)',
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },
    'sans',
  ),
  linkSoviet: Typo(
    {
      color: '#e8d5b5',
      fontSize: 13,
      lineHeight: 18,
      textDecorationLine: 'underline',
    },
    'sans',
  ),
  linkDefault: Typo(
    {
      color: '#D4AF37',
      fontSize: 13,
      lineHeight: 18,
      textDecorationLine: 'underline',
    },
    'sans',
  ),
  sepSoviet: Typo(
    {
      color: '#6a655c',
      fontSize: 13,
    },
    'sans',
  ),
  sepDefault: Typo(
    {
      color: 'rgba(255,255,255,0.35)',
      fontSize: 13,
    },
    'sans',
  ),
});
