import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';
import { resolveStaticUrl } from '../../constants/config';
import {
  nearestWorldviewAspect,
  worldviewAspectRatio,
  type WorldviewImageAspect,
} from '../../utils/worldviewImageAspect';

interface WorldviewAspectImageProps {
  uri: string;
  defaultAspect?: WorldviewImageAspect;
  contentFit?: ImageContentFit;
  style?: StyleProp<ViewStyle>;
}

export function WorldviewAspectImage({
  uri,
  defaultAspect = '16:9',
  contentFit = 'cover',
  style,
}: WorldviewAspectImageProps) {
  const [aspect, setAspect] = useState<WorldviewImageAspect>(defaultAspect);

  return (
    <View style={[styles.frame, { aspectRatio: worldviewAspectRatio(aspect) }, style]}>
      <Image
        source={{ uri: resolveStaticUrl(uri) }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        onLoad={(event) => {
          const { width, height } = event.source;
          if (width > 0 && height > 0) {
            setAspect(nearestWorldviewAspect(width, height));
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
  },
});
