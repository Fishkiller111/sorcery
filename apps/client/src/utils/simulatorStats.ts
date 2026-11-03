import type { ExploreSimulatorItem, SimulatorItem, SimulatorStats } from '../types/simulator';

/** Normalize optional stats from list/detail payloads (flat or nested). */
export function resolveSimulatorStats(
  item?: Pick<
    SimulatorItem | ExploreSimulatorItem,
    'view_count' | 'play_count' | 'clear_count' | 'stats'
  > | null,
): SimulatorStats | null {
  if (!item) return null;
  const view = item.view_count ?? item.stats?.view_count;
  const play = item.play_count ?? item.stats?.play_count;
  const clear = item.clear_count ?? item.stats?.clear_count;
  if (view == null && play == null && clear == null) return null;
  return {
    view_count: view,
    play_count: play,
    clear_count: clear,
  };
}

export function formatSimulatorStatsLine(
  stats: SimulatorStats,
  labels: { views: string; plays: string; clears: string },
): string {
  const parts: string[] = [];
  if (stats.view_count != null) parts.push(`${labels.views} ${stats.view_count}`);
  if (stats.play_count != null) parts.push(`${labels.plays} ${stats.play_count}`);
  if (stats.clear_count != null) parts.push(`${labels.clears} ${stats.clear_count}`);
  return parts.join(' · ');
}
