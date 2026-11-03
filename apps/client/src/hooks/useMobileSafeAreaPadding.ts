import { useMemo } from 'react';
import { Platform, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsDesktop } from './useIsDesktop';
import {
  MOBILE_BOTTOM_NAV_CLEARANCE_COMPACT,
  MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT,
} from '../constants/layout';

/** 移动端安全区 padding 值（单位：dp） */
export type MobileSafeAreaPadding = {
  paddingTop: number;
  paddingBottom: number;
};

/** 是否为移动端原生环境（非 Web、非桌面宽屏） */
export function useIsMobileNative(): boolean {
  const isDesktop = useIsDesktop();
  return Platform.OS !== 'web' && !isDesktop;
}

/**
 * 读取系统安全区，转为 padding 数值。
 * 桌面 / Web 返回 0；需配合 SafeAreaProvider 使用。
 */
export function useMobileSafeAreaPadding(): MobileSafeAreaPadding {
  const insets = useSafeAreaInsets();
  const isMobileNative = useIsMobileNative();

  return useMemo(
    () => ({
      paddingTop: isMobileNative ? insets.top : 0,
      paddingBottom: isMobileNative ? insets.bottom : 0,
    }),
    [isMobileNative, insets.top, insets.bottom],
  );
}

type MobileSafeAreaPaddingStyleOptions = {
  /** 是否应用顶部安全区，默认 true */
  top?: boolean;
  /** 是否应用底部安全区，默认 true */
  bottom?: boolean;
};

/**
 * 将安全区转为可直接挂到 View 的 style 对象。
 * 全屏背景页请用 {@link useMobilePageContentPaddingStyle} 只垫内容层，背景保持 absoluteFill。
 * 值为 0 时不写入 style，避免多余属性。
 */
export function useMobileSafeAreaPaddingStyle(
  options: MobileSafeAreaPaddingStyleOptions = {},
): ViewStyle {
  const { top = true, bottom = true } = options;
  const { paddingTop, paddingBottom } = useMobileSafeAreaPadding();

  return useMemo(() => {
    const style: ViewStyle = {};
    if (top && paddingTop > 0) style.paddingTop = paddingTop;
    if (bottom && paddingBottom > 0) style.paddingBottom = paddingBottom;
    return style;
  }, [top, bottom, paddingTop, paddingBottom]);
}

/**
 * @deprecated 壳层底栏已改为文档流占位，不再需要内容区手动 clearance。
 * 保留导出以免外部脚本引用；新代码请勿使用。
 */
export function useMobileShellContentPadding(
  navClearance = MOBILE_BOTTOM_NAV_CLEARANCE_COMPACT,
): MobileSafeAreaPadding {
  const { paddingBottom } = useMobileSafeAreaPadding();
  const isMobileNative = useIsMobileNative();

  return useMemo(
    () => ({
      paddingTop: 0,
      paddingBottom: isMobileNative ? navClearance + paddingBottom : 0,
    }),
    [isMobileNative, navClearance, paddingBottom],
  );
}

/**
 * 页面内容层顶部安全区 padding（背景层应放在此容器之外，以便全屏铺满）。
 */
export function useMobilePageContentPaddingStyle(): ViewStyle {
  return useMobileSafeAreaPaddingStyle({ bottom: false });
}

/**
 * 底部 Tab 栏的 paddingBottom = 栏内基础间距 + 手势条/ Home Indicator 安全区。
 * @param basePadding 栏内固定底部间距（如 22、24）
 */
export function useMobileBottomNavPadding(basePadding: number): number {
  const { paddingBottom } = useMobileSafeAreaPadding();
  const isMobileNative = useIsMobileNative();
  return isMobileNative ? basePadding + paddingBottom : basePadding;
}

export {
  MOBILE_BOTTOM_NAV_CLEARANCE_COMPACT,
  MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT,
};
