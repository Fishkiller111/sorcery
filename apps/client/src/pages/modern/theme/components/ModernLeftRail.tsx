import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { HOME_IMAGES } from '../images';
import { TOKENS } from '../tokens';
import { useI18n } from '../../../../i18n/I18nContext';

type ModernLeftRailProps = {
  onGearPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** home.svg 左轨几何（11072×6188） */
const DESIGN = {
  canvasH: 6188,
  gearX: -403,
  gearY: 2722,
  gearW: 880,
  gearH: 869,
  lightX: 37,
  lightY: -207,
  lightH: 7240,
  darkX: 74,
  darkY: -41,
  darkH: 6270,
} as const;

const GEAR_CLIP_RATIO = -DESIGN.gearX / DESIGN.gearW;

/**
 * 左侧双竖线 + 齿轮（home.svg）。
 * 齿轮左半在屏外裁切；层级高于内容区，浅色底上用阴影保证可见。
 */
export function ModernLeftRail({ onGearPress, style }: ModernLeftRailProps) {
  const { t } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  const { gearSize, lineWidth } = TOKENS.modePage;

  const gearLeft = -gearSize * GEAR_CLIP_RATIO;
  const gearTop = ((DESIGN.gearY + DESIGN.gearH / 2) / DESIGN.canvasH) * windowHeight - gearSize / 2;

  const lightLeft = gearLeft + (gearSize * (DESIGN.lightX - DESIGN.gearX)) / DESIGN.gearW;
  const darkLeft = gearLeft + (gearSize * (DESIGN.darkX - DESIGN.gearX)) / DESIGN.gearW;

  const lightTop = (DESIGN.lightY / DESIGN.canvasH) * windowHeight;
  const lightHeight = (DESIGN.lightH / DESIGN.canvasH) * windowHeight;
  const darkTop = (DESIGN.darkY / DESIGN.canvasH) * windowHeight;
  const darkHeight = (DESIGN.darkH / DESIGN.canvasH) * windowHeight;

  return (
    <View style={[styles.rail, style]} pointerEvents="box-none">
      <View style={styles.lines} pointerEvents="none">
        <Image
          source={HOME_IMAGES.railLineLight}
          style={{
            position: 'absolute',
            left: lightLeft,
            top: lightTop,
            width: lineWidth,
            height: lightHeight,
          }}
          resizeMode="stretch"
        />
        <Image
          source={HOME_IMAGES.railLineDark}
          style={{
            position: 'absolute',
            left: darkLeft,
            top: darkTop,
            width: lineWidth,
            height: darkHeight,
          }}
          resizeMode="stretch"
        />
      </View>

      <Pressable
        onPress={onGearPress}
        style={({ pressed }) => [
          styles.gearBtn,
          {
            left: gearLeft,
            top: gearTop,
            width: gearSize,
            height: gearSize,
          },
          pressed && styles.gearBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('menu.menu')}
      >
        <View style={styles.gearShadow}>
          <Image source={HOME_IMAGES.gearIcon} style={styles.gearIcon} resizeMode="contain" />
        </View>
      </Pressable>
    </View>
  );
}

const { gearSize } = TOKENS.modePage;

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    zIndex: 60,
    elevation: 60,
    overflow: 'visible',
  },
  lines: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    overflow: 'visible',
  },
  gearBtn: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearBtnPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  gearShadow: {
    width: gearSize,
    height: gearSize,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.55,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
      default: {
        // Web：浅色雕版底上提亮齿轮轮廓
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 1px rgba(0,0,0,0.85))',
      } as object,
    }),
  },
  gearIcon: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      default: {
        mixBlendMode: 'multiply',
      } as object,
      android: {},
      ios: {},
    }),
  },
});
