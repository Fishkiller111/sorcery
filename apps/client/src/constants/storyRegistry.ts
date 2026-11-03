import { SCENE_S0_01 } from '../data/s0_01/scene';
import { SCENE_S0_03 } from '../data/s0_03/scene';
import { SCENE_S0_04 } from '../data/s0_04/scene';
import type { BeatId, SceneConfig, SceneId } from '../engine/types';

export const STORY_CHAPTERS = [
  { code: 'prologue', labelKey: 'storyHome.prologue' },
  { code: 'ch1', labelKey: 'storyHome.chapter1' },
] as const;

export const DEFAULT_SEASON_ID = 'c8sseason1crimson01';

/** 剧情对应世界观（赤色长夜）。已知 id 时可直接写死；否则按名称从 /worldviews 解析。 */
export const STORY_WORLDVIEW_ID = '';

export const STORY_WORLDVIEW_NAMES = ['赤色长夜', 'Red Long Night', 'Crimson Long Night'] as const;

export function resolveStoryWorldviewId(items: Array<{ id: string; name: string }>): string | undefined {
  if (STORY_WORLDVIEW_ID) return STORY_WORLDVIEW_ID;
  const namesLower = STORY_WORLDVIEW_NAMES.map((n) => n.toLowerCase());
  return items.find(
    (item) =>
      namesLower.includes(item.name.toLowerCase()) ||
      item.name.includes('赤色长夜') ||
      item.name.toLowerCase().includes('crimson'),
  )?.id;
}

/** Scenes with full local UI config (beats, quick phrases, bad ends). */
const FULL_CONFIGS: Partial<Record<string, SceneConfig>> = {
  s0_01: SCENE_S0_01,
  s0_03: SCENE_S0_03,
  s0_04: SCENE_S0_04,
};

export function getSceneConfig(sceneCode: string): SceneConfig {
  const full = FULL_CONFIGS[sceneCode];
  if (full) return full;
  return buildMinimalSceneConfig(sceneCode);
}

export function buildMinimalSceneConfig(sceneCode: string): SceneConfig {
  return {
    sceneId: sceneCode as SceneId,
    title: { zh: sceneCode, en: sceneCode },
    playerRole: {
      character: 'emily',
      name: { zh: '艾米莉·哈特', en: 'Emily Hart' },
      mask: { zh: '质检员 · 哈特', en: 'Inspector · Hart' },
    },
    entryCheckpoint: 'beat_1' as BeatId,
    passCondition: { type: 'flag_set', flags: ['scene_done'] },
    beats: [
      {
        beatId: 'beat_1',
        type: 'solitary',
        location: { zh: '——', en: '——' },
        time: { zh: '——', en: '——' },
        agent: 'narrator',
        backgroundImage: 's0_01_b1_dorm',
        openingNarration: { zh: '', en: '' },
        taskHint: { zh: '观察四周，用对话或行动推进剧情。', en: 'Look around and advance the story through action or dialogue.' },
        passCondition: { type: 'flag_set', flags: ['scene_done'] },
        quickPhrases: [],
      },
    ],
    rewards: [],
    badEnds: [],
    agentResponses: [],
  };
}

export function sceneRoutePath(sceneCode: string, sceneType: string): string {
  if (sceneType === 'parallel') {
    return `/scene/parallel/${sceneCode}`;
  }
  return `/scene/${sceneCode}`;
}
