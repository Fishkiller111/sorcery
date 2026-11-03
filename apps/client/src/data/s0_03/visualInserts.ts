import type { S0_03AudioKey } from './audioAssets';
import type { VisualInsertDef } from '../visualInsertTypes';

type S0_03Insert = VisualInsertDef & { sfx?: S0_03AudioKey };

export const S0_03_VISUAL_INSERTS: S0_03Insert[] = [
  {
    id: 'I-03-01',
    image: 'scenes/s0_03/inserts/I-03-01.jpg',
    sfx: 's0_03_sfx_knock_signal',
    durationMs: 2000,
    trigger: {
      type: 'intent_any',
      beat: 'beat_1',
      keywords: ['三长两短', '暗号', 'knock', '叩', '敲', 'signal'],
    },
    oncePerBeat: true,
    chainNext: 'I-03-02',
  },
  {
    id: 'I-03-02',
    image: 'scenes/s0_03/inserts/I-03-02.jpg',
    sfx: 's0_03_sfx_door_slit',
    durationMs: 1800,
    trigger: {
      type: 'intent_any',
      beat: 'beat_1',
      keywords: ['门开', '开门', 'door', 'slit', 'gap'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-03-03',
    image: 'scenes/s0_03/inserts/I-03-03.jpg',
    sfx: 's0_03_sfx_spiral_stairs',
    durationMs: 2500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_1',
      keywords: ['旋梯', '跟着露西', '脚步', 'stairs', 'spiral', 'descend', 'follow lucy'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-03-04',
    image: 'scenes/s0_03/inserts/I-03-04.jpg',
    sfx: 's0_03_sfx_shortwave_on',
    durationMs: 2500,
    trigger: { type: 'beat_enter', beat: 'beat_2', delayMs: 500 },
    oncePerBeat: true,
  },
  {
    id: 'I-03-05',
    image: 'scenes/s0_03/inserts/I-03-05.jpg',
    durationMs: 1500,
    trigger: { type: 'beat_enter', beat: 'beat_3', delayMs: 800 },
    oncePerBeat: true,
  },
  {
    id: 'I-03-06',
    image: 'scenes/s0_03/inserts/I-03-06.jpg',
    sfx: 's0_03_sfx_microfilm',
    durationMs: 2000,
    trigger: {
      type: 'intent_any',
      beat: 'beat_3',
      keywords: ['microfilm', '胶片', '展开', 'film', 'unroll', '名单'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-03-07',
    image: 'scenes/s0_03/inserts/I-03-07.jpg',
    sfx: 's0_03_sfx_mic_light',
    durationMs: 2000,
    trigger: { type: 'beat_enter', beat: 'beat_4', delayMs: 500 },
    oncePerBeat: true,
  },
  {
    id: 'I-03-08',
    image: 'scenes/s0_03/inserts/I-03-08.jpg',
    sfx: 's0_03_sfx_radio_tx',
    durationMs: 3000,
    trigger: {
      type: 'intent_any',
      beat: 'beat_4',
      keywords: ['we are still here', 'still here', '推杆', '发送', 'transmit', 'lever', 'broadcast'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-03-09',
    image: 'scenes/s0_03/inserts/I-03-09.jpg',
    sfx: 's0_03_sfx_door_close',
    durationMs: 2000,
    trigger: { type: 'beat_enter', beat: 'beat_5', delayMs: 300 },
    oncePerBeat: true,
  },
  {
    id: 'I-03-10',
    image: 'scenes/s0_03/inserts/I-03-10.jpg',
    sfx: 's0_03_sfx_surface_walk',
    durationMs: 2500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_5',
      keywords: ['回宿舍', '格栅', '原路', 'dorm', 'grille', 'surface', 'walk back'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-R06-01',
    image: 'scenes/s0_03/inserts/I-R06-01.jpg',
    sfx: 's0_03_r06_sfx_projector',
    durationMs: 2000,
    trigger: {
      type: 'intent_any',
      beat: 'beat_3',
      keywords: ['t.hart', 't hart', '7号井', '七号井', 'shaft seven', '转移', 'transfer', '档案'],
    },
    oncePerBeat: true,
  },
];

export const S0_03_B03_INSERT_IMAGES: Record<string, string> = {
  'I-B03-01': 'scenes/s0_03/inserts/I-B03-01.jpg',
  'I-B03-02': 'scenes/s0_03/inserts/I-B03-02.jpg',
  'I-B03-03': 'scenes/s0_03/inserts/I-B03-03.jpg',
};
