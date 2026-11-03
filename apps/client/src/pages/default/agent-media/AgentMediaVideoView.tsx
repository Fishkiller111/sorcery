import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

export type AgentMediaVideoViewProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'contain' | 'cover';
  /** Web-only；原生忽略 */
  contentPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  nativeControls?: boolean;
  /** When false, ignore pointer events (e.g. card hover preview). */
  interactive?: boolean;
  /** 暂停时回到开头（卡片 hover 预览离开后复用） */
  resetOnPause?: boolean;
  /** Web-only；原生忽略 */
  preload?: 'none' | 'metadata' | 'auto';
};

export function AgentMediaVideoView({
  uri,
  style,
  contentFit = 'contain',
  muted = false,
  loop = false,
  autoPlay = true,
  nativeControls = true,
  interactive = true,
  resetOnPause = false,
}: AgentMediaVideoViewProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = muted;
    if (autoPlay) p.play();
  });

  useEffect(() => {
    player.loop = loop;
    player.muted = muted;
    if (autoPlay) {
      player.play();
    } else {
      player.pause();
      if (resetOnPause) {
        try {
          player.currentTime = 0;
        } catch {
          // ignore seek errors
        }
      }
    }
  }, [player, loop, muted, autoPlay, uri, resetOnPause]);

  return (
    <View style={[styles.root, style]} pointerEvents={interactive ? 'auto' : 'none'}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit={contentFit}
        nativeControls={nativeControls}
        fullscreenOptions={{ enable: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#0a0b0f',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
