import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BeatConfig } from '../../engine/types';
import { BeatHeader } from './BeatHeader';
import { SceneOpeningPanel } from './SceneOpeningPanel';
import { TaskGuidancePanel } from './TaskGuidancePanel';
import { useI18n } from '../../i18n/I18nContext';
import { resolveLocalized } from '../../i18n/utils';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import type { LocalizedString } from '../../i18n/types';

const GUIDANCE_GRID_GAP = 5;
const GUIDANCE_COL_MIN = 0;
const GUIDANCE_COL_MAX = 350;

type ShortcutHintMode = 'dev' | 'stuck' | false;

type Props = {
  beat: BeatConfig;
  beats: BeatConfig[];
  contentTier: 'standard' | 'mature';
  onToggleTier: () => void;
  shortcutHintMode?: ShortcutHintMode;
  rewardActive?: boolean;
  rewardHint?: LocalizedString;
};

export function SceneTopHud({
  beat,
  beats,
  contentTier,
  onToggleTier,
  shortcutHintMode,
  rewardActive,
  rewardHint,
}: Props) {

  const { lang, t } = useI18n();

  const openingText = useMemo(() => {
    const text = resolveLocalized(beat.openingNarration, lang).trim();
    return text || undefined;
  }, [beat.openingNarration, lang]);

  return (
    <View style={styles.bar}>
      <View style={styles.hudRow}>
        <BeatHeader beat={beat} />

        <View style={styles.guidanceGrid}>
          <View style={styles.gridCell}>
            <TaskGuidancePanel
              beat={beat}
              beats={beats}
              rewardActive={rewardActive}
              rewardHint={rewardHint}
              shortcutHintMode={shortcutHintMode}
            />
          </View>
          {openingText ? (
            <View style={styles.gridCell}>
              <SceneOpeningPanel text={openingText} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.tierSlot}>
        <TouchableOpacity style={styles.tierBtn} onPress={onToggleTier} activeOpacity={0.85}>
          <Text style={Typo(styles.tierText, 'mono', lang)}>
            {contentTier === 'mature' ? t('settings.contentTierShortMature') : t('settings.contentTierShortStandard')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    zIndex: 30,
  },
  hudRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guidanceGrid: {
    flex: 1,
    minWidth: 0,
    gap: GUIDANCE_GRID_GAP,
    ...(Platform.OS === 'web'
      ? ({
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${GUIDANCE_COL_MIN}px, ${GUIDANCE_COL_MAX}px))`,
          alignContent: 'center',
          justifyContent: 'center',
          justifyItems: 'stretch',
        } as object)
      : {
          flexDirection: 'column',
          alignItems: 'stretch',
          maxWidth: GUIDANCE_COL_MAX,
        }),
  },
  gridCell: {
    minWidth: 0,
    width: '100%',
  },
  tierSlot: {
    flexShrink: 0,
  },
  tierBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierText: { color: COLORS.agents.paleGold, fontWeight: '800', fontSize: 13 },
});
