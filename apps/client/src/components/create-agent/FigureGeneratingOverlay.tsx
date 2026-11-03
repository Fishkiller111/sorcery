import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { FIGURE_PREVIEW_GENERATING_VIDEO } from './figurePreviewGeneratingAsset';

type FigureGeneratingOverlayProps = {
  accentColor: string;
  trackColor?: string;
  /** 0–1，由 create-agent 向导全局驱动，避免切步骤重置 */
  progress: number;
};

/** 立绘生图中：循环视频 + 进度条（进度由外部传入） */
export function FigureGeneratingOverlay({
  accentColor,
  trackColor = 'rgba(255,255,255,0.18)',
  progress,
}: FigureGeneratingOverlayProps) {
  const player = useVideoPlayer(FIGURE_PREVIEW_GENERATING_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const pct = Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.root} pointerEvents="none">
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.progressWrap}>
        <View style={[styles.track, { backgroundColor: trackColor }]}>
          <View
            style={[
              styles.fill,
              { width: `${Math.round(pct * 100)}%`, backgroundColor: accentColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0a0b0f',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  progressWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
