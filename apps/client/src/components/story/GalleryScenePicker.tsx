import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import type { GallerySceneDef } from '../../constants/storyGalleryCatalog';
import { resolveLocalized } from '../../i18n/utils';
import { useI18n } from '../../i18n/I18nContext';

type Props = {
  scenes: GallerySceneDef[];
  sceneTitles: Record<string, string>;
  selectedCode: string;
  onSelect: (sceneCode: string) => void;
  branchStats: Record<string, { collected: number; total: number }>;
  unlockedBranches: number;
  totalBranches: number;
};

function formatSceneCode(code: string): string {
  return code.replace(/^s/i, 'S').replace('_', '-').toUpperCase();
}

export function GalleryScenePicker({
  scenes,
  sceneTitles,
  selectedCode,
  onSelect,
  branchStats,
  unlockedBranches,
  totalBranches,
}: Props) {
  const { lang, t } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {scenes.map((scene) => {
          const active = scene.sceneCode === selectedCode;
          const title = sceneTitles[scene.sceneCode] || resolveLocalized(scene.title, lang);
          const stats = branchStats[scene.sceneCode];
          const progress =
            stats && stats.total > 0 ? `${stats.collected}/${stats.total}` : t('common.notAvailable');

          return (
            <TouchableOpacity
              key={scene.sceneCode}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => onSelect(scene.sceneCode)}
              activeOpacity={0.85}
            >
              <View style={[styles.thumb, active && styles.thumbActive]}>
                <Text style={[Typo(styles.thumbIcon, 'mono', lang), active && Typo(styles.thumbIconActive, 'mono', lang)]}>▣</Text>
              </View>
              <View style={styles.meta}>
                <Text style={[Typo(styles.code, 'mono', lang), active && Typo(styles.codeActive, 'mono', lang)]}>
                  {formatSceneCode(scene.sceneCode)}
                </Text>
                <Text
                  style={[styles.title, active && styles.titleActive]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
                <Text style={[Typo(styles.progress, 'mono', lang), active && Typo(styles.progressActive, 'mono', lang)]}>{progress}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={Typo(styles.footerText, 'mono', lang)}>
          {t('gallery.branchExperienced')
            .replace('{branches}', String(unlockedBranches))
            .replace('{branchTotal}', String(totalBranches))}
        </Text>
      </View>
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.agents.border,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 196,
    maxWidth: 196,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginRight: 10,
    gap: 10,
    opacity: 0.72,
  },
  cardActive: {
    opacity: 1,
    borderColor: COLORS.agents.brightGold,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: '#12141a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.agents.border,
  },
  thumbActive: {
    borderColor: COLORS.agents.brightGold,
    backgroundColor: '#1a1410',
  },
  thumbIcon: { color: 'rgba(232,213,181,0.15)', fontSize: 18 },
  thumbIconActive: { color: 'rgba(244,208,63,0.55)' },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  code: { color: COLORS.agents.paleGoldMuted, fontSize: 10, letterSpacing: 0.8 },
  codeActive: { color: COLORS.agents.brightGold },
  title: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    'sans', lang
  ),
  titleActive: { color: COLORS.agents.paleGold },
  progress: { color: COLORS.agents.paleGoldMuted, fontSize: 11, marginTop: 2 },
  progressActive: { color: COLORS.agents.brightGold },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,213,181,0.12)',
  },
  footerText: { color: COLORS.agents.paleGoldMuted, fontSize: 10, letterSpacing: 0.4 },
});
};
