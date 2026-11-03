import React from 'react';
import {
  AgentMediaVideoView,
  type AgentMediaVideoViewProps,
} from '../../pages/default/agent-media/AgentMediaVideoView';

export type LazyVideoProps = AgentMediaVideoViewProps & {
  /** false 时不挂载播放器，避免创建即拉流 */
  active: boolean;
};

/**
 * 仅在 active 时挂载 AgentMediaVideoView。
 * 列表预览：active = 视口内 && hover && 持有播放权。
 */
export function LazyVideo({ active, preload = 'metadata', ...rest }: LazyVideoProps) {
  if (!active || !rest.uri) return null;
  return <AgentMediaVideoView {...rest} preload={preload} />;
}
