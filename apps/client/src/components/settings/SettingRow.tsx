import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Typo } from '../../theme/typography';

export const ROW_BORDER_SRC = { width: 1513, height: 242 };
export const ROW_BORDER_DANGER_SRC = { width: 1477, height: 213 };

/** Eyeball ratios — tuned to rendered border, not source art coordinates. */
const NORMAL = {
  iconLeft: 0.048,
  iconTop: 0.128,
  iconWidth: 0.078,
  iconHeight: 0.74,
  textLeft: 0.192,
  padRight: 0.032,
  cap: { left: 148, top: 24, right: 48, bottom: 24 },
};

const DANGER = {
  iconLeft: 0.046,
  iconTop: 0.118,
  iconWidth: 0.078,
  iconHeight: 0.76,
  textLeft: 0.19,
  padRight: 0.031,
  cap: { left: 144, top: 21, right: 46, bottom: 21 },
};

export const ROW_BORDER_CAP = NORMAL.cap;
export const ROW_BORDER_DANGER_CAP = DANGER.cap;

function rowLayout(width: number, height: number, danger: boolean) {
  const spec = danger ? DANGER : NORMAL;
  const iconFrame = {
    left: Math.round(width * spec.iconLeft),
    top: Math.round(height * spec.iconTop),
    width: Math.round(width * spec.iconWidth),
    height: Math.round(height * spec.iconHeight),
  };
  const textLeft = Math.round(width * spec.textLeft);
  const padRight = Math.round(width * spec.padRight);

  return {
    iconFrame,
    textLeft,
    padRight,
    bodyTop: iconFrame.top,
    bodyHeight: iconFrame.height,
  };
}

type SettingRowProps = {
  width: number;
  height: number;
  icon: ImageSourcePropType;
  title: string;
  configId: string;
  danger?: boolean;
  right?: React.ReactNode;
  rightMinWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function SettingRow({
  width,
  height,
  icon,
  title,
  configId,
  danger = false,
  right,
  rightMinWidth,
  style,
}: SettingRowProps) {
  const layout = useMemo(() => rowLayout(width, height, danger), [width, height, danger]);
  const iconSize = Math.min(
    Math.round(layout.iconFrame.width * 0.62),
    Math.round(layout.iconFrame.height * 0.62),
  );
  const titleSize = Math.round(layout.bodyHeight * 0.36);
  const configSize = Math.max(9, Math.round(layout.bodyHeight * 0.21));

  const frame = useMemo(
    () => ({ width, height, overflow: 'hidden' as const }),
    [width, height],
  );

  return (
    <ImageBackground
      source={
        danger
          ? require('../../../assets/images/ui/setting/row_border_danger.png')
          : require('../../../assets/images/ui/setting/row_border.png')
      }
      style={[frame, style]}
      imageStyle={styles.stretchImage}
      resizeMode="stretch"
      capInsets={danger ? ROW_BORDER_DANGER_CAP : ROW_BORDER_CAP}
    >
      <View style={[styles.root, { width, height }]}>
        <View
          style={[
            styles.iconFrame,
            {
              left: layout.iconFrame.left,
              top: layout.iconFrame.top,
              width: layout.iconFrame.width,
              height: layout.iconFrame.height,
            },
          ]}
        >
          <Image source={icon} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />
        </View>

        <View
          style={[
            styles.body,
            {
              left: layout.textLeft,
              top: layout.bodyTop,
              width: width - layout.textLeft - layout.padRight,
              height: layout.bodyHeight,
            },
          ]}
        >
          <View style={styles.labelCol}>
            <Text
              style={[
                styles.title,
                danger && styles.titleDanger,
                { fontSize: titleSize, lineHeight: titleSize * 1.1 },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={[styles.configId, { fontSize: configSize, lineHeight: configSize * 1.15 }]}
              numberOfLines={1}
            >
              {configId}
            </Text>
          </View>
          {right ? (
            <View style={[styles.right, { minWidth: rightMinWidth }]}>{right}</View>
          ) : null}
        </View>
      </View>
    </ImageBackground>
  );
}

const GOLD = '#c9a86c';
const GOLD_MUTED = '#a8894f';
const RED = '#c43e3e';

const styles = StyleSheet.create({
  stretchImage: {
    width: '100%',
    height: '100%',
  },
  root: {
    position: 'relative',
  },
  iconFrame: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelCol: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingRight: 8,
  },
  title: Typo(
    {
      color: GOLD,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'display',
  ),
  titleDanger: {
    color: RED,
  },
  configId: Typo(
    {
      color: GOLD_MUTED,
      opacity: 0.72,
      letterSpacing: 0.8,
      marginTop: 1,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    gap: 10,
  },
});

export function rowHeightForWidth(width: number, danger = false): number {
  const src = danger ? ROW_BORDER_DANGER_SRC : ROW_BORDER_SRC;
  return Math.round((width * src.height) / src.width);
}

export function rowInnerHeightForWidth(width: number, danger = false): number {
  const height = rowHeightForWidth(width, danger);
  const { bodyHeight } = rowLayout(width, height, danger);
  return bodyHeight;
}
