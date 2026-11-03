import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { useInViewport, type UseInViewportOptions } from '../../hooks/useInViewport';

export type LazyImageProps = Omit<ImageProps, 'source'> & {
  /** 远程图；未进入视口时不赋 source，避免发请求 */
  uri?: string | null;
  /** 本地/静态 source；与 uri 二选一，本地图不懒加载 */
  source?: ImageProps['source'];
  viewport?: UseInViewportOptions;
  /** 强制立即加载（首屏关键位） */
  eager?: boolean;
  /**
   * 外部已算好的可见性（如卡片级 useInViewport）。
   * 传入后跳过内部观察，只按该值决定是否赋 source。
   */
  visible?: boolean;
};

/**
 * 首次进入视口后赋 source，之后保持不再清空（不回收已渲染媒体）。
 */
export function LazyImage({
  uri,
  source,
  viewport,
  eager = false,
  visible: visibleProp,
  style,
  ...rest
}: LazyImageProps) {
  const hostRef = useRef<View>(null);
  const observed = useInViewport(hostRef, viewport);
  const inView = visibleProp ?? observed;
  const [kept, setKept] = useState(eager);

  useEffect(() => {
    if (eager || inView) setKept(true);
  }, [eager, inView]);

  // uri 换了：按当前是否在视口决定是否立刻加载
  useEffect(() => {
    setKept(Boolean(eager || inView));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅 uri 变化时重置
  }, [uri]);

  const shouldLoad = kept || eager || inView;

  const resolvedSource =
    source ?? (shouldLoad && uri ? { uri } : null);

  if (visibleProp !== undefined) {
    return <Image source={resolvedSource} style={style} {...rest} />;
  }

  return (
    <View
      ref={hostRef}
      collapsable={false}
      style={style as StyleProp<ViewStyle>}
    >
      <Image source={resolvedSource} style={styles.fill} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
