/**
 * 奖励图章树 · 根节点（主线起点）
 *
 * 对应 dagre kind=root，展示 scene 信息，不可点击。
 * 视觉延续旧 GallerySceneBranchMap.MainLineStartCard。
 */
import React, { useMemo } from 'react';
import type { Lang } from '../../i18n/types';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';

type Props = {
  style?: StyleProp<ViewStyle>;
  sceneCode: string;
  sceneTitle: string;
  sceneFlavor?: string;
};

export function RewardStampRootNode({
 style, sceneCode, sceneTitle, sceneFlavor }: Props) {

  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.thumb}>
        <Text style={Typo(styles.thumbIcon, 'mono', lang)}>▣</Text>
      </View>
      <View style={styles.ribbon}>
        <Text style={Typo(styles.ribbonText, 'mono', lang)}>{t('gallery.mainLine')}</Text>
      </View>
      <Text style={Typo(styles.code, 'mono', lang)}>{sceneCode.toUpperCase()}</Text>
      <Text style={styles.title} numberOfLines={3}>
        {sceneTitle}
      </Text>
      {sceneFlavor ? (
        <Text style={styles.flavor} numberOfLines={3}>
          {sceneFlavor}
        </Text>
      ) : null}
      <Text style={Typo(styles.hint, 'mono', lang)}>{t('gallery.mainLineStart')}</Text>
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.accent.red,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 22, 28, 0.95)',
    overflow: 'hidden',
    paddingBottom: 8,
  },
  thumb: {
    height: 72,
    backgroundColor: '#14141c',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  thumbIcon: { color: COLORS.text.muted, fontSize: 28 },
  ribbon: {
    position: 'absolute',
    top: 8,
    right: 0,
    backgroundColor: COLORS.accent.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  ribbonText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  code: { color: COLORS.text.muted, fontSize: 9, marginTop: 8, marginHorizontal: 8 },
  title: Typo(
    { color: COLORS.text.primary, fontSize: 11, fontWeight: '700', marginHorizontal: 8, marginTop: 2 },
    'display', lang
  ),
  flavor: Typo(
    { color: COLORS.text.secondary, fontSize: 9, lineHeight: 13, marginHorizontal: 8, marginTop: 4 },
    'sans', lang
  ),
  hint: { color: COLORS.accent.gold, fontSize: 9, marginHorizontal: 8, marginTop: 6 },
});
};
