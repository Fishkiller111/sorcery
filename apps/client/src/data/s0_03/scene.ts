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
  lucy: {
    id: 'lucy',
    name: '露西·小自由',
    nameEn: 'Lucy "Little Liberty"',
    nameJp: 'ルーシー',
    nameRu: 'Люси',
    nameEs: 'Lucy',
    color: '#7eb8da',
  },
  old_bell: {
    id: 'old_bell',
    name: '沃尔特·老钟',
    nameEn: 'Walter "Old Zhong"',
    nameJp: '老鐘',
    nameRu: 'Старый Чжун',
    nameEs: 'Viejo Zhong',
    color: '#8b7355',
  },
  anna: {
    id: 'anna',
    name: '安娜·彼得罗娃',
    nameEn: 'Anna Petrova',
    nameJp: 'アンナ',
    nameRu: 'Анна Петрова',
    nameEs: 'Anna Petrova',
    color: '#5c6b8a',
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

export const SCENE_S0_03: SceneConfig = {
  sceneId: 's0_03',
  title: {
    zh: '序章 · 场景 03 · 通风口下',
    en: 'Prologue · Scene 03 · Under the Vent',
    jp: 'プロローグ · シーン 03 · 通風口の下',
    ru: 'Пролог · Сцена 03 · Под решёткой',
    es: 'Prólogo · Escena 03 · Bajo la Rejilla',
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
    flags: ['tunnel_entered', 'sweep_list_received', 'recording_half_done'],
  },
  beats: [
    {
      beatId: 'beat_1',
      type: 'solitary',
      location: { zh: '纺织厂废弃通风管道', en: 'Abandoned factory ventilation duct' },
      time: { zh: '22:30', en: '22:30' },
      agent: 'narrator',
      backgroundImage: 's0_03_b1_duct',
      openingNarration: {
        zh: '手电筒微光。金属管道回响。尽头铁门紧闭——暗号：三长两短。门后一片静，尚无人应答。',
        en: 'Flashlight glimmer. Metal duct echoes. The iron door stays shut—the signal is three long, two short. Silence behind the door.',
      },
      chatGoal: {
        zh: '先以三长两短叩门 · 再跟随露西进入地下。',
        en: 'Knock three long, two short first · then follow Lucy underground.',
      },
      taskHint: {
        zh: '第三根立柱后的格栅——用「三长两短」叩开铁门。',
        en: 'The grille behind the third pillar — knock three long, two short.',
      },
      passCondition: { type: 'flag_set', flags: ['tunnel_entered'] },
      quickPhrases: [
        {
          id: 'b1_q1',
          text: { zh: '*三长两短，轻叩铁门。*', en: '*Three long, two short — knock on the iron door.*' },
          intent: 'tunnel_enter',
          setsFlag: 'tunnel_entered',
        },
        {
          id: 'b1_q2',
          text: {
            zh: '*三长两短。门开一线，跟着露西，脚步放轻。*',
            en: '*Three long, two short. Door cracks open — follow Lucy, light steps.*',
          },
          intent: 'tunnel_enter',
          setsFlag: 'tunnel_entered',
        },
        {
          id: 'b1_q3',
          text: {
            zh: '*（内心）和白天格栅是同一根柱子后面——先叩暗号。*',
            en: '*(Inner) Same pillar as the daytime grille — knock the signal first.*',
          },
        },
      ],
    },
    {
      beatId: 'beat_2',
      type: 'dialogue',
      location: { zh: '地下联络点主室', en: 'Underground contact main room' },
      time: { zh: '22:35', en: '22:35' },
      agent: 'lucy',
      agentsPresent: ['lucy', 'old_bell'],
      backgroundImage: 's0_03_b2_main',
      openingNarration: {
        zh: '露西：Em 姐。路线干净。我上午送了空信，没出事。\n老钟：还有四十分钟窗口。十五号升级——今晚可能是最后一次正常播出。',
        en: "Lucy: Em. Route's clean. Empty letter this morning, no trouble.\nOld Zhong: Forty minutes left. Upgrade on the 15th — last normal broadcast tonight.",
      },
      chatGoal: {
        zh: '与露西、老钟各聊 ≥2 轮 · 确认空信 · 窗口/录音意向。',
        en: '≥2 rounds each with Lucy and Old Zhong · confirm empty letter · window/recording.',
      },
      taskHint: {
        zh: '露西和老钟都要聊——空信、窗口，各问两轮再往下走。',
        en: 'Talk to both Lucy and Old Zhong — empty letter and window, two rounds each before moving on.',
      },
      requiredFlags: ['tunnel_entered'],
      passCondition: {
        type: 'all_of',
        flags: ['lucy_briefed', 'old_bell_briefed'],
        minRounds: 4,
      },
      advanceNarration: {
        zh: '铁门开一线。露西引路沿旋梯向下。短波机绿光亮起——地下联络点主室。',
        en: 'The iron door opens a crack. Lucy leads you down the spiral stairs. Shortwave green light glows — the underground contact main room.',
      },
      quickPhrases: [
        {
          id: 'b2_q1',
          text: { zh: '「上午的空信——没人跟踪？」', en: '"The empty letter — no tail?"' },
          setsFlag: 'lucy_chat_1',
        },
        {
          id: 'b2_q2',
          text: { zh: '*对老钟：*「窗口够录半段吗？」', en: '*To Old Zhong:* "Enough window for half a segment?"' },
          setsFlag: 'old_bell_chat_1',
        },
        {
          id: 'b2_q3',
          text: {
            zh: '*蹲下对露西：*「是能叫大家还记得的钟。」',
            en: '*Crouching to Lucy:* "A bell that makes people remember."',
          },
          setsFlag: 'lucy_chat_1',
        },
      ],
    },
    {
      beatId: 'beat_3',
      type: 'dialogue',
      location: { zh: '地下联络点侧室', en: 'Underground side room' },
      time: { zh: '23:05', en: '23:05' },
      agent: 'anna',
      backgroundImage: 's0_03_b3_side',
      advanceNarration: {
        zh: '老钟颔首示意。侧门滑开——侧室只一盏灯泡，安娜已在门槛处。',
        en: 'Old Zhong nods. The side door slides open — one bulb in the side room, Anna already at the threshold.',
      },
      openingNarration: {
        zh: '安娜进入。名单。四十七人。扫尘——11月14日。\n（递中空钢笔，笔芯内 microfilm）',
        en: 'Anna enters. The list. Forty-seven names. Dust Sweep — November 14th.\n(Hollow pen, microfilm inside.)',
      },
      chatGoal: {
        zh: '接收名单 · 阅 microfilm · 听活捉警告 · 让安娜离开。',
        en: 'Receive list · read microfilm · hear live-capture warning · let Anna leave.',
      },
      taskHint: {
        zh: '她待不了太久——先接过名单，再决定要不要追问她的话。',
        en: "She won't stay long — take the list first, then decide whether to press her further.",
      },
      requiredFlags: ['tunnel_entered'],
      passCondition: { type: 'flag_set', flags: ['sweep_list_received'], minRounds: 2 },
      rewardEntry: {
        branchId: 'R06',
        minRounds: 2,
        topics: ['T.Hart', '7号井', '转移', '档案'],
        hintText: { zh: '胶片里还有一行。', en: "There's one more line on the film." },
      },
      quickPhrases: [
        {
          id: 'b3_q1',
          text: { zh: '*展开 microfilm，快速扫名单。*', en: '*Unroll microfilm, scan the list.*' },
          setsFlag: 'sweep_list_received',
        },
        {
          id: 'b3_q2',
          text: { zh: '「十四号……和杰克忌日同一天。」', en: '"The fourteenth… same day as Jack\'s anniversary."' },
          setsFlag: 'sweep_list_received',
        },
        {
          id: 'b3_q3',
          text: { zh: '*收起胶片，不追问她去向。*', en: "*Put the film away, don't ask where she's going.*" },
          setsFlag: 'sweep_list_received',
        },
        {
          id: 'b3_r1',
          text: { zh: '「T. Hart——转移日期是什么？」', en: '"T. Hart — what\'s the transfer date?"' },
          rewardHint: true,
        },
        {
          id: 'b3_r2',
          text: { zh: '*指 microfilm：*「7号井这条，谁批的？」', en: '*Pointing at film:* "Shaft seven — who signed this?"' },
          rewardHint: true,
        },
      ],
      failTriggers: [
        {
          id: 'fail_anna_overstep',
          keywords: [
            '你是钩子',
            '你是卧底',
            'traitor',
            'mole',
            '你出卖',
            '你爸伊万',
            '合作者女儿',
            '你母亲的死是你',
            '抓住她',
            '不让走',
            '撕名单',
          ],
        },
      ],
    },
    {
      beatId: 'beat_4',
      type: 'solitary',
      location: { zh: '地下联络点主室 · 录音', en: 'Main room · recording' },
      time: { zh: '23:40', en: '23:40' },
      agent: 'old_bell',
      backgroundImage: 's0_03_b4_mic',
      advanceNarration: {
        zh: '安娜离开。主室灯调暗。老钟挂上变声器，麦克风红灯亮起。',
        en: 'Anna leaves. Main room lights dim. Old Zhong hooks up the voice changer; the microphone red light comes on.',
      },
      openingNarration: {
        zh: '老钟打「录音中」手势。变声器。麦克风红灯。',
        en: 'Old Zhong signals recording. Voice changer. Microphone red light.',
      },
      chatGoal: {
        zh: '英语念半段稿 · 收在 We are still here · 推杆发送。',
        en: 'English half-segment · end on We are still here · push transmit.',
      },
      taskHint: {
        zh: '半段英语稿念完，最后一句要压低声音。',
        en: 'Read half the script in English — drop your voice on the final line.',
      },
      requiredFlags: ['sweep_list_received'],
      passCondition: { type: 'flag_set', flags: ['recording_half_done'] },
      quickPhrases: [
        {
          id: 'b4_q1',
          text: {
            zh: '*戴变声器，英语，最后一句压低：* **We are still here.**',
            en: '*Voice changer on, English, last line low:* **We are still here.**',
          },
          setsFlag: 'recording_half_done',
        },
        {
          id: 'b4_q2',
          text: { zh: '*看老钟点头，推杆。*', en: '*Old Zhong nods — push the lever.*' },
          setsFlag: 'recording_half_done',
        },
        {
          id: 'b4_q3',
          text: {
            zh: '*摘变声器，对露西：*「在这里，叫我 Em 姐。」',
            en: '*Remove changer, to Lucy:* "Here, call me Em."',
          },
          setsFlag: 'recording_half_done',
        },
      ],
    },
    {
      beatId: 'beat_5',
      type: 'solitary',
      location: { zh: '通风管道 → 女工宿舍', en: 'Vent duct → dormitory' },
      time: { zh: '23:55', en: '23:55' },
      agent: 'narrator',
      backgroundImage: 's0_03_b5_exit',
      advanceNarration: {
        zh: '推杆落下，半段电波已去。老钟示意原路撤回通风管道。',
        en: 'The transmit lever falls; half the broadcast is out. Old Zhong signals back through the vent duct.',
      },
      openingNarration: {
        zh: '原路返回。管道更冷。楼上监听器还在等顺从的质检员回家。',
        en: 'Return the same way. Colder duct. Upstairs, surveillance still waits for a compliant inspector.',
      },
      chatGoal: {
        zh: '描写离场 · 一句内心（还有两天 · 11/14 扫尘）。',
        en: 'Describe exit · one inner thought (two days left · 11/14 sweep).',
      },
      taskHint: {
        zh: '钻回格栅，把工装帽压低——别在走廊停太久。',
        en: 'Back through the grille, cap pulled low — don\'t linger in the corridor.',
      },
      requiredFlags: ['recording_half_done'],
      passCondition: { type: 'flag_set', flags: ['exit_done'] },
      quickPhrases: [
        {
          id: 'b5_q1',
          text: { zh: '*沿原路回宿舍。脚步放轻。*', en: '*Back to the dorm. Light steps.*' },
          setsFlag: 'exit_done',
        },
        {
          id: 'b5_q2',
          text: {
            zh: '*（内心）还有两天。杰克忌日那天，他们会扫尘。*',
            en: '*(Inner) Two days left. On Jack\'s anniversary, they sweep.*',
          },
          setsFlag: 'exit_done',
        },
        {
          id: 'b5_q3',
          text: { zh: '*路过白天那道格栅，不停留。*', en: '*Pass the daytime grille without stopping.*' },
          setsFlag: 'exit_done',
        },
      ],
    },
  ],
  rewards: [
    {
      branchId: 'R06',
      enterBeat: 'beat_3',
      returnBeat: 'beat_3',
      setFlagsOnComplete: ['reward_seen_R06', 'fate_tom_lead'],
      stages: [
        {
          round: 1,
          agent: 'anna',
          text: {
            zh: '安娜在门槛停住。钢笔帽轻轻咔哒一声。',
            en: 'Anna stops at the threshold. The pen cap clicks shut.',
          },
        },
        {
          round: 2,
          agent: 'anna',
          text: {
            zh: '她只吐出三个字：「七号井。」其余字句一概不写。',
            en: 'Three words only: "Shaft seven." Nothing else goes on paper.',
          },
          standardImage: 'rewards/R06/S-R06-1.jpg',
          matureImage: 'rewards/R06/M-R06-1.jpg',
        },
        {
          round: 3,
          agent: 'anna',
          text: {
            zh: '「你一旦看过，就再也装不回质检员。」话说完，她仍要转身离开。',
            en: '"Once you\'ve read it, you can\'t play inspector again." She still turns to go.',
          },
        },
        {
          round: 4,
          agent: 'anna',
          text: {
            zh: '安娜的手在抖，眼眶红了，却倔强地别过脸：「不是我放进去的……是我拦不住。」',
            en: 'Her hands shake; tears brim but she looks away. "I didn\'t put it there... I couldn\'t stop them."',
          },
          matureImage: 'rewards/R06/M-R06-2.jpg',
        },
        {
          round: 5,
          agent: 'narrator',
          text: {
            zh: '镜头切至档案一角——汤姆的工牌照片一闪而过，批次号写着七号井。',
            en: 'A corner of the file: Tom\'s ID photo flashes past—batch marked Shaft seven.',
          },
          matureImage: 'rewards/R06/M-R06-3.jpg',
        },
      ],
    },
  ],
  badEnds: [
    {
      badEndId: 'B03',
      triggerId: 'fail_anna_overstep',
      rollbackCheckpoint: 'beat_1',
      retryHint: {
        zh: '安娜只停九十秒——别逼她在你不该知道的事上选边。',
        en: "Anna won't stay ninety seconds — don't force her to choose on things you shouldn't know yet.",
      },
      minSeconds: 15,
      skipAfterFirstImage: false,
      steps: [
        {
          step: 1,
          text: {
            zh: '安娜退进侧室暗影，像被什么蜇到了。',
            en: 'Anna slips back into the side room, stung.',
          },
          durationMs: 2500,
          sfx: 's0_03_b03_sfx_steps_back',
          standardImage: 'badends/B03/S-B03-1.jpg',
          matureImage: 'badends/B03/M-B03-1.jpg',
        },
        {
          step: 2,
          text: {
            zh: '她把名单撕成两半，微缩胶片撒了一桌。纸屑像雪一样落下来。',
            en: 'She tears the list in two; microfilm scatters across the table like snow.',
          },
          durationMs: 3000,
          sfx: 's0_03_b03_sfx_paper_rip',
          standardImage: 'badends/B03/S-B03-2.jpg',
          matureImage: 'badends/B03/M-B03-2.png',
        },
        {
          step: 3,
          text: {
            zh: '露西扑上来挡在中间。安娜抬脚，踩碎了最后一块胶片。',
            en: 'Lucy throws herself between them. Anna lifts her heel—and crushes the last strip of film.',
          },
          durationMs: 3000,
          matureSfx: 's0_03_b03_sfx_film_crush',
          matureImage: 'badends/B03/M-B03-3.jpg',
        },
        {
          step: 4,
          text: {
            zh: '老钟关上了麦克风。短波台里，只剩下一片沙沙的静噪。',
            en: 'Old Zhong kills the mic. Nothing left on the radio but static.',
          },
          durationMs: 3500,
          sfx: 's0_03_b03_sfx_radio_kill',
          insertImage: 'scenes/s0_03/inserts/I-B03-03.jpg',
        },
      ],
    },
  ],
  agentResponses: [
    {
      beatId: 'beat_1',
      agent: 'narrator',
      keywords: ['三长两短', '暗号', 'vent', 'grille'],
      text: { zh: '门开一线。露西探头：「路线干净。」', en: 'Door cracks open. Lucy: "Route\'s clean."' },
    },
    {
      beatId: 'beat_2',
      agent: 'lucy',
      keywords: ['空信', 'empty letter'],
      text: { zh: '「他们没跟。」', en: '"No tail."' },
    },
    {
      beatId: 'beat_2',
      agent: 'old_bell',
      keywords: ['窗口', '录音', 'window', 'recording'],
      text: { zh: '「麦等你。」', en: '"Mic\'s ready."' },
    },
    {
      beatId: 'beat_3',
      agent: 'anna',
      keywords: ['microfilm', '名单', '11/14', 'sweep'],
      text: {
        zh: '维克多亲自批的。他在找你。不是杀。是活捉。',
        en: "Viktor signed it himself. He's hunting you. Not to kill. To capture alive.",
      },
    },
    {
      beatId: 'beat_4',
      agent: 'old_bell',
      keywords: ['we are still here', 'recording'],
      text: { zh: '推杆。信号出。', en: 'Lever pushed. Signal out.' },
    },
    {
      beatId: 'beat_5',
      agent: 'narrator',
      keywords: [],
      text: {
        zh: '艾米莉回到宿舍区。监听器红灯如常。',
        en: 'Emily returns to the dormitory block. Surveillance red light as usual.',
      },
    },
  ],
};
