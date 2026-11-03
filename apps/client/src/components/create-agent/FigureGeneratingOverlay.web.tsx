import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FIGURE_PREVIEW_GENERATING_VIDEO } from './figurePreviewGeneratingAsset';

type FigureGeneratingOverlayProps = {
  accentColor: string;
  trackColor?: string;
  /** 0–1，由 create-agent 向导全局驱动，避免切步骤重置 */
  progress: number;
};

type WebVideoStyle = React.CSSProperties;

function resolveVideoSrc(asset: unknown): string {
  if (typeof asset === 'string') return asset;
  if (asset && typeof asset === 'object' && 'default' in asset) {
    const def = (asset as { default: unknown }).default;
    if (typeof def === 'string') return def;
  }
  if (asset && typeof asset === 'object' && 'uri' in asset) {
    const uri = (asset as { uri: unknown }).uri;
    if (typeof uri === 'string') return uri;
  }
  return String(asset ?? '');
}

/** Web：立绘生图中循环视频 + 进度条（进度由外部传入） */
export function FigureGeneratingOverlay({
  accentColor,
  trackColor = 'rgba(255,255,255,0.18)',
  progress,
}: FigureGeneratingOverlayProps) {
  const src = resolveVideoSrc(FIGURE_PREVIEW_GENERATING_VIDEO);
  const pct = Math.max(0, Math.min(1, progress));

  const videoStyle: WebVideoStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    backgroundColor: '#0a0b0f',
  };

  return (
    <View style={styles.root} pointerEvents="none">
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={videoStyle}
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
