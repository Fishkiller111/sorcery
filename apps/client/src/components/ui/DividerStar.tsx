import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

const VIEW_SIZE = 10;
const STAR_POINTS =
  '5.00,0.50 6.03,3.58 9.28,3.61 6.66,5.54 7.65,8.64 5.00,6.75 2.35,8.64 3.34,5.54 0.72,3.61 3.97,3.58';

type DividerStarProps = {
  size?: number;
  color?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

export function DividerStar({
  size = 10,
  color = '#9e1b1b',
  opacity = 0.85,
  style,
}: DividerStarProps) {
  return (
    <View style={[{ width: size, height: size, opacity }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}>
        <Polygon points={STAR_POINTS} fill={color} />
      </Svg>
    </View>
  );
}
