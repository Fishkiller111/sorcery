import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';
import { DefaultVipTierTabs } from './DefaultVipTierTabs';
import type { VipTier } from '../../../utils/vipPlans';

type DefaultVipShopHeaderProps = {
  selectedTier: VipTier;
  onTierChange: (tier: VipTier) => void;
  isDesktop: boolean;
  currentPlanLabel?: string;
  tiers?: readonly VipTier[];
};

export function DefaultVipShopHeader({
  selectedTier,
  onTierChange,
  isDesktop,
  currentPlanLabel,
  tiers,
}: DefaultVipShopHeaderProps) {
  const { t } = useI18n();

  const titleBlock = (
    <View style={styles.titleCol}>
      <Text style={styles.mainTitle}>{t('vip.shop.packageTitle')}</Text>
      <Text style={styles.subtitle}>{t('vip.shop.packageSubtitle')}</Text>
      {currentPlanLabel ? (
        <Text style={styles.currentHint}>
          {t('vip.shop.currentPlan')}: {currentPlanLabel}
        </Text>
      ) : null}
    </View>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopRow}>
        <View style={styles.desktopSpacer} />
        <View style={styles.desktopCenter}>{titleBlock}</View>
        <View style={styles.desktopTabs}>
          <DefaultVipTierTabs
            value={selectedTier}
            onChange={onTierChange}
            tiers={tiers}
            style={styles.tabsDesktop}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mobileCol}>
      {titleBlock}
      <View style={styles.mobileTabs}>
        <DefaultVipTierTabs value={selectedTier} onChange={onTierChange} tiers={tiers} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  desktopSpacer: {
    flex: 1,
    minWidth: 0,
  },
  desktopCenter: {
    flex: 2,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  desktopTabs: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  tabsDesktop: {
    alignSelf: 'flex-end',
  },
  mobileCol: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  mobileTabs: {
    alignItems: 'center',
  },
  titleCol: {
    alignItems: 'center',
    gap: 8,
  },
  mainTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '600',
      letterSpacing: 2.4,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'serif',
  ),
  subtitle: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
    },
    'sans',
  ),
  currentHint: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 12,
      letterSpacing: 0.4,
      textAlign: 'center',
    },
    'mono',
  ),
});
