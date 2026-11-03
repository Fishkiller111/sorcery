import type { S0_04AudioKey } from './audioAssets';
import type { VisualInsertDef } from '../visualInsertTypes';

type S0_04Insert = VisualInsertDef & { sfx?: S0_04AudioKey };

export const S0_04_VISUAL_INSERTS: S0_04Insert[] = [
  {
    id: 'I-04-01',
    image: 'scenes/s0_04/inserts/I-04-01.jpg',
    sfx: 's0_04_sfx_door_lock',
    durationMs: 1500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_1',
      keywords: ['关门', '反锁', '锁', 'close', 'door', 'lock', 'latch'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-04-02',
    image: 'scenes/s0_04/inserts/I-04-02.jpg',
    sfx: 's0_04_sfx_city_hum',
    durationMs: 2500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_1',
      keywords: ['巨构', '浅蓝', '窗', 'megastructure', 'pale blue', 'window', '床沿'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-04-03',
    image: 'scenes/s0_04/inserts/I-04-03.jpg',
    sfx: 's0_04_sfx_tape_hiss',
    durationMs: 2000,
    trigger: {
      type: 'intent_any',
      beat: 'beat_2',
      keywords: ['播放', '磁带', '耳机', '口哨', 'play', 'cassette', 'tape', 'earbud', 'whistle'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-04-04',
    image: 'scenes/s0_04/inserts/I-04-04.jpg',
    sfx: 's0_04_sfx_tape_stop',
    durationMs: 1500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_2',
      keywords: ['摘耳机', '停止', 'stop', 'earbud off', 'rewind'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-04-05',
    image: 'scenes/s0_04/inserts/I-04-05.jpg',
    sfx: 's0_04_sfx_pencil',
    durationMs: 2500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_3',
      keywords: ['写', '11/14', '扫尘', '铅笔', 'write', '11/14', 'sweep', 'pencil'],
    },
    oncePerBeat: true,
    chainNext: 'I-04-06',
  },
  {
    id: 'I-04-06',
    image: 'scenes/s0_04/inserts/I-04-06.jpg',
    sfx: 's0_04_sfx_page_turn',
    durationMs: 1800,
    trigger: {
      type: 'intent_any',
      beat: 'beat_3',
      keywords: ['合上', '合本', 'close notebook', '合上笔记本', '放下'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-04-07',
    image: 'scenes/s0_04/inserts/I-04-07.jpg',
    durationMs: 1500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_4',
      keywords: ['俄语', '晚安', '祖国', 'goodnight', 'russian', 'спокойной'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-04-09',
    image: 'scenes/s0_04/inserts/I-04-09.jpg',
    sfx: 's0_04_sfx_breath',
    durationMs: 2000,
    trigger: {
      type: 'intent_any',
      beat: 'beat_4',
      keywords: ['two more days', 'two days', '气声', 'whisper'],
    },
    oncePerBeat: true,
  },
  {
    id: 'I-R04-01',
    image: 'scenes/s0_04/inserts/I-R04-01.jpg',
    sfx: 's0_04_r04_amb_flashback',
    durationMs: 2500,
    trigger: {
      type: 'intent_any',
      beat: 'beat_2',
      keywords: ['1994', '1993', '闪回', 'flashback', '杰克', 'jack', '会议室'],
    },
    oncePerBeat: true,
  },
];

/** Chapter-end inserts (system sequence, not chat-triggered). */
export const S0_04_CHAPTER_END_INSERTS: S0_04Insert[] = [
  {
    id: 'I-04-10',
    image: 'scenes/s0_04/inserts/I-04-10.jpg',
    sfx: 's0_04_sting_broadcast',
    durationMs: 3500,
    trigger: { type: 'beat_enter', beat: 'beat_1' },
  },
  {
    id: 'I-04-11',
    image: 'scenes/s0_04/inserts/I-04-11.jpg',
    sfx: 's0_04_sfx_radio_fade',
    durationMs: 3000,
    trigger: { type: 'beat_enter', beat: 'beat_1' },
  },
];
