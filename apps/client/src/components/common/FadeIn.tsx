import React from 'react';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  fromBottom?: boolean;
}

export function FadeInView({ children, delay = 0, duration = 400, fromBottom = true }: FadeInProps) {
  const entering = fromBottom
    ? FadeInUp.delay(delay).duration(duration).springify()
    : FadeIn.delay(delay).duration(duration);

  return (
    <Animated.View entering={entering}>
      {children}
    </Animated.View>
  );
}
