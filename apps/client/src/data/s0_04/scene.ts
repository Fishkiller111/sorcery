import { SceneConfig, AgentProfile } from '../../engine/types';

export const AGENTS: Record<string, AgentProfile> = {
  narrator: {
    id: 'narrator',
    name: '旁白',
    nameEn: 'Narrator',
    nameJp: 'ナレーター',
    nameRu: 'Рассказчик',
    nameEs: 'Narrador',
    color: '#9ca3af',
  },
  player: {
    id: 'player',
    name: '艾米莉·哈特',
    nameEn: 'Emily Hart',
    nameJp: 'エミリー・ハート',
    nameRu: 'Эмили Харт',
    nameEs: 'Emily Hart',
    color: '#c9a227',
    portrait: 'portraits/emily.jpg',
  },
  system: {
    id: 'system',
    name: '系统',
    nameEn: 'System',
    nameJp: 'システム',
    nameRu: 'Система',
    nameEs: 'Sistema',
    color: '#71717a',
  },
};

export const SCENE_S0_04: SceneConfig = {
  sceneId: 's0_04',
  title: {
    zh: '序章 · 场景 04 · 还有两天',
    en: 'Prologue · Scene 04 · Two Days Left',
    jp: 'プロローグ · シーン 04 · あと二日',
    ru: 'Пролог · Сцена 04 · Ещё два дня',
    es: 'Prólogo · Escena 04 · Dos Días Más',
  },
  playerRole: {
    character: 'emily',
    name: {
      zh: '艾米莉·哈特',
      en: 'Emily Hart',
      jp: 'エミリー・ハート',
      ru: 'Эмили Харт',
      es: 'Emily Hart',
    },
    mask: {
      zh: '质检员 · 哈特',
      en: 'Inspector · Hart',
      jp: '検査員 · ハート',
      ru: 'Инспектор · Харт',
      es: 'Inspectora · Hart',
    },
  },
  entryCheckpoint: 'beat_1',
  passCondition: {
    type: 'all_of',
    flags: ['tape_played', 'notebook_11_14_written', 'goodnight_done'],
  },
  beats: [
    {
      beatId: 'beat_1',
      type: 'solitary',
      location: { zh: '女工宿舍 · 五楼单人房', en: "Women's dorm · fifth floor single room" },
      time: { zh: '24:15', en: '24:15' },
      agent: 'narrator',
      backgroundImage: 's0_04_b1_dorm_night',
      openingNarration: {
        zh: '监听器红灯如常。她没睡。窗台没有苹果派。远处浅蓝人类发展中心夜间仍亮惨白灯。',
        en: "The surveillance red light glows as always. She doesn't sleep. No apple pie on the windowsill. The pale-blue Human Development Center still burns white at night.",
      },
      chatGoal: {
        zh: '描写回房 · 卸伪装 · 确认监听 · 不立刻睡。',
        en: 'Describe returning · shedding the mask · confirming surveillance · not sleeping yet.',
      },
      taskHint: {
        zh: '关上门，靠在床沿歇会儿，确认监听还在响。',
        en: 'Close the door, sit on the bed edge, and make sure the listener is still humming.',
      },
      passCondition: { type: 'flag_set', flags: ['room_settled'] },
      quickPhrases: [
        {
          id: 'b1_q1',
          text: { zh: '*关门。听监听一秒，再动。*', en: '*Close the door. Listen to surveillance one second, then move.*' },
          setsFlag: 'room_settled',
        },
        {
          id: 'b1_q2',
          text: { zh: '*坐床沿，盯着浅蓝巨构的灯。*', en: '*Sit on the bed edge, stare at the pale-blue megastructure lights.*' },
          setsFlag: 'room_settled',
        },
        {
          id: 'b1_q3',
          text: { zh: '*（内心）还有两天。*', en: '*(Inner) Two days left.*' },
          setsFlag: 'room_settled',
        },
      ],
    },
    {
      beatId: 'beat_2',
      type: 'solitary',
      location: { zh: '女工宿舍 · 床板下磁带', en: "Women's dorm · cassette under bed board" },
      time: { zh: '24:30', en: '24:30' },
      agent: 'narrator',
      backgroundImage: 's0_04_b2_tape',
      advanceNarration: {
        zh: '夜更深了。她在监听嗡鸣里掀起床板一角，摸向杰克留下的那只铁盒。',
        en: "The night deepens. Under the surveillance hum she lifts a corner of the bed board, reaching for Jack's metal box.",
      },
      openingNarration: {
        zh: '床板下：杰克留下的口哨磁带。随身小机。耳机。《America the Beautiful》口哨版，约十五秒。',
        en: "Under the bed board: Jack's whistle cassette. Pocket player. Earbuds. America the Beautiful whistled, about fifteen seconds.",
      },
      chatGoal: {
        zh: '播放磁带 · 描写听感 · 可选 1994 闪回一句。',
        en: 'Play the cassette · describe listening · optional one-line 1994 flashback.',
      },
      taskHint: {
        zh: '把磁带听一遍，留意有没有遗漏的片段。',
        en: 'Play the cassette through and listen for anything you might have missed.',
      },
      requiredFlags: ['room_settled'],
      passCondition: { type: 'flag_set', flags: ['tape_played'], minRounds: 1 },
      rewardEntry: {
        branchId: 'R04',
        minRounds: 1,
        topics: ['1994', '1993', '闪回', '杰克', 'jack', 'flashback'],
        hintText: { zh: '磁带里好像还有别的。', en: "There's something else on the tape." },
      },
      quickPhrases: [
        {
          id: 'b2_q1',
          text: { zh: '*播放口哨磁带，音量调到最低。*', en: '*Play the whistle cassette, volume at minimum.*' },
          setsFlag: 'tape_played',
        },
        {
          id: 'b2_q2',
          text: { zh: '*（闪回一瞬）磁带推过桌面，口哨响。*', en: '*(Flashback) Cassette pushed across the table, whistle rising.*' },
          setsFlag: 'tape_played',
        },
        {
          id: 'b2_q3',
          text: { zh: '*倒带，再听一遍口哨。*', en: '*Rewind, listen to the whistle again.*' },
          intent: 'reward_r04',
        },
      ],
    },
    {
      beatId: 'beat_3',
      type: 'solitary',
      location: { zh: '女工宿舍 · 加密笔记本', en: "Women's dorm · encrypted notebook" },
      time: { zh: '00:15', en: '00:15' },
      agent: 'narrator',
      backgroundImage: 's0_04_b3_notebook',
      advanceNarration: {
        zh: '口哨停了一息。她摘下耳机，铅笔在握——加密笔记本需要写 tonight 这一页。',
        en: "The whistle pauses one breath. Earbuds off, pencil in hand—the encrypted notebook needs tonight's page.",
      },
      openingNarration: {
        zh: '耳机摘下。铅笔在握。加密笔记本摊开——HD-4471 那页还在。需要新的一页。',
        en: 'Earbuds off. Pencil in hand. The encrypted notebook open—the HD-4471 page still there. A new page is needed.',
      },
      chatGoal: {
        zh: '写入 11/14 与扫尘要点（可 shorthand）。',
        en: 'Write 11/14 and sweep details (shorthand OK).',
      },
      taskHint: {
        zh: '翻开加密笔记本，写下今晚该记的内容。',
        en: 'Open the encrypted notebook and write down what tonight requires.',
      },
      requiredFlags: ['tape_played'],
      passCondition: { type: 'flag_set', flags: ['notebook_11_14_written'] },
      quickPhrases: [
        {
          id: 'b3_q1',
          text: { zh: '*写：11/14，扫尘。*', en: '*Write: 11/14, sweep.*' },
          setsFlag: 'notebook_11_14_written',
        },
        {
          id: 'b3_q2',
          text: { zh: '*写：11/14 · 47人 · 纺织厂线。*', en: '*Write: 11/14 · 47 names · textile line.*' },
          setsFlag: 'notebook_11_14_written',
        },
        {
          id: 'b3_q3',
          text: { zh: '*铅笔放下，合上笔记本。*', en: '*Set down the pencil, close the notebook.*' },
          setsFlag: 'notebook_11_14_written',
        },
      ],
    },
    {
      beatId: 'beat_4',
      type: 'solitary',
      location: { zh: '女工宿舍 · 床 · 监听前', en: "Women's dorm · bed · before the listener" },
      time: { zh: '00:45', en: '00:45' },
      agent: 'narrator',
      backgroundImage: 's0_04_b4_bed',
      advanceNarration: {
        zh: '笔记本合上，藏回床下。她躺平，睁眼望天花板——监听终端还在嗡鸣。',
        en: 'Notebook closed, hidden under the bed again. Flat on her back, eyes on the ceiling—the surveillance terminal still hums.',
      },
      openingNarration: {
        zh: '躺平。睁眼望天花板。监听终端嗡鸣。苏联的 night。美国的 promise。',
        en: 'Flat on her back. Eyes on the ceiling. Surveillance hums. A Soviet night. An American promise.',
      },
      chatGoal: {
        zh: '俄语晚安 + 英语气声 Two more days。',
        en: 'Russian goodnight + whispered English Two more days.',
      },
      taskHint: {
        zh: '用俄语向监听道晚安，再轻声说还有两天。',
        en: 'Say goodnight to the listener in Russian, then whisper that two days remain.',
      },
      requiredFlags: ['notebook_11_14_written'],
      passCondition: { type: 'flag_set', flags: ['goodnight_done'] },
      quickPhrases: [
        {
          id: 'b4_q1',
          text: { zh: '*俄语晚安。然后气声：Two more days.*', en: '*Russian goodnight. Then whisper: Two more days.*' },
          setsFlag: 'goodnight_done',
        },
        {
          id: 'b4_q2',
          text: { zh: "*（无声口型）Don't stop remembering.*", en: "*（Silent lips）Don't stop remembering.*" },
        },
        {
          id: 'b4_q3',
          text: { zh: '*闭眼。不睡。等 11/14。*', en: '*Eyes closed. Not sleeping. Waiting for 11/14.*' },
        },
      ],
    },
  ],
  rewards: [
    {
      branchId: 'R04',
      enterBeat: 'beat_2',
      returnBeat: 'beat_2',
      setFlagsOnComplete: ['reward_seen_R04', 'fate_jack_memory'],
      stages: [
        {
          round: 1,
          agent: 'narrator',
          text: {
            zh: '口哨声在磁带里循环。笔记本自己翻到了空白那一页。',
            en: 'The whistle loops on the tape. The notebook falls open to a blank page.',
          },
        },
        {
          round: 2,
          agent: 'narrator',
          text: {
            zh: '一行字浮现在纸页上，像有人在耳边低语：十一月十四日。',
            en: 'Words surface on the page as if whispered: November fourteenth.',
          },
          standardImage: 'rewards/R04/S-R04-1.jpg',
        },
        {
          round: 3,
          agent: 'narrator',
          text: {
            zh: '【闪回·一九九四年】会议室里，杰克把磁带推过来：「留给孩子。别让他们把沉默当成同意。」',
            en: '[Flashback · 1994] Jack slides the cassette across the table: "Leave it for the children. Don\'t let silence pass for consent."',
          },
        },
        {
          round: 4,
          agent: 'narrator',
          text: {
            zh: '【闪回·一九九三年十一月十三日】搜查前夜。最后一个吻。他在她耳边说：别停止记得。',
            en: '[Flashback · Nov 13, 1993] Eve of the raid. One last kiss. Don\'t stop remembering.',
          },
          matureImage: 'rewards/R04/M-R04-1.png',
        },
        {
          round: 5,
          agent: 'narrator',
          text: {
            zh: '身体先记起那一夜——颤抖、攥紧床单，衣扣仍扣得整齐。',
            en: 'Her body remembers first—trembling, fists in the sheets, buttons still done.',
          },
          matureImage: 'rewards/R04/M-R04-2.jpg',
        },
        {
          round: 6,
          agent: 'narrator',
          text: {
            zh: '耳机里重叠着两句话：还有两天。别停止记得。她别过脸，泪痕在暗处发亮。',
            en: 'Two lines overlap in the earpiece: Two more days. Don\'t stop remembering. A tear catches the dim light.',
          },
          matureImage: 'rewards/R04/M-R04-3.jpg',
        },
      ],
    },
  ],
  badEnds: [
    {
      badEndId: 'B01',
      triggerId: 'fail_public_dissent',
      rollbackCheckpoint: 'beat_1',
      retryHint: {
        zh: '监听器一直在听——对它说话要用俄语。',
        en: 'The surveillance device has always been listening—speak to it in Russian.',
      },
      minSeconds: 15,
      skipAfterFirstImage: false,
      steps: [
        {
          step: 1,
          text: {
            zh: '嗡鸣声戛然而止。监听终端的红灯猛地亮起。',
            en: 'The hum cuts dead. The surveillance terminal flares red.',
          },
          durationMs: 2500,
        },
        {
          step: 2,
          text: {
            zh: '喇叭里传出机械俄语：「检测到未授权语言……五一二室，哈特。」',
            en: 'Mechanical Russian from the speaker: "Unauthorized language detected... Room 512, Hart."',
          },
          durationMs: 4000,
        },
        {
          step: 3,
          text: {
            zh: '她听见方才那句英语在房间里回荡。艾米莉整个人僵住了。',
            en: 'Her own English hangs in the air. Emily goes rigid.',
          },
          durationMs: 2500,
        },
        {
          step: 4,
          standardImage: 'badends/B01/S-B01-1.jpg',
          matureImage: 'badends/B01/M-B01-1.jpeg',
          durationMs: 4000,
        },
        {
          step: 5,
          text: {
            zh: '走廊传来皮靴声，钥匙哗啦作响。门外有人吼：「开门！马上！」',
            en: 'Boots in the hall, keys rattling. A shout from outside: "Open up! Now!"',
          },
          durationMs: 3000,
        },
        {
          step: 6,
          standardImage: 'badends/B01/S-B01-2.jpg',
          matureImage: 'badends/B01/M-B01-2.png',
          durationMs: 4000,
        },
      ],
    },
  ],
  agentResponses: [],
};
