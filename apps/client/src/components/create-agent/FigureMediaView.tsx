import React from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { AgentMediaVideoView } from '../../pages/default/agent-media/AgentMediaVideoView';
import { isVideoFigureUrl } from '../../utils/figureMedia';

type FigureMediaViewProps = {
  uri: string;
  style?: StyleProp<ImageStyle | ViewStyle>;
  /** Use expo-image (preferred for remote URLs / GIF). */
  useExpoImage?: boolean;
  contentFit?: 'cover' | 'contain';
  contentPosition?: 'top' | 'center';
  blurRadius?: number;
  transition?: number;
};

/**
 * Renders figure art: MP4 via expo-video, otherwise Image / expo-image (GIF animates).
 */
export function FigureMediaView({
  uri,
  style,
  useExpoImage = false,
  contentFit = 'cover',
  contentPosition = 'top',
  blurRadius = 0,
  transition,
}: FigureMediaViewProps) {
  if (isVideoFigureUrl(uri)) {
    return (
      <AgentMediaVideoView
        uri={uri}
        style={[styles.fill, style as StyleProp<ViewStyle>]}
        contentFit={contentFit}
        muted
        loop
        autoPlay
        nativeControls={false}
        interactive={false}
      />
    );
  }

  if (useExpoImage) {
    return (
      <ExpoImage
        source={{ uri }}
        style={[styles.fill, style as StyleProp<ImageStyle>]}
        contentFit={contentFit}
        contentPosition={contentPosition}
        blurRadius={blurRadius || undefined}
        transition={transition}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.fill, style as StyleProp<ImageStyle>, blurRadius ? { opacity: 0.85 } : null]}
      resizeMode={contentFit}
      blurRadius={blurRadius || undefined}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});
