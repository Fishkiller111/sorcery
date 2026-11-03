import React, { ReactNode } from 'react';
import {
  View,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { DividerStar } from './DividerStar';

const DEFAULT_RIBBON = require('../../../assets/images/ui/profile/header_ribbon.png');
const HEADER_DIVIDER = require('../../../assets/images/ui/profile/header_divider.png');

const RED_ACCENT = '#9e1b1b';

type RibbonSectionHeaderProps = {
  children: ReactNode;
  ribbonSource?: ImageSourcePropType;
  ribbonWidth?: number;
  ribbonHeight?: number;
  starSize?: number;
  starColor?: string;
  showBottomDivider?: boolean;
  bottomDividerWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function RibbonSectionHeader({
  children,
  ribbonSource = DEFAULT_RIBBON,
  ribbonWidth = 68,
  ribbonHeight = 106,
  starSize = 16,
  starColor = RED_ACCENT,
  showBottomDivider = false,
  bottomDividerWidth,
  style,
}: RibbonSectionHeaderProps) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.topBar}>
        <Image
          source={ribbonSource}
          style={{ width: ribbonWidth, height: ribbonHeight }}
          resizeMode="contain"
        />
        <View style={styles.contentBlock}>
          <View style={styles.line} />
          <View style={styles.titleRow}>
            <View style={styles.titleSlot}>{children}</View>
            <DividerStar color={starColor} size={starSize} style={styles.star} />
          </View>
          <View style={styles.line} />
        </View>
      </View>
      {showBottomDivider && bottomDividerWidth ? (
        <Image
          source={HEADER_DIVIDER}
          style={[styles.bottomDivider, { width: bottomDividerWidth }]}
          resizeMode="stretch"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 15,
  },
  contentBlock: {
    flex: 1,
    gap: 8,
  },
  line: {
    width: '100%',
    height: 1,
    backgroundColor: RED_ACCENT,
    opacity: 0.35,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingRight: 2,
  },
  titleSlot: {
    flex: 1,
    flexShrink: 1,
    paddingRight: 12,
  },
  star: {
    flexShrink: 0,
  },
  bottomDivider: {
    height: 14,
    opacity: 0.95,
    marginTop: 4,
  },
});
