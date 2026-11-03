import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { VIP_TIER_ORDER, type VipTier } from '../../utils/vipPlans';

type VipTierTabsProps = {
  value: VipTier;
  onChange: (tier: VipTier) => void;
  /** When set, only these tiers are shown (e.g. iOS IAP-backed tiers). */
  tiers?: readonly VipTier[];
};

export function VipTierTabs({ value, onChange, tiers }: VipTierTabsProps) {
  const { t } = useI18n();
  const visibleTiers = tiers?.length ? tiers : VIP_TIER_ORDER;

  return (
    <View style={styles.tabs}>
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
    alignSelf: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 4,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.agents.border,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 22,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 26,
    minWidth: 66,
  },
  tabActive: {
    backgroundColor: COLORS.agents.tabActive,
  },
  tabText: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.6,
      lineHeight: 14,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  tabTextActive: {
    color: COLORS.agents.paleGold,
  },
});
