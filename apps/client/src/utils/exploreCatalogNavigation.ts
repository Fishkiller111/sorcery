import type { ExploreWorldItem } from '../api/exploreWorlds';

/** Official / user simulator ids use the c8si prefix. */
export function isSimulatorCatalogId(id: string | undefined | null): boolean {
  const trimmed = String(id ?? '').trim();
  return /^c8si[0-9a-f]{16}$/i.test(trimmed);
}

export function isExploreSimulatorItem(item: ExploreWorldItem): boolean {
  if (item.kind === 'simulator') return true;
  if (item.simulator_id?.trim()) return true;
  if (isSimulatorCatalogId(item.world_id)) return true;
  if (item.world_id?.trim()) return false;
  return isSimulatorCatalogId(item.code);
}

export function resolveExploreSimulatorId(item: ExploreWorldItem): string | null {
  const simId = item.simulator_id?.trim();
  if (simId) return simId;
  const worldId = item.world_id?.trim();
  if (worldId && isSimulatorCatalogId(worldId)) return worldId;
  const code = item.code?.trim() ?? '';
  if (isSimulatorCatalogId(code)) return code;
  return null;
}

export function resolveExploreWorldId(item: ExploreWorldItem): string | null {
  if (isExploreSimulatorItem(item)) return null;
  return item.world_id?.trim() || null;
}
