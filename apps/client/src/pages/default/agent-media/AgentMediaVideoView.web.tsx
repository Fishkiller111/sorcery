import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type AgentMediaVideoViewProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'contain' | 'cover';
  /** 对齐 expo-image contentPosition；cover 裁切锚点 */
  contentPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  nativeControls?: boolean;
  interactive?: boolean;
  /** 暂停时回到开头（卡片 hover 预览离开后复用） */
  resetOnPause?: boolean;
  /** 浏览器 preload；列表预览建议 auto */
  preload?: 'none' | 'metadata' | 'auto';
};

type WebVideoStyle = React.CSSProperties;

export function AgentMediaVideoView({
  uri,
  style,
  contentFit = 'contain',
  contentPosition = 'center',
  muted = false,
  loop = false,
  autoPlay = true,
  nativeControls = true,
  interactive = true,
  resetOnPause = false,
  preload = 'metadata',
}: AgentMediaVideoViewProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
    el.loop = loop;
    if (autoPlay) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
      if (resetOnPause) {
        try {
          el.currentTime = 0;
        } catch {
          // seek 可能在尚未就绪时失败，忽略即可
        }
      }
    }
  }, [uri, muted, loop, autoPlay, resetOnPause]);

  const objectPosition =
    contentPosition === 'top'
      ? 'center top'
      : contentPosition === 'bottom'
        ? 'center bottom'
        : contentPosition === 'left'
          ? 'left center'
          : contentPosition === 'right'
            ? 'right center'
            : 'center center';

  const videoStyle: WebVideoStyle = {
    width: '100%',
    height: '100%',
    objectFit: contentFit,
    objectPosition,
    display: 'block',
    backgroundColor: '#0a0b0f',
  };

  return (
    <View style={[styles.root, style]} pointerEvents={interactive ? 'auto' : 'none'}>
      <video
        ref={ref}
        key={uri}
        src={uri}
        muted={muted}
        loop={loop}
        autoPlay={autoPlay}
        playsInline
        controls={nativeControls}
        preload={preload}
        style={videoStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#0a0b0f',
  },
});
