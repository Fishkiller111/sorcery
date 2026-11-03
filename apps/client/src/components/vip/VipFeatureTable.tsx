import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { VIP_TIER_ORDER, type VipTier } from '../../utils/vipPlans';

const MEDAL = require('../../../assets/images/ui/mode-select/pc-emblem_cccp_medal.png');
type FeatureRow = {
  key: string;
  labelKey: string;
  isNew?: boolean;
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
  { key: 'fast', labelKey: 'vip.shop.features.fast', tiers: { ultimate: true, premium: true, basic: false } },
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
  { key: 'communityVip', labelKey: 'vip.shop.features.communityVip', tiers: { ultimate: true, premium: false, basic: false } },
  {
    key: 'creatorIncentive',
    labelKey: 'vip.shop.features.creatorIncentive',
    highlight: true,
    tiers: { ultimate: true, premium: true, basic: true },
  },
];

const TIERS: VipTier[] = [...VIP_TIER_ORDER];

const GRID_BORDER = 'rgba(232,213,181,0.18)';

type VipFeatureTableProps = {
  selectedTier: VipTier;
  width: number;
};

type TableCellProps = {
  children: React.ReactNode;
  selected?: boolean;
  header?: boolean;
  feature?: boolean;
};

function TableCell({ children, selected, header, feature }: TableCellProps) {
  return (
    <View
      style={[
        styles.cell,
        feature ? styles.featureCol : styles.tierCol,
        header && styles.headerCell,
        selected && (header ? styles.selectedHeaderCell : styles.selectedCell),
      ]}
    >
      {children}
    </View>
  );
}

function CellMark({ included }: { included: boolean }) {
  return (
    <Text style={[styles.cellMark, included ? styles.check : styles.dash]}>
      {included ? '✓' : '—'}
    </Text>
  );
}

export function VipFeatureTable({ selectedTier, width }: VipFeatureTableProps) {
  const { t } = useI18n();

  return (
    <View style={[styles.wrapper, { width }]}>
      <View style={[styles.frame, { width }]}>
        <View style={styles.table}>
        <View style={styles.row}>
          <TableCell header feature>
            <Text style={styles.headerFeature}>{t('vip.shop.featureCol')}</Text>
          </TableCell>
          {TIERS.map((tier) => (
            <TableCell key={tier} header selected={selectedTier === tier}>
              <Text style={[styles.headerTier, selectedTier === tier && styles.headerTierActive]}>
                {t(`vip.shop.tier.${tier}`)}
              </Text>
            </TableCell>
          ))}
        </View>

        {FEATURES.map((row) => (
          <View key={row.key} style={styles.row}>
            <TableCell feature>
              <Text style={[styles.featureText, row.highlight && styles.featureTextHighlight]}>
                {t(row.labelKey)}
                {row.isNew ? (
                  <Text style={styles.newTag}> [{t('vip.shop.newTag')}]</Text>
                ) : null}
              </Text>
            </TableCell>
            {TIERS.map((tier) => (
              <TableCell key={tier} selected={selectedTier === tier}>
                <CellMark included={row.tiers[tier]} />
              </TableCell>
            ))}
          </View>
        ))}
        </View>
      </View>
      <Image source={MEDAL} style={styles.medal} resizeMode="contain" />
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    paddingBottom: 36,
    paddingRight: 36,
  },
  frame: {
    borderWidth: 1,
    borderColor: GRID_BORDER,
    backgroundColor: 'transparent',
    borderRadius: 4,
    overflow: 'hidden',
  },
  table: {},
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: GRID_BORDER,
    justifyContent: 'center',
    minHeight: 36,
  },
  headerCell: {
    minHeight: 40,
  },
  featureCol: {
    flex: 2.2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tierCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  selectedHeaderCell: {
    backgroundColor: COLORS.agents.tabActive,
  },
  selectedCell: {
    backgroundColor: 'rgba(139,26,26,0.18)',
  },
  headerFeature: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  headerTier: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'mono',
  ),
  headerTierActive: {
    color: COLORS.agents.paleGold,
  },
  featureText: Typo(
    {
      color: 'rgba(228,224,214,0.92)',
      fontSize: 12,
      lineHeight: 17,
    },
    'sans',
  ),
  featureTextHighlight: {
    ...Typo(
      {
        color: '#F0C9A0',
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '700',
        letterSpacing: 0.2,
      },
      'sans',
    ),
    textShadowColor: 'rgba(196, 30, 58, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  newTag: Typo(
    {
      color: '#c41e3a',
      fontSize: 11,
      fontWeight: '700',
    },
    'sans',
  ),
  cellMark: Typo(
    {
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
    },
    'mono',
  ),
  check: {
    color: '#f0ece4',
  },
  dash: {
    color: 'rgba(113,113,122,0.65)',
  },
  medal: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 100,
    height: 100,
    opacity: 0.9,
  },
});