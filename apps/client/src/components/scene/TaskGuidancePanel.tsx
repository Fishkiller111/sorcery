import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BeatConfig, BeatId } from '../../engine/types';
import { useI18n } from '../../i18n/I18nContext';
import { resolveLocalized } from '../../i18n/utils';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { DividerStar } from '../ui/DividerStar';
import type { LocalizedString } from '../../i18n/types';

type ShortcutHintMode = 'dev' | 'stuck' | false;

type Props = {
  beat: BeatConfig;
  beats: BeatConfig[];
  rewardActive?: boolean;
  rewardHint?: LocalizedString;
  shortcutHintMode?: ShortcutHintMode;
};

const STORY_BEAT_ORDER: BeatId[] = ['beat_1', 'beat_2', 'beat_3', 'beat_4', 'beat_5'];

export function TaskGuidancePanel({
  beat,
  beats,
  rewardActive,
  rewardHint,
  shortcutHintMode,
}: Props) {
  const { lang, t } = useI18n();

  const storyBeats = useMemo(
    () => STORY_BEAT_ORDER.map((id) => beats.find((b) => b.beatId === id)).filter(Boolean) as BeatConfig[],
    [beats],
  );

  const beatIndex = Math.max(0, storyBeats.findIndex((b) => b.beatId === beat.beatId)) + 1;
  const beatTotal = storyBeats.length || 1;

  const objective = rewardActive && rewardHint
    ? resolveLocalized(rewardHint, lang)
    : beat.taskHint
      ? resolveLocalized(beat.taskHint, lang)
      : t('scene.taskFallback');

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.wrap}>
      <View style={styles.panel}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <DividerStar size={10} color={COLORS.agents.tabActive} />
            <Text style={styles.kicker}>{t('scene.taskTitle').toUpperCase()}</Text>
          </View>
          <Text style={styles.beatBadge}>
            {t('scene.beatProgress')
              .replace('{current}', String(beatIndex))
              .replace('{total}', String(beatTotal))
              .toUpperCase()}
          </Text>
        </View>

        <Text style={styles.objective} numberOfLines={4}>
          {objective}
        </Text>

        {rewardActive ? (
          <Text style={styles.rewardTag}>{t('scene.taskRewardBranch')}</Text>
        ) : null}

        <Text style={styles.hint}>
          {shortcutHintMode === 'dev'
            ? t('scene.taskHintDev')
            : shortcutHintMode === 'stuck'
              ? t('scene.taskHintStuck')
              : t('scene.taskHint')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minWidth: 0,
  },
  panel: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  kicker: Typo(
    {
      color: COLORS.agents.tabActive,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
    },
    'mono',
  ),
  beatBadge: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 0.6,
      flexShrink: 0,
    },
    'mono',
  ),
  objective: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    'sans',
  ),
  rewardTag: Typo(
    {
      color: COLORS.agents.brightGold,
      fontSize: 10,
      fontStyle: 'italic',
    },
    'sans',
  ),
  hint: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 9,
      lineHeight: 13,
      marginTop: 1,
    },
    'sans',
  ),
});
