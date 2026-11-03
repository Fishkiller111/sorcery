/**
 * 奖励图章树 · 叶子节点（最终奖励）
 *
 * 对应 dagre kind=final，每条分支链的终点。
 * 显示 seal 图章 +「最终奖励」徽章 + 分支标题。
 */
import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';
import { branchAccent } from './rewardStampTheme';
import type { GalleryBranchView, GalleryCellView } from '../../utils/storyGallery';
import { StampNodeShell } from './StampNodeShell';

type Props = {
  style?: StyleProp<ViewStyle>;
  cell: GalleryCellView | null;
  branchTitle: string;
  branchUnlocked: boolean;
  branchType: GalleryBranchView['type'];
  onPress: () => void;
};

export function RewardStampLeafNode({
  style,
  cell,
  branchTitle,
  branchUnlocked,
  branchType,
  onPress,
}: Props) {

  const { t, lang } = useI18n();
  const locked = !branchUnlocked || !cell?.unlocked;
  const accent = branchAccent(branchType);

  return (
    <StampNodeShell
      style={style}
      branchUnlocked={branchUnlocked}
      cellUnlocked={cell?.unlocked ?? false}
      branchType={branchType}
      onPress={cell ? onPress : undefined}
      label={branchTitle}
      showSeal
      sealSize={44}
    >
      <Text style={[Typo(styles.badge, 'mono', lang), { color: accent }]}>{t('gallery.finalReward')}</Text>
      <View style={styles.media}>
        {!locked && cell?.hasImage && cell.imageSource ? (
          <Image source={cell.imageSource} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={Typo(styles.placeholderIcon, 'mono', lang)}>★</Text>
          </View>
        )}
      </View>
    </StampNodeShell>
  );
}

const styles = StyleSheet.create({
  badge: { fontSize: 8, fontWeight: '700', paddingHorizontal: 6, paddingTop: 2 },
  media: {
    height: 46,
    backgroundColor: '#0a0a0a',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { color: 'rgba(255,255,255,0.15)', fontSize: 22 },
});
