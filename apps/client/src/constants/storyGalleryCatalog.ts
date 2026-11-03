import { SCENE_S0_01 } from '../data/s0_01/scene';
import { SCENE_S0_03 } from '../data/s0_03/scene';
import { SCENE_S0_04 } from '../data/s0_04/scene';
import { PA02_GALLERY_CELLS } from '../data/s0_02/parallel';
import type { SceneConfig } from '../engine/types';
import type { Lang, LocalizedString } from '../i18n/types';
import { resolveLocalized } from '../i18n/utils';
import { getSceneConfig } from './storyRegistry';
import { mergeGalleryTitle } from '../utils/galleryTitle';

export type GalleryBranchType = 'reward' | 'bad_end' | 'parallel';

export interface GalleryCellDef {
  id: string;
  label?: LocalizedString;
  standardImage?: string;
  matureImage?: string;
}

export interface GalleryBranchDef {
  id: string;
  type: GalleryBranchType;
  sceneCode: string;
  chapterCode: string;
  title: LocalizedString;
  subtitle?: LocalizedString;
  seenFlag: string;
  cells: GalleryCellDef[];
}

export interface GallerySceneDef {
  sceneCode: string;
  chapterCode: string;
  title: LocalizedString;
  /** Short blurb under scene header in branch map. */
  flavor?: LocalizedString;
  sortOrder: number;
  branchIds: string[];
}

function cellsFromReward(config: SceneConfig, rewardId: string): GalleryCellDef[] {
  const reward = config.rewards.find((r) => r.branchId === rewardId);
  if (!reward) return [];
  return reward.stages
    .filter((s) => s.standardImage || s.matureImage || s.text)
    .map((s) => ({
      id: `${rewardId}_stage_${s.round}`,
      label: s.text,
      standardImage: s.standardImage,
      matureImage: s.matureImage,
    }));
}

function cellsFromBadEnd(config: SceneConfig, badEndId: string): GalleryCellDef[] {
  const badEnd = config.badEnds.find((b) => b.badEndId === badEndId);
  if (!badEnd) return [];
  return badEnd.steps
    .filter((s) => s.standardImage || s.matureImage || s.text)
    .map((s) => ({
      id: `${badEndId}_step_${s.step}`,
      label: s.text,
      standardImage: s.standardImage,
      matureImage: s.matureImage,
    }));
}

function buildS001Branches(): GalleryBranchDef[] {
  const config = SCENE_S0_01;
  return [
    {
      id: 'R02',
      type: 'reward',
      sceneCode: 's0_01',
      chapterCode: 'prologue',
      title: { zh: 'R02 · 咳血女工', en: 'R02 · Coughing Worker' },
      subtitle: {
        zh: '与卡佳深聊 · 回主线',
        en: 'Deep chat with Katya · return to main line',
      },
      seenFlag: 'reward_seen_R02',
      cells: cellsFromReward(config, 'R02'),
    },
    {
      id: 'B01',
      type: 'bad_end',
      sceneCode: 's0_01',
      chapterCode: 'prologue',
      title: { zh: 'B01 · 监听器从未关掉', en: 'B01 · Surveillance Never Off' },
      subtitle: {
        zh: '英语挑衅监听 · 回 Beat 1',
        en: 'English provocation · rollback to Beat 1',
      },
      seenFlag: 'bad_end_seen_B01',
      cells: cellsFromBadEnd(config, 'B01'),
    },
  ];
}

function buildS003Branches(): GalleryBranchDef[] {
  const config = SCENE_S0_03;
  return [
    {
      id: 'R06',
      type: 'reward',
      sceneCode: 's0_03',
      chapterCode: 'prologue',
      title: { zh: 'R06 · T.Hart 档案', en: 'R06 · T.Hart Archive' },
      subtitle: { zh: '追问 T.Hart · 回主线', en: 'Ask about T.Hart · return to main' },
      seenFlag: 'reward_seen_R06',
      cells: cellsFromReward(config, 'R06'),
    },
    {
      id: 'B03',
      type: 'bad_end',
      sceneCode: 's0_03',
      chapterCode: 'prologue',
      title: { zh: 'B03 · 追问过线', en: 'B03 · Crossed the Line' },
      subtitle: { zh: '逼安娜过线 · 回 Beat 1', en: 'Push Anna too far · rollback' },
      seenFlag: 'bad_end_seen_B03',
      cells: cellsFromBadEnd(config, 'B03'),
    },
  ];
}

function buildS004Branches(): GalleryBranchDef[] {
  const config = SCENE_S0_04;
  return [
    {
      id: 'R04',
      type: 'reward',
      sceneCode: 's0_04',
      chapterCode: 'prologue',
      title: { zh: 'R04 · 杰克磁带', en: 'R04 · Jack Tape' },
      subtitle: { zh: '深听杰克 · 回主线', en: 'Listen to Jack · return to main' },
      seenFlag: 'reward_seen_R04',
      cells: cellsFromReward(config, 'R04'),
    },
  ];
}

/** Static branch defs for scenes without full local SceneConfig yet. */
const STATIC_BRANCHES: GalleryBranchDef[] = [
  {
    id: 'PA02',
    type: 'parallel',
    sceneCode: 's0_02',
    chapterCode: 'prologue',
    title: { zh: 'PA02 · 维克多档案', en: 'PA02 · Viktor Archive' },
    subtitle: { zh: '平行蒙太奇鉴赏', en: 'Parallel montage gallery' },
    seenFlag: 'parallel_seen_s0_02',
    cells: PA02_GALLERY_CELLS.map((cell) => ({ ...cell })),
  },
];

