import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';
import { VIP_TIER_ORDER, type VipTier } from '../../../utils/vipPlans';

type DefaultVipTierTabsProps = {
  value: VipTier;
  onChange: (tier: VipTier) => void;
  style?: StyleProp<ViewStyle>;
  /** When set, only these tiers are shown (e.g. iOS IAP-backed tiers). */
  tiers?: readonly VipTier[];
};

export function DefaultVipTierTabs({ value, onChange, style, tiers }: DefaultVipTierTabsProps) {
  const { t } = useI18n();
  const visibleTiers = tiers?.length ? tiers : VIP_TIER_ORDER;

  return (
    <View style={[styles.tabs, style]}>
      {visibleTiers.map((tier) => {
        const active = value === tier;
        return (
          <Pressable
            key={tier}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(tier)}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {t(`vip.shop.tier.${tier}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(8, 10, 15, 0.72)',
    borderRadius: TOKENS.radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as object)
      : {}),
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: TOKENS.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  tabActive: {
    backgroundColor: TOKENS.colors.accent,
  },
  tabText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  tabTextActive: {
    color: '#fff',
  },
});
