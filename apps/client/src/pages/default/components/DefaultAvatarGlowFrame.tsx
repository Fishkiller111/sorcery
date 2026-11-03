import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { VerifiedRealPersonBadge } from '../../../components/agent/VerifiedRealPersonBadge';

type DefaultAvatarGlowFrameProps = {
  size: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  verified?: boolean;
};

/** Soft outer glow only — crisp white ring comes from border on the same clip view. */
const AVATAR_GLOW_SHADOW =
  '0 0 16px 6px rgba(255, 255, 255, 0.34), 0 0 32px 12px rgba(255, 255, 255, 0.1)';

/**
 * Circular avatar frame matching web: border hugs the image, glow sits outside.
 * Border + clip share one view so Android cannot detach the ring from the photo.
 */
export function DefaultAvatarGlowFrame({ size, children, style, verified }: DefaultAvatarGlowFrameProps) {
  const radius = size / 2;
  const spread = Math.max(8, Math.round(size * 0.07));

  return (
    <View style={[styles.host, { width: size + spread, height: size + spread }, style]}>
      <View
        style={[
          styles.frame,
          {
            width: size,
            height: size,
            borderRadius: radius,
            boxShadow: AVATAR_GLOW_SHADOW,
          },
        ]}
      >
        {children}
      </View>
      {verified ? <VerifiedRealPersonBadge size={Math.max(16, Math.round(size * 0.28))} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  frame: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    backgroundColor: 'transparent',
  },
});
