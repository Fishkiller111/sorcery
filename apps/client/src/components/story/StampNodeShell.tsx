/**
 * 图章节点通用外壳
 *
 * 封装：边框色（按分支类型）、锁定遮罩 ◆、可选 seal PNG、底部 label。
 * style 必须挂在外层容器上，以配合 dagre 算出的 absolute 定位。
 */
import React, { useMemo } from 'react';
import type { Lang } from '../../i18n/types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';
import { branchAccent, sealSource } from './rewardStampTheme';
import type { GalleryBranchView } from '../../utils/storyGallery';

type Props = {
  /** 含 position/left/top/width/height，来自 layout 节点 */
  style?: StyleProp<ViewStyle>;
  branchUnlocked: boolean;
  cellUnlocked: boolean;
  branchType: GalleryBranchView['type'];
  onPress?: () => void;
  children?: React.ReactNode;
  label?: string;
  labelLines?: number;
  /** 仅 LeafNode 开启，中间 cell 高度不够时不显示 seal */
  showSeal?: boolean;
  sealSize?: number;
};

export function StampNodeShell({
  style,
  branchUnlocked,
  cellUnlocked,
  branchType,
  onPress,
  children,
  label,
  labelLines = 2,
  showSeal = false,
  sealSize = 40,
}: Props) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);

  const locked = !branchUnlocked || !cellUnlocked;
  const accent = branchAccent(branchType);
  const interactive = !locked && !!onPress;

  const card = (
    <View
      style={[
        styles.wrap,
        locked && styles.wrapLocked,
        !locked && { borderColor: accent },
      ]}
    >
      {showSeal ? (
        <View style={styles.sealRow}>
          <Image
            source={sealSource(!locked)}
            style={[styles.seal, { width: sealSize, height: sealSize, opacity: locked ? 0.45 : 1 }]}
            contentFit="contain"
          />
        </View>
      ) : null}
      {children}
      {label !== undefined ? (
        <Text style={styles.label} numberOfLines={labelLines}>
          {locked ? '···' : label}
        </Text>
      ) : null}
      {locked ? (
        <View style={styles.lockOverlay}>
          <Text style={Typo(styles.lockIcon, 'mono', lang)}>◆</Text>
        </View>
      ) : null}
    </View>
  );

  if (!interactive) {
    return <View style={style}>{card}</View>;
  }

  return (
    <TouchableOpacity style={style} onPress={onPress} activeOpacity={0.85}>
      {card}
    </TouchableOpacity>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  wrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#14141c',
    overflow: 'hidden',
  },
  wrapLocked: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sealRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  seal: {},
  label: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 8,
      lineHeight: 11,
      padding: 4,
      textAlign: 'center',
    },
    'sans', lang
  ),
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: { color: 'rgba(255,255,255,0.25)', fontSize: 16 },
});
};
