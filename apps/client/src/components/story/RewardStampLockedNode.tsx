import type { Lang } from '../../i18n/types';
/**
 * 奖励图章树 · 未解锁分支占位节点
 *
 * 对应 dagre kind=locked-cell / locked-final，展示 ??? 与未解锁状态。
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';

type Props = {
  style?: StyleProp<ViewStyle>;
  variant: 'cell' | 'final';
};

export function RewardStampLockedNode({
 style, variant }: Props) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const isFinal = variant === 'final';

  return (
    <View style={[styles.card, isFinal && styles.cardFinal, style]}>
      <View style={styles.body}>
        <Text style={Typo(styles.title, 'mono', lang)}>{t('gallery.lockedTitle')}</Text>
        <Text style={Typo(styles.status, 'sans', lang)}>{t('gallery.lockedStatus')}</Text>
        {isFinal ? (
          <Text style={styles.finalHint}>{t('gallery.finalReward')}</Text>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(232,213,181,0.12)',
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    overflow: 'hidden',
    opacity: 0.55,
  },
  cardFinal: {
    borderStyle: 'dashed',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 2,
  },
  title: { color: COLORS.agents.paleGoldMuted, fontSize: 11, fontWeight: '700' },
  status: { color: COLORS.agents.paleGoldMuted, fontSize: 9, opacity: 0.75 },
  finalHint: Typo(
    { color: COLORS.agents.paleGoldMuted, fontSize: 7, marginTop: 4, opacity: 0.5 },
    'mono', lang
  ),
});
};
