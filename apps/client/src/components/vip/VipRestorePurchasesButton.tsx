import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';

type VipRestorePurchasesButtonProps = {
  onPress: () => void;
  loading?: boolean;
  /** Visual variant for soviet vs default skins. */
  tone?: 'soviet' | 'default';
};

/**
 * App Store Guideline 3.1.1: distinct user-initiated Restore Purchases control.
 */
export function VipRestorePurchasesButton({
  onPress,
  loading = false,
  tone = 'soviet',
}: VipRestorePurchasesButtonProps) {
  const { t } = useI18n();
  const labelStyle = tone === 'default' ? styles.labelDefault : styles.labelSoviet;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('vip.shop.restorePurchases')}
        accessibilityState={{ busy: loading, disabled: loading }}
        disabled={loading}
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, loading && styles.btnDisabled]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={tone === 'default' ? '#D4AF37' : '#e8d5b5'}
          />
        ) : (
          <Text style={labelStyle}>{t('vip.shop.restorePurchases')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  btn: {
    minHeight: 36,
    minWidth: 160,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.7,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  labelSoviet: Typo(
    {
      color: '#e8d5b5',
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      textDecorationLine: 'underline',
      textAlign: 'center',
    },
    'sans',
  ),
  labelDefault: Typo(
    {
      color: '#D4AF37',
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      textDecorationLine: 'underline',
      textAlign: 'center',
    },
    'sans',
  ),
});
