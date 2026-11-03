import type { LocalizedString } from '../../i18n/types';
import type { StoryAudioKey } from '../storyAudioRegistry';

export interface ParallelHotspotConfig {
  action: string;
  gallery_id: string;
  label?: LocalizedString;
}

export interface ParallelCutInConfig {
  id: string;
  at_ms: number;
  duration_ms: number;
  sfx?: StoryAudioKey;
  image?: string;
  fade_ms?: number;
}

export interface ParallelStepConfig {
  step: number;
  beat_id?: string;
  agent?: string;
  text?: LocalizedString;
  duration_ms: number;
  standard_image?: string;
  mature_image?: string;
  hotspot?: ParallelHotspotConfig;
  cut_ins?: ParallelCutInConfig[];
  /** Beat 5: pure black hold after last cut-in (ms). */
  black_hold_ms?: number;
}

export interface ParallelPlaybackConfig {
  min_seconds: number;
  skip_if_seen?: boolean;
  ambience?: StoryAudioKey;
  steps: ParallelStepConfig[];
}

const INSERT = (n: number) => `parallels/P02/inserts/I-02-0${n}.jpg`;

export const PARALLEL_S0_02: ParallelPlaybackConfig = {
  min_seconds: 5,
  skip_if_seen: true,
  ambience: 's0_02_amb_office',
  steps: [
    {
      step: 1,
      beat_id: 'beat_1',
      agent: 'narrator',
      text: {
        zh: '新莫斯科州，克格勃地区分局。维克多的办公室四壁灰白，空无一饰。窗外，人类发展中心的浅蓝轮廓像一座冷掉的灯塔。',
        en: "New Moscow Oblast, KGB regional branch. Viktor's office: grey walls, bare shelves. Outside the window, the Human Development Center glows pale blue like a cold lighthouse.",
      },
      duration_ms: 4000,
      standard_image: 'parallels/P02/S-P02-1.jpg',
      mature_image: 'parallels/P02/M-P02-1.jpg',
      cut_ins: [
        {
          id: 'I-02-01',
          at_ms: 800,
          duration_ms: 2000,
          sfx: 's0_02_sfx_wind_window',
          image: INSERT(1),
          fade_ms: 300,
        },
      ],
    },
    {
      step: 2,
      beat_id: 'beat_2',
      agent: 'viktor',
      text: {
        zh: '「『白鸽』不是枪，是嗓子。」\n「我申请的不是子弹，是镜头——全球直播的再教育审判。要她跪下，不要她死。」',
        en: '"White Dove" is not a gun. It is a voice."\n"I am not requesting bullets. I want cameras—a globally broadcast re-education trial. I want her on her knees, not dead."',
      },
      duration_ms: 9000,
      standard_image: 'parallels/P02/S-P02-2.jpg',
      mature_image: 'parallels/P02/M-P02-2.jpg',
      cut_ins: [
        {
          id: 'I-02-02',
          at_ms: 0,
          duration_ms: 2500,
          sfx: 's0_02_sfx_phone_hum',
          image: INSERT(2),
          fade_ms: 300,
        },
        {
          id: 'I-02-03',
          at_ms: 3500,
          duration_ms: 2000,
          sfx: 's0_02_sfx_footsteps_corridor',
          image: INSERT(3),
          fade_ms: 300,
        },
      ],
    },
    {
      step: 3,
      beat_id: 'beat_3',
      agent: 'aide',
      text: {
        zh: '副官：「上校，『全视之眼』将于十一月十五日起加强频段压制。」\n\n维克多对着线路那头，慢条斯理：「哈特夫人。四年了。你还没学会闭嘴。」\n\n案卷封面：克格勃—美方四四七一号，代号「白鸽」。手写批注：心理战系列，留档。',
        en: 'Aide: "Colonel, All-Seeing Eye frequency suppression upgrades November fifteenth."\n\nViktor, unhurried on the line: "Mrs. Hart. Four years. You still haven\'t learned to be quiet."\n\nDossier cover: KGB–US 4471, codename "White Dove." Handwritten note: Psyops series—retain.',
      },
      duration_ms: 11000,
      standard_image: 'parallels/P02/S-P02-3.jpg',
      mature_image: 'parallels/P02/M-P02-3.webp',
      hotspot: {
        action: 'open_gallery',
        gallery_id: 'PA02',
        label: { zh: '放大档案', en: 'Examine dossier' },
      },
      cut_ins: [
        {
          id: 'I-02-04',
          at_ms: 0,
          duration_ms: 1500,
          sfx: 's0_02_sfx_folder_drop',
          image: INSERT(4),
          fade_ms: 250,
        },
        {
          id: 'I-02-05',
          at_ms: 1800,
          duration_ms: 2000,
          sfx: 's0_02_sfx_paper_rustle',
          image: INSERT(5),
          fade_ms: 250,
        },
      ],
    },
    {
      step: 4,
      beat_id: 'beat_4',
      agent: 'viktor',
      text: {
        zh: '「十四号扫尘照常。加一组：纺织厂。」\n「匹兹堡线同步。四十七人名单——哈特在厂里的掩护身份不要惊动。」',
        en: '"The fourteenth sweep proceeds as scheduled. Add one group: the textile factory."\n"Pittsburgh line in sync. Forty-seven names—do not alert Hart to her cover at the mill."',
      },
      duration_ms: 9000,
      standard_image: 'parallels/P02/S-P02-4.jpg',
      mature_image: 'parallels/P02/M-P02-4.webp',
      cut_ins: [
        {
          id: 'I-02-06',
          at_ms: 0,
          duration_ms: 1800,
          sfx: 's0_02_sfx_page_flip',
          image: INSERT(6),
          fade_ms: 250,
        },
        {
          id: 'I-02-07',
          at_ms: 2200,
          duration_ms: 1500,
          sfx: 's0_02_sfx_stamp',
          image: INSERT(7),
          fade_ms: 250,
        },
      ],
    },
    {
      step: 5,
      beat_id: 'beat_5',
      agent: 'narrator',
      text: {
        zh: '十一月十二日。网在收紧。艾米莉还不知道，电话那头究竟是谁。\n\n线路里传来一句低语：「还有两天，哈特夫人。」',
        en: 'November twelfth. The net tightens. Emily still does not know who waits on the other end of the line.\n\nA whisper through the wire: "Two more days, Mrs. Hart."',
      },
      duration_ms: 6000,
      standard_image: 'parallels/P02/S-P02-1.jpg',
      mature_image: 'parallels/P02/M-P02-1.jpg',
      black_hold_ms: 800,
      cut_ins: [
        {
          id: 'I-02-08',
          at_ms: 0,
          duration_ms: 1200,
          sfx: 's0_02_sfx_phone_hangup',
          image: INSERT(8),
          fade_ms: 200,
        },
      ],
    },
  ],
};

