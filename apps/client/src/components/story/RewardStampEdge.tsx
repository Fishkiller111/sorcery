/**
 * 奖励图章树 · SVG 连线层
 *
 * 读取 layoutRewardStampTree 输出的 edge.points，
 * 在节点下方绘制 Polyline；颜色按分支类型区分。
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { branchAccent } from './rewardStampTheme';
import type { RewardStampLayoutEdge } from '../../utils/layoutRewardStampTree';

type Props = {
  width: number;
  height: number;
  edges: RewardStampLayoutEdge[];
};

export function RewardStampEdge({ width, height, edges }: Props) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {edges.map((edge) => {
        if (!edge.points.length) return null;
        const color = branchAccent(edge.branchType ?? 'parallel');
        const isLocked = edge.branchType === 'locked';
        return (
          <Polyline
            key={edge.id}
            points={edge.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={isLocked ? 1.5 : 2}
            strokeOpacity={isLocked ? 0.35 : 0.55}
            strokeDasharray={isLocked ? '4 4' : undefined}
          />
        );
      })}
    </Svg>
  );
}
