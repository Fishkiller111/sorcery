import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';
import { VIP_TIER_ORDER, type VipTier } from '../../../utils/vipPlans';

type FeatureRow = {
  key: string;
  labelKey: string;
  highlight?: boolean;
  tiers: Record<VipTier, boolean>;
};

const FEATURES: FeatureRow[] = [
  { key: 'pm', labelKey: 'vip.shop.features.pm', tiers: { ultimate: true, premium: true, basic: true } },
  { key: 's', labelKey: 'vip.shop.features.s', tiers: { ultimate: true, premium: true, basic: true } },
  { key: 'full', labelKey: 'vip.shop.features.full', tiers: { ultimate: true, premium: true, basic: false } },
  { key: 'story', labelKey: 'vip.shop.features.story', tiers: { ultimate: true, premium: false, basic: false } },
  {
    key: 'noGuardrails',
    labelKey: 'vip.shop.features.noGuardrails',
    highlight: true,
    tiers: { ultimate: true, premium: true, basic: false },
  },
  {
    key: 'unlimitedChat',
    labelKey: 'vip.shop.features.unlimitedChat',
    highlight: true,
    tiers: { ultimate: true, premium: true, basic: false },
  },
  { key: 'voiceQuota', labelKey: 'vip.shop.features.voiceQuota', tiers: { ultimate: true, premium: false, basic: false } },
  {
    key: 'requestPhoto',
    labelKey: 'vip.shop.features.requestPhoto',
    highlight: true,
    tiers: { ultimate: true, premium: true, basic: false },
  },
  {
    key: 'liveCall',
    labelKey: 'vip.shop.features.liveCall',
    highlight: true,
    tiers: { ultimate: true, premium: true, basic: false },
  },
  {
    key: 'communitySystem',
    labelKey: 'vip.shop.features.communitySystem',
    tiers: { ultimate: true, premium: true, basic: true },
  },
  {
    key: 'creatorIncentive',
    labelKey: 'vip.shop.features.creatorIncentive',
    highlight: true,
    tiers: { ultimate: true, premium: true, basic: true },
  },
];

type DefaultVipFeatureTableProps = {
  selectedTier: VipTier;
};

function CellMark({ included, selected }: { included: boolean; selected: boolean }) {
  if (!included) {
    return <Text style={styles.dash}>-</Text>;
  }
  return (
    <Text style={[styles.check, selected && styles.checkSelected]}>✓</Text>
  );
}

export function DefaultVipFeatureTable({ selectedTier }: DefaultVipFeatureTableProps) {
  const { t } = useI18n();

  return (
    <View style={styles.wrapper}>
      <View style={styles.frame}>
        <View style={styles.row}>
          <View style={[styles.cell, styles.featureCol, styles.headerCell]}>
            <Text style={styles.headerFeature}>{t('vip.shop.featureCol')}</Text>
          </View>
          {VIP_TIER_ORDER.map((tier) => {
            const selected = selectedTier === tier;
            return (
              <View
                key={tier}
                style={[
                  styles.cell,
                  styles.tierCol,
                  styles.headerCell,
                  selected && styles.selectedHeaderCell,
                ]}
              >
                <Text style={[styles.headerTier, selected && styles.headerTierActive]}>
                  {t(`vip.shop.tier.${tier}`)}
                </Text>
              </View>
            );
          })}
        </View>

        {FEATURES.map((row, index) => (
          <View
            key={row.key}
            style={[styles.row, index === FEATURES.length - 1 && styles.rowLast]}
          >
            <View style={[styles.cell, styles.featureCol, styles.bodyCell]}>
              <Text style={[styles.featureText, row.highlight && styles.featureTextHighlight]}>
                {t(row.labelKey)}
              </Text>
            </View>
            {VIP_TIER_ORDER.map((tier) => {
              const selected = selectedTier === tier;
              return (
                <View
                  key={tier}
                  style={[
                    styles.cell,
                    styles.tierCol,
                    styles.bodyCell,
                    selected && styles.selectedCell,
                  ]}
                >
                  <CellMark included={row.tiers[tier]} selected={selected} />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  frame: {
    width: '100%',
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as object)
      : {}),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    justifyContent: 'center',
    minHeight: 44,
  },
  headerCell: {
    minHeight: 48,
    paddingVertical: 12,
  },
  bodyCell: {
    paddingVertical: 10,
  },
  featureCol: {
    flex: 2.4,
    paddingHorizontal: 20,
  },
  tierCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  selectedHeaderCell: {
    backgroundColor: 'rgba(186, 60, 71, 0.22)',
  },
  selectedCell: {
    backgroundColor: 'rgba(186, 60, 71, 0.1)',
  },
  headerFeature: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  headerTier: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'mono',
  ),
  headerTierActive: {
    color: TOKENS.colors.accent,
  },
  featureText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    'sans',
  ),
  featureTextHighlight: {
    ...Typo(
      {
        color: '#F2A8AE',
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '700',
        letterSpacing: 0.2,
      },
      'sans',
    ),
    textShadowColor: 'rgba(186, 60, 71, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    ...(Platform.OS === 'web'
      ? ({
          textShadow: '0 0 6px rgba(186,60,71,0.95), 0 0 16px rgba(186,60,71,0.55), 0 0 28px rgba(179,59,69,0.35)',
        } as object)
      : {}),
  },
  check: Typo(
    {
      fontSize: 16,
      fontWeight: '700',
      color: TOKENS.colors.textMuted,
      textAlign: 'center',
    },
    'mono',
  ),
  checkSelected: {
    color: TOKENS.colors.accent,
  },
  dash: Typo(
    {
      fontSize: 16,
      color: TOKENS.colors.textMuted,
      textAlign: 'center',
      opacity: 0.5,
    },
    'mono',
  ),
});