/** PA02 appreciation gallery — M-tier archive stills only (no Standard track). */
export const PA02_GALLERY_CELLS = [
  {
    id: 'PA02_stage_1',
    label: {
      zh: '四四七一号案卷封面，「白鸽」字样被红笔圈出。',
      en: 'Dossier 4471 cover—the codename "White Dove" circled in red.',
    },
    matureImage: 'parallels/PA02/M-PA02-1.jpg',
  },
  {
    id: 'PA02_stage_2',
    label: {
      zh: '身份栏：一九九三至一九九七，掩护姓名与入境记录。',
      en: 'Identity sheet: 1993–1997, cover names and entry stamps.',
    },
    matureImage: 'parallels/PA02/M-PA02-2.jpg',
  },
  {
    id: 'PA02_stage_3',
    label: {
      zh: '附件页：历次「体检」时间与地点，笔迹一年比一年冷。',
      en: 'Appendix: dates and sites of each "medical exam," handwriting cooling year by year.',
    },
    matureImage: 'parallels/PA02/M-PA02-3.webp',
  },
  {
    id: 'PA02_stage_4',
    label: {
      zh: '内部扫尘令草案，执行日十一月十四日，匹兹堡线同步。',
      en: 'Internal sweep order draft: execute November 14, Pittsburgh line in sync.',
    },
    matureImage: 'parallels/PA02/M-PA02-4.webp',
  },
] as const;

function mergeStepFromLocal(step: ParallelStepConfig): ParallelStepConfig {
  const local = PARALLEL_S0_02.steps.find((s) => s.step === step.step);
  if (!local) return step;
  return {
    ...step,
    cut_ins: step.cut_ins ?? local.cut_ins,
    black_hold_ms: step.black_hold_ms ?? local.black_hold_ms,
  };
}

/** Map server enter payload steps into local playback config. */
export function parallelPlaybackFromServer(
  payload?: {
    min_seconds?: number;
    skip_if_seen?: boolean;
    ambience?: StoryAudioKey;
    steps?: Array<{
      step: number;
      beat_id?: string;
      agent?: string;
      text?: string;
      text_i18n?: Partial<LocalizedString>;
      duration_ms?: number;
      standard_image?: string;
      mature_image?: string;
      hotspot?: {
        action?: string;
        gallery_id?: string;
        label?: string;
        label_i18n?: Partial<LocalizedString>;
      };
      cut_ins?: ParallelCutInConfig[];
      black_hold_ms?: number;
    }>;
  } | null,
): ParallelPlaybackConfig {
  if (!payload?.steps?.length) {
    return PARALLEL_S0_02;
  }
  return {
    min_seconds: payload.min_seconds ?? PARALLEL_S0_02.min_seconds,
    skip_if_seen: payload.skip_if_seen,
    ambience: payload.ambience ?? PARALLEL_S0_02.ambience,
    steps: payload.steps.map((s) =>
      mergeStepFromLocal({
        step: s.step,
        beat_id: s.beat_id,
        agent: s.agent,
        text: s.text_i18n ? { ...s.text_i18n, zh: s.text_i18n.zh ?? s.text ?? '', en: s.text_i18n.en ?? s.text ?? '' } : (s.text ? { zh: s.text, en: s.text } : undefined),
        duration_ms: s.duration_ms && s.duration_ms > 0 ? s.duration_ms : 3000,
        standard_image: s.standard_image,
        mature_image: s.mature_image,
        cut_ins: s.cut_ins,
        black_hold_ms: s.black_hold_ms,
        hotspot: s.hotspot?.action
          ? {
              action: s.hotspot.action,
              gallery_id: s.hotspot.gallery_id ?? 'PA02',
              label:
                s.hotspot.label_i18n
                  ? { ...s.hotspot.label_i18n, zh: s.hotspot.label_i18n.zh ?? s.hotspot.label ?? '', en: s.hotspot.label_i18n.en ?? s.hotspot.label ?? '' }
                  : (s.hotspot.label ? { zh: s.hotspot.label, en: s.hotspot.label } : undefined),
            }
          : undefined,
      }),
    ),
  };
}
