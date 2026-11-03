import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import type { VipExternalPayMethod } from '../../utils/vipPurchase';

type VipPayMethodBarProps = {
  value: VipExternalPayMethod;
  onChange: (method: VipExternalPayMethod) => void;
  /** Show crypto option (NOWPayments). */
  cryptoEnabled?: boolean;
  tone?: 'default' | 'soviet';
};

/**
 * Card vs crypto selector for Web/Android VIP + Soul checkout.
 * Hidden when only one method is available.
 */
export function VipPayMethodBar({
  value,
  onChange,
  cryptoEnabled = true,
  tone = 'default',
}: VipPayMethodBarProps) {
  const { t } = useI18n();
  if (!cryptoEnabled) return null;

  const soviet = tone === 'soviet';
  const methods: { id: VipExternalPayMethod; label: string }[] = [
    { id: 'stripe', label: t('vip.shop.payMethodCard') },
    { id: 'nowpayments', label: t('vip.shop.payMethodCrypto') },
  ];

  return (
    <View
      style={[styles.root, soviet ? styles.rootSoviet : styles.rootDefault]}
      accessibilityRole="tablist"
    >
      {methods.map((m) => {
        const active = value === m.id;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(m.id)}
            style={({ pressed }) => [
              styles.tab,
              soviet ? styles.tabSoviet : styles.tabDefault,
              active && (soviet ? styles.tabActiveSoviet : styles.tabActiveDefault),
              pressed && styles.tabPressed,
            ]}
          >
            <Text
              style={[
                styles.label,
                soviet ? styles.labelSoviet : styles.labelDefault,
                active && (soviet ? styles.labelActiveSoviet : styles.labelActiveDefault),
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
    marginBottom: 16,
  },
  rootDefault: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rootSoviet: {
    padding: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(232,213,181,0.18)',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabDefault: {
    borderRadius: 999,
  },
  tabSoviet: {
    borderRadius: 1,
  },
  tabActiveDefault: {
    backgroundColor: 'rgba(212,175,55,0.22)',
  },
  tabActiveSoviet: {
    backgroundColor: 'rgba(196,30,58,0.35)',
  },
  tabPressed: {
    opacity: 0.88,
  },
  label: Typo(
    {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    'sans',
  ),
  labelDefault: {
    color: 'rgba(255,255,255,0.55)',
  },
  labelSoviet: {
    color: 'rgba(168,168,168,0.9)',
  },
  labelActiveDefault: {
    color: '#D4AF37',
  },
  labelActiveSoviet: {
    color: '#f0ece4',
  },
});
