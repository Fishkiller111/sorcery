import React from 'react';
import { Image } from 'expo-image';
import { SOUL_IMAGES } from '../theme/images';

type DefaultSoulCoinIconProps = {
  size?: number;
};

export function DefaultSoulCoinIcon({ size = 40 }: DefaultSoulCoinIconProps) {
  return (
    <Image
      source={SOUL_IMAGES.coin}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="Soul"
    />
  );
}
