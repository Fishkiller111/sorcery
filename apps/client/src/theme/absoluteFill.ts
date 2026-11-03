import { StyleSheet, type ImageStyle, type ViewStyle } from 'react-native';

/**
 * RN 0.86+ 只导出 `StyleSheet.absoluteFill`，不再有 `absoluteFillObject`。
 * 误用 absoluteFillObject 会展开成空对象 → 列表封面 Image 0×0 空白。
 */
export const ABSOLUTE_FILL: ViewStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/** 封面图铺满父级：绝对定位 + 百分比双保险（iOS 列表更稳） */
export const COVER_IMAGE_FILL: ImageStyle = {
  position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
  width: '100%',
  height: '100%',
};

/** 兼容旧写法；优先用 ABSOLUTE_FILL / COVER_IMAGE_FILL */
export const absoluteFillCompat: ViewStyle =
  (StyleSheet.absoluteFill as ViewStyle) || ABSOLUTE_FILL;
