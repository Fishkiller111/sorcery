import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';
import { DividerStar } from '../ui/DividerStar';

type Props = {
  collectedImages: number;
  totalImages: number;
  unlockedBranches: number;
  totalBranches: number;
  unlockedRewards: number;
  totalRewards: number;
  onViewAll?: () => void;
  floating?: boolean;
};

export function GalleryProgressPanel({
  collectedImages,
  totalImages,
  unlockedBranches,
  totalBranches,
  unlockedRewards,
  totalRewards,
  onViewAll,
  floating = false,
}: Props) {
  const { t } = useI18n();

  return (
    <View style={[styles.wrap, floating && styles.wrapFloating]} pointerEvents="box-none">
      <View style={styles.inner}>
        <View style={styles.heroRow}>
          <View style={styles.starWrap}>
            <DividerStar size={36} color={COLORS.accent.red} opacity={1} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.progressFraction}>
              {collectedImages}/{totalImages}
            </Text>
          </View>
        </View>

        <Text style={styles.statLine}>
          {t('gallery.branchExperienced')
            .replace('{branches}', String(unlockedBranches))
            .replace('{branchTotal}', String(totalBranches))}
        </Text>
        <Text style={styles.statLine}>
          {t('gallery.rewardsUnlockedShort')
            .replace('{n}', String(unlockedRewards))
            .replace('{total}', String(totalRewards))}
        </Text>

        <TouchableOpacity
          style={[styles.viewAllBtn, !onViewAll && styles.viewAllBtnMuted]}
          onPress={onViewAll}
          activeOpacity={onViewAll ? 0.85 : 1}
          disabled={!onViewAll}
        >
          <Text style={styles.viewAllText}>{t('gallery.viewAllRewards')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    maxWidth: 240,
  },
  wrapFloating: {
    position: 'absolute',
    left: 12,
    bottom: 16,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    zIndex: 10,
  },
  inner: {
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  starWrap: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  progressFraction: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 1,
      lineHeight: 32,
      textTransform: 'uppercase',
    },
    'display',
  ),
  statLine: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 11,
      lineHeight: 17,
      marginBottom: 2,
      letterSpacing: 0.3,
    },
    'mono',
  ),
  viewAllBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(158,27,27,0.6)',
    backgroundColor: '#7a1e1e',
    alignItems: 'center',
  },
  viewAllBtnMuted: {
    opacity: 0.55,
  },
  viewAllText: Typo(
    { color: COLORS.agents.paleGold, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    'sans',
  ),
});
