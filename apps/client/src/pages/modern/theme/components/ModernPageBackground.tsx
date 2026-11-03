import React from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { HOME_IMAGES } from '../images';

/** home.svg 画布 11072×6188 */
const DESIGN_W = 11072;
const DESIGN_H = 6188;
/** 左上鱼群 pattern6 */
const FISH_TOP_RECT = { x: -557, y: 395, w: 7069, h: 2511 } as const;
/** 右下鱼群 pattern5 */
const FISH_DOWN_RECT = { x: 8900, y: 4604, w: 6281, h: 2768 } as const;
/** 相对设计稿向左上微调（设计稿像素） */
const FISH_DOWN_NUDGE = { dx: -1500, dy: -1200 } as const;

const webFill = Platform.OS === 'web' ? ({ objectFit: 'fill' } as object) : null;

type FillImageProps = {
  source: number;
  width: number;
  height: number;
};

function FillImage({ source, width, height }: FillImageProps) {
  return (
    <Image
      source={source}
      style={[{ position: 'absolute', left: 0, top: 0, width, height }, webFill]}
      contentFit="fill"
    />
  );
}

/**
 * 全页背景：底图/折线 contentFit=fill 拉伸铺满；鱼群按设计稿区域比例定位。
 */
export function ModernPageBackground() {
  const { width, height } = useWindowDimensions();

  const fishTopLeft = width * (FISH_TOP_RECT.x / DESIGN_W);
  const fishTopTop = height * (FISH_TOP_RECT.y / DESIGN_H);
  const fishTopWidth = width * (FISH_TOP_RECT.w / DESIGN_W);
  const fishTopHeight = height * (FISH_TOP_RECT.h / DESIGN_H);

  const fishDownLeft = width * ((FISH_DOWN_RECT.x + FISH_DOWN_NUDGE.dx) / DESIGN_W);
  const fishDownTop = height * ((FISH_DOWN_RECT.y + FISH_DOWN_NUDGE.dy) / DESIGN_H);
  const fishDownWidth = width * (FISH_DOWN_RECT.w / DESIGN_W);
  const fishDownHeight = height * (FISH_DOWN_RECT.h / DESIGN_H);

  return (
    <View style={styles.root} pointerEvents="none">
      <Image source={HOME_IMAGES.bgEye} style={{ width: '100%', height: '100%' }} contentFit="fill" />
      <FillImage source={HOME_IMAGES.lineDeco} width={width} height={height} />
      <Image
        source={HOME_IMAGES.decoFishTop}
        style={[
          styles.fish,
          { left: fishTopLeft, top: fishTopTop, width: fishTopWidth, height: fishTopHeight },
          webFill,
        ]}
        contentFit="fill"
      />
      <Image
        source={HOME_IMAGES.decoFishDown}
        style={[
          styles.fish,
          {
            left: fishDownLeft,
            top: fishDownTop,
            width: fishDownWidth,
            height: fishDownHeight,
          },
          webFill,
        ]}
        contentFit="fill"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
    backgroundColor: '#d4d2ce',
    ...(Platform.OS === 'web'
      ? ({
          position: 'fixed',
          width: '100vw',
          height: '100vh',
          left: 0,
          top: 0,
        } as object)
      : {}),
  },
  fish: {
    position: 'absolute',
  },
});
