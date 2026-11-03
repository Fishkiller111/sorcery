/**
 * Web 端统一滚动条主题（源自 GeneralConfirmModal / 公告弹窗正文区）
 * 在 app/+html.tsx 全局注入；组件内可用 themedScrollViewProps 强化样式。
 *
 * 约定：
 * - 全站默认外观 = default（深色 UI 浅色细条）
 * - soviet 页面显式传 themedScrollViewProps('soviet')
 * - 需要完全隐藏时用 hiddenScrollViewProps()
 */
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

export const SCROLLBAR_THUMB = 'rgba(255, 255, 255, 0.22)';
export const SCROLLBAR_THUMB_HOVER = 'rgba(255, 255, 255, 0.38)';

/** default 主题：偏中性灰，贴合深色侧栏 */
export const SCROLLBAR_THUMB_DEFAULT = 'rgba(255, 255, 255, 0.22)';
export const SCROLLBAR_THUMB_DEFAULT_HOVER = 'rgba(255, 255, 255, 0.38)';

/** soviet 主题：淡金描边系 */
export const SCROLLBAR_THUMB_SOVIET = 'rgba(232, 213, 181, 0.32)';
export const SCROLLBAR_THUMB_SOVIET_HOVER = 'rgba(232, 213, 181, 0.52)';

export type ScrollbarUiVariant = 'soviet' | 'default';

function scrollbarColors(variant: ScrollbarUiVariant = 'default') {
  if (variant === 'soviet') {
    return { thumb: SCROLLBAR_THUMB_SOVIET, hover: SCROLLBAR_THUMB_SOVIET_HOVER };
  }
  return { thumb: SCROLLBAR_THUMB_DEFAULT, hover: SCROLLBAR_THUMB_DEFAULT_HOVER };
}

/** 注入 +html.tsx，作用于全站可滚动区域 + 按 data-themed-scroll 区分主题 */
export const THEMED_SCROLLBAR_GLOBAL_CSS = `
* {
  scrollbar-width: thin;
  scrollbar-color: ${SCROLLBAR_THUMB_DEFAULT} transparent;
}
*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
*::-webkit-scrollbar-track {
  background: transparent;
}
*::-webkit-scrollbar-thumb {
  background: ${SCROLLBAR_THUMB_DEFAULT};
  border-radius: 999px;
}
*::-webkit-scrollbar-thumb:hover {
  background: ${SCROLLBAR_THUMB_DEFAULT_HOVER};
}
[data-themed-scroll="default"] {
  scrollbar-width: thin;
  scrollbar-color: ${SCROLLBAR_THUMB_DEFAULT} transparent;
}
[data-themed-scroll="default"]::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
[data-themed-scroll="default"]::-webkit-scrollbar-track {
  background: transparent;
}
[data-themed-scroll="default"]::-webkit-scrollbar-thumb {
  background: ${SCROLLBAR_THUMB_DEFAULT};
  border-radius: 999px;
}
[data-themed-scroll="default"]::-webkit-scrollbar-thumb:hover {
  background: ${SCROLLBAR_THUMB_DEFAULT_HOVER};
}
[data-themed-scroll="soviet"] {
  scrollbar-width: thin;
  scrollbar-color: ${SCROLLBAR_THUMB_SOVIET} transparent;
}
[data-themed-scroll="soviet"]::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
[data-themed-scroll="soviet"]::-webkit-scrollbar-track {
  background: transparent;
}
[data-themed-scroll="soviet"]::-webkit-scrollbar-thumb {
  background: ${SCROLLBAR_THUMB_SOVIET};
  border-radius: 999px;
}
[data-themed-scroll="soviet"]::-webkit-scrollbar-thumb:hover {
  background: ${SCROLLBAR_THUMB_SOVIET_HOVER};
}
`;

export type ThemedScrollViewProps = {
  dataSet?: { themedScroll: ScrollbarUiVariant };
  style?: StyleProp<ViewStyle>;
};

/**
 * ScrollView / FlatList 在 Web 上的补充 props（按主题着色）。
 * 用法：`<ScrollView {...themedScrollViewProps('default')} style={[styles.x, themedScrollViewProps('default').style]} />`
 * 或：`const p = themedScrollViewProps('default'); <ScrollView {...p} style={[styles.x, p.style]} />`
 */
export function themedScrollViewProps(
  variant: ScrollbarUiVariant = 'default',
): ThemedScrollViewProps {
  if (Platform.OS !== 'web') return {};
  const { thumb } = scrollbarColors(variant);
  return {
    dataSet: { themedScroll: variant },
    style: {
      scrollbarWidth: 'thin',
      scrollbarColor: `${thumb} transparent`,
    } as ViewStyle,
  };
}

/** 完全隐藏滚动条（仍可滚动）；配合 +html.tsx 中 HIDDEN_SCROLLBAR_GLOBAL_CSS */
export const HIDDEN_SCROLLBAR_GLOBAL_CSS = `
[data-hide-scroll="true"] {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
[data-hide-scroll="true"]::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
`;

export function hiddenScrollViewProps(): Record<string, unknown> {
  if (Platform.OS !== 'web') return {};
  return {
    dataSet: { hideScroll: 'true' },
    style: {
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
  };
}
