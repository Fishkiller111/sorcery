/**
 * 奖励图章树 · 分支中间节点（cell）
 *
 * 对应 dagre kind=cell，链上各阶段奖励/坏结局步骤。
 * 解锁后可点击，由 TreeMap 打开 GalleryCellViewer。
 */
import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';
import type { GalleryBranchView, GalleryCellView } from '../../utils/storyGallery';
import { StampNodeShell } from './StampNodeShell';

type Props = {
  style?: StyleProp<ViewStyle>;
  cell: GalleryCellView;
  branchUnlocked: boolean;
  branchType: GalleryBranchView['type'];
  onPress: () => void;
};

export function RewardStampBranchNode({
  style,
  cell,
  branchUnlocked,
  branchType,
  onPress,
}: Props) {
  const { lang } = useI18n();
  const locked = !branchUnlocked || !cell.unlocked;

  return (
    <StampNodeShell
      style={style}
      branchUnlocked={branchUnlocked}
      cellUnlocked={cell.unlocked}
      branchType={branchType}
      onPress={onPress}
      label={cell.label}
    >
      <View style={styles.media}>
        {!locked && cell.hasImage && cell.imageSource ? (
          <Image source={cell.imageSource} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={Typo(styles.placeholderIcon, 'mono', lang)}>▣</Text>
          </View>
        )}
      </View>
    </StampNodeShell>
  );
}

const styles = StyleSheet.create({
  media: {
    height: 48,
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
  placeholderIcon: { color: 'rgba(255,255,255,0.15)', fontSize: 20 },
});
