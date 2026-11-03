import type { LangId } from '../components/create-agent/types';
import type { RoleEventInput } from '../types/api';

type EventTemplate = {
  event_name: string;
  sort_order: number;
  cooldown_seconds: number;
  is_active: boolean;
  labels: Record<LangId, { display_name: string; prompt_suffix: string }>;
};

/** Mirrors backend ugc.DefaultEventTemplates (6 UI events; welcome is system-managed). */
const DEFAULT_EVENT_TEMPLATES: EventTemplate[] = [
  {
    event_name: 'pat_head',
    sort_order: 0,
    cooldown_seconds: 10,
    is_active: true,
    labels: {
      zh: { display_name: '摸头', prompt_suffix: '用户轻轻摸了摸你的头' },
      en: { display_name: 'Pat head', prompt_suffix: 'The user gently pats your head' },
      jp: { display_name: '頭をなでる', prompt_suffix: 'ユーザーがそっとあなたの頭をなでた' },
      ru: { display_name: 'Погладить по голове', prompt_suffix: 'Пользователь нежно гладит тебя по голове' },
      es: { display_name: 'Acariciar la cabeza', prompt_suffix: 'El usuario te acaricia suavemente la cabeza' },
    },
  },
  {
    event_name: 'poke_cheek',
    sort_order: 1,
    cooldown_seconds: 10,
    is_active: true,
    labels: {
      zh: { display_name: '戳脸', prompt_suffix: '用户用手指戳了戳你的脸颊' },
      en: { display_name: 'Poke cheek', prompt_suffix: 'The user pokes your cheek with a finger' },
      jp: { display_name: 'ほっぺをつつく', prompt_suffix: 'ユーザーが指であなたのほっぺをつついた' },
      ru: { display_name: 'Ткнуть в щёку', prompt_suffix: 'Пользователь тыкает тебя пальцем в щёку' },
      es: { display_name: 'Picar la mejilla', prompt_suffix: 'El usuario te pica la mejilla con el dedo' },
    },
  },
  {
    event_name: 'hold_hand',
    sort_order: 2,
    cooldown_seconds: 10,
    is_active: true,
    labels: {
      zh: { display_name: '牵手', prompt_suffix: '用户握住了你的手' },
      en: { display_name: 'Hold hand', prompt_suffix: 'The user holds your hand' },
      jp: { display_name: '手をつなぐ', prompt_suffix: 'ユーザーがあなたの手を握った' },
      ru: { display_name: 'Взять за руку', prompt_suffix: 'Пользователь берёт тебя за руку' },
      es: { display_name: 'Tomar la mano', prompt_suffix: 'El usuario toma tu mano' },
    },
  },
  {
    event_name: 'pat_shoulder',
    sort_order: 3,
    cooldown_seconds: 10,
    is_active: true,
    labels: {
      zh: { display_name: '拍肩', prompt_suffix: '用户拍了拍你的肩膀' },
      en: { display_name: 'Pat shoulder', prompt_suffix: 'The user pats your shoulder' },
      jp: { display_name: '肩をたたく', prompt_suffix: 'ユーザーがあなたの肩をたたいた' },
      ru: { display_name: 'Похлопать по плечу', prompt_suffix: 'Пользователь хлопает тебя по плечу' },
      es: { display_name: 'Palmear el hombro', prompt_suffix: 'El usuario te da una palmada en el hombro' },
    },
  },
  {
    event_name: 'hug',
    sort_order: 4,
    cooldown_seconds: 10,
    is_active: true,
    labels: {
      zh: { display_name: '拥抱', prompt_suffix: '用户抱住了你' },
      en: { display_name: 'Hug', prompt_suffix: 'The user hugs you' },
      jp: { display_name: 'ハグ', prompt_suffix: 'ユーザーがあなたを抱きしめた' },
      ru: { display_name: 'Обнять', prompt_suffix: 'Пользователь обнимает тебя' },
      es: { display_name: 'Abrazar', prompt_suffix: 'El usuario te abraza' },
    },
  },
  {
    event_name: 'wave',
    sort_order: 5,
    cooldown_seconds: 10,
    is_active: true,
    labels: {
      zh: { display_name: '挥手', prompt_suffix: '用户向你挥了挥手' },
      en: { display_name: 'Wave', prompt_suffix: 'The user waves at you' },
      jp: { display_name: '手を振る', prompt_suffix: 'ユーザーがあなたに手を振った' },
      ru: { display_name: 'Помахать', prompt_suffix: 'Пользователь машет тебе рукой' },
      es: { display_name: 'Saludar', prompt_suffix: 'El usuario te saluda con la mano' },
    },
  },
];

/** Default interaction events for the create-agent wizard (editable before create). */
export function defaultRoleEvents(lang: LangId = 'en'): RoleEventInput[] {
  const pick = (tpl: EventTemplate) => tpl.labels[lang] ?? tpl.labels.en;
  return DEFAULT_EVENT_TEMPLATES.map((tpl) => {
    const text = pick(tpl);
    return {
      event_name: tpl.event_name,
      display_name: text.display_name,
      prompt_suffix: text.prompt_suffix,
      sort_order: tpl.sort_order,
      cooldown_seconds: tpl.cooldown_seconds,
      is_active: tpl.is_active,
    };
  });
}
