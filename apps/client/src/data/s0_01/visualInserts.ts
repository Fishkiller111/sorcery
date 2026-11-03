import type { BeatId } from '../../engine/types';
import type { S0_01AudioKey } from './audioAssets';
import type { VisualInsertDef, VisualInsertTrigger } from '../visualInsertTypes';

export type { VisualInsertDef, VisualInsertTrigger };

export const S0_01_VISUAL_INSERTS: (VisualInsertDef & { sfx?: S0_01AudioKey })[] = [
  {
    id: 'I-01-01',
    image: 'scenes/s0_01/inserts/I-01-01.jpg',
    sfx: 's0_01_sfx_bed_creak',
    durationMs: 2000,
    trigger: {
      type: 'intent_any',
      beat: 'beat_1',
      keywords: ['床板', '掀开', '下面', '短波', 'bed', 'board', 'under', 'shortwave'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-01-02',
    image: 'scenes/s0_01/inserts/I-01-02.jpg',
    sfx: 's0_01_sfx_notebook',
    durationMs: 2500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_1',
      keywords: ['笔记本', '4471', '4472', '档案', '记下', '今晚录音', 'notebook', 'archive', 'hd', 'write', 'record tonight'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-01-03',
    image: 'scenes/s0_01/inserts/I-01-03.jpg',
    sfx: 's0_01_sfx_locker',
    durationMs: 2000,
    trigger: { type: 'beat_enter', beat: 'beat_2', delayMs: 500 },
    oncePerBeat: true,
  },
  {
    id: 'I-01-04',
    image: 'scenes/s0_01/inserts/I-01-04.jpg',
    sfx: 's0_01_sfx_loom_near',
    durationMs: 2000,
    trigger: { type: 'beat_round_gte', beat: 'beat_3', minRounds: 2 },
    oncePerBeat: true,
  },
  {
    id: 'I-01-05',
    image: 'scenes/s0_01/inserts/I-01-05.webp',
    sfx: 's0_01_sfx_grate_pass',
    durationMs: 2500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_3',
      keywords: ['格栅', '通风', 'grate', 'ventilation'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-01-05b',
    image: 'scenes/s0_01/inserts/I-01-05.webp',
    durationMs: 1200,
    trigger: {
      type: 'intent_any',
      beat: 'beat_5',
      keywords: ['格栅', '通风', 'grate', 'ventilation', '通风格栅'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-01-06',
    image: 'scenes/s0_01/inserts/I-01-06.png',
    sfx: 's0_01_sfx_cough',
    durationMs: 2000,
    trigger: { type: 'beat_enter', beat: 'beat_4', delayMs: 300 },
    oncePerBeat: true,
  },
  {
    id: 'I-01-07',
    image: 'scenes/s0_01/inserts/I-01-07.webp',
    sfx: 's0_01_sfx_factory_whistle',
    durationMs: 3000,
    trigger: { type: 'beat_enter', beat: 'beat_5', delayMs: 500 },
    oncePerBeat: true,
  },
  {
    id: 'I-01-08',
    image: 'scenes/s0_01/inserts/I-01-08.webp',
    sfx: 's0_01_sfx_stampede',
    durationMs: 2500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_5',
      keywords: ['打卡', '人流', '收工', '闸机', 'card', 'crowd', 'shift', 'stampede'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-R02-01',
    image: 'scenes/s0_01/inserts/I-R02-01.webp',
    sfx: 's0_01_r02_amb_truck',
    durationMs: 2500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_4',
      keywords: ['体检车', '征召车', 'truck', 'van', '窗外', 'glimpse'],
    },
    oncePerBeat: true,
  },
];

export const S0_01_B01_INSERT_IMAGES: Record<string, string> = {
  'I-B01-01': 'scenes/s0_01/inserts/I-B01-01.webp',
  'I-B01-02': 'scenes/s0_01/inserts/I-B01-02.webp',
  'I-B01-03': 'scenes/s0_01/inserts/I-B01-03.webp',
};
