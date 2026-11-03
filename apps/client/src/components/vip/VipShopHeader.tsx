import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { COLORS } from '../../theme/colors';
import { DividerStar } from '../ui/DividerStar';
import { VipTierTabs } from './VipTierTabs';
import type { VipTier } from '../../utils/vipPlans';
type VipShopHeaderProps = {
  selectedTier: VipTier;
  onTierChange: (tier: VipTier) => void;
  contentWidth: number;
  isDesktop: boolean;
  currentPlanLabel?: string;
  tiers?: readonly VipTier[];
};

export function VipShopHeader({
  selectedTier,
  onTierChange,
  contentWidth,
  isDesktop,
  currentPlanLabel,
  tiers,
}: VipShopHeaderProps) {
  const { t } = useI18n();

  const titleBlock = (
    <View style={styles.titleCol}>
      <View style={styles.titleRow}>
        <DividerStar color="#9e1b1b" size={14} />
        <Text style={styles.mainTitle}>{t('vip.shop.packageTitle')}</Text>
        <DividerStar color="#9e1b1b" size={14} />
      </View>
      <Text style={styles.subtitle}>{t('vip.shop.packageSubtitle')}</Text>
      {currentPlanLabel ? (
        <Text style={styles.currentHint}>
          {t('vip.shop.currentPlan')}: {currentPlanLabel}
        </Text>
      ) : null}
    </View>
  );
  const tabsBlock = <VipTierTabs value={selectedTier} onChange={onTierChange} tiers={tiers} />;

  if (isDesktop) {
    return (
      <View style={[styles.desktopRow, { width: contentWidth }]}>
        <View style={styles.desktopCenter}>{titleBlock}</View>
        {tabsBlock}
      </View>
    );
  }

  return (
    <View style={[styles.mobileCol, { width: contentWidth }]}>
      {titleBlock}
      <View style={styles.mobileTabs}>{tabsBlock}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },
  mobileCol: {
    gap: 14,
    marginBottom: 18,
  },
  mobileTabs: {
    alignItems: 'center',
  },
  desktopCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  titleCol: {
    alignItems: 'center',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mainTitle: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 26,
      letterSpacing: 2,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'display',
  ),
  subtitle: Typo(    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 12,
      letterSpacing: 0.6,
      textAlign: 'center',
    },
    'sans',
  ),
  currentHint: Typo(
    {
      color: 'rgba(196,30,58,0.85)',
      fontSize: 11,
      marginTop: 2,
      letterSpacing: 0.4,
    },
    'mono',
  ),
});