export const GALLERY_SCENES: GallerySceneDef[] = [
  {
    sceneCode: 's0_01',
    chapterCode: 'prologue',
    title: { zh: 'S0-01 · 假面', en: 'S0-01 · Mask' },
    flavor: {
      zh: '质检员哈特的一天 · 纺织厂 · 监听与伪装',
      en: "Inspector Hart's day · the mill · surveillance and the mask",
    },
    sortOrder: 1,
    branchIds: ['R02', 'B01'],
  },
  {
    sceneCode: 's0_02',
    chapterCode: 'prologue',
    title: { zh: 'S0-02 · 网在收紧', en: 'S0-02 · The Net Tightens' },
    flavor: {
      zh: '平行 · 维克多侧 · 白鸽档案',
      en: 'Parallel · Viktor\'s side · White Dove dossier',
    },
    sortOrder: 2,
    branchIds: ['PA02'],
  },
  {
    sceneCode: 's0_03',
    chapterCode: 'prologue',
    title: { zh: 'S0-03 · 通风口下', en: 'S0-03 · Under the Vent' },
    flavor: {
      zh: '夜 · 通风口 · 老钟与 11/14 名单',
      en: 'Night · the vent · Old Zhong and the 11/14 list',
    },
    sortOrder: 3,
    branchIds: ['R06', 'B03'],
  },
  {
    sceneCode: 's0_04',
    chapterCode: 'prologue',
    title: { zh: 'S0-04 · 还有两天', en: 'S0-04 · Two Days Left' },
    flavor: {
      zh: '宿舍 · 磁带 · 笔记本 · 监听前的晚安',
      en: 'Dorm · cassette · notebook · goodnight before the listener',
    },
    sortOrder: 4,
    branchIds: ['R04'],
  },
];

const BRANCH_MAP: Record<string, GalleryBranchDef> = {};

for (const b of buildS001Branches()) {
  BRANCH_MAP[b.id] = b;
}
for (const b of buildS003Branches()) {
  BRANCH_MAP[b.id] = b;
}
for (const b of buildS004Branches()) {
  BRANCH_MAP[b.id] = b;
}
for (const b of STATIC_BRANCHES) {
  BRANCH_MAP[b.id] = b;
}

export function getGalleryBranch(branchId: string): GalleryBranchDef | undefined {
  return BRANCH_MAP[branchId];
}

export function getGalleryBranchesForScene(sceneCode: string): GalleryBranchDef[] {
  const scene = GALLERY_SCENES.find((s) => s.sceneCode === sceneCode);
  if (!scene) return [];
  return scene.branchIds.map((id) => BRANCH_MAP[id]).filter(Boolean) as GalleryBranchDef[];
}

export function getGalleryScenesForChapter(chapterCode: string): GallerySceneDef[] {
  return GALLERY_SCENES.filter((s) => s.chapterCode === chapterCode).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Short scene names for chapter list (API `title` is zh-only). */
const SCENE_LIST_TITLES: Record<string, LocalizedString> = {
  s0_01: { zh: '假面', en: 'Mask', jp: '仮面', ru: 'Маска', es: 'Máscara' },
  s0_02: { zh: '网在收紧', en: 'The Net Tightens', jp: '網が締まる', ru: 'Сеть сжимается', es: 'La red se cierra' },
  s0_03: { zh: '通风口下', en: 'Under the Vent', jp: '通風口の下', ru: 'Под решёткой', es: 'Bajo la rejilla' },
  s0_04: { zh: '还有两天', en: 'Two Days Left', jp: 'あと二日', ru: 'Ещё два дня', es: 'Dos días más' },
};

const CHAPTER_LIST_TITLES: Record<string, LocalizedString> = {
  prologue: {
    zh: '序章 · We Are Still Here',
    en: 'Prologue · We Are Still Here',
    jp: 'プロローグ · We Are Still Here',
    ru: 'Пролог · We Are Still Here',
    es: 'Prólogo · We Are Still Here',
  },
  ch1: {
    zh: '第一章 · 扫尘',
    en: 'Chapter 1 · Sweeping Dust',
    jp: '第1章 · 塵を払う',
    ru: 'Глава 1 · Сметая пыль',
    es: 'Capítulo 1 · Barriendo el polvo',
  },
};

export function resolveStorySceneListTitle(
  sceneCode: string,
  apiTitle?: string,
  lang: Lang = 'en',
): string {
  const localized = SCENE_LIST_TITLES[sceneCode];
  if (localized) return resolveLocalized(localized, lang);
  const galleryScene = GALLERY_SCENES.find((s) => s.sceneCode === sceneCode);
  if (galleryScene) {
    return resolveLocalized(resolveGallerySceneTitle(galleryScene, apiTitle), lang);
  }
  const config = getSceneConfig(sceneCode);
  if (config.title.zh !== sceneCode) {
    return resolveLocalized(config.title, lang);
  }
  return apiTitle || sceneCode;
}

export function resolveStoryChapterListTitle(
  chapterCode: string,
  apiTitle?: string,
  lang: Lang = 'en',
): string {
  const localized = CHAPTER_LIST_TITLES[chapterCode];
  if (localized) return resolveLocalized(localized, lang);
  return apiTitle || chapterCode;
}

/** Merge runtime scene title from API when available. */
export function resolveGallerySceneTitle(
  scene: GallerySceneDef,
  apiTitle?: string,
): LocalizedString {
  if (apiTitle) {
    return mergeGalleryTitle(apiTitle, scene.title);
  }
  const config = getSceneConfig(scene.sceneCode);
  if (config.title.zh !== scene.sceneCode) {
    return config.title;
  }
  return scene.title;
}
