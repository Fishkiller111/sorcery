import { S0_01_VISUAL_INSERTS } from './s0_01/visualInserts';
import { S0_03_VISUAL_INSERTS } from './s0_03/visualInserts';
import { S0_04_VISUAL_INSERTS } from './s0_04/visualInserts';
import type { VisualInsertDef } from './visualInsertTypes';

const INSERTS_BY_SCENE: Record<string, VisualInsertDef[]> = {
  s0_01: S0_01_VISUAL_INSERTS,
  s0_03: S0_03_VISUAL_INSERTS,
  s0_04: S0_04_VISUAL_INSERTS,
};

export function getVisualInsertsForScene(sceneId: string): VisualInsertDef[] {
  return INSERTS_BY_SCENE[sceneId] ?? [];
}

export function findVisualInsertById(sceneId: string, id: string): VisualInsertDef | undefined {
  return getVisualInsertsForScene(sceneId).find((ins) => ins.id === id);
}

export function hasScenePresentation(sceneId: string): boolean {
  return sceneId in INSERTS_BY_SCENE;
}
