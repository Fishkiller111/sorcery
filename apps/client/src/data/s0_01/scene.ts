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
  foreman: {
    id: 'foreman',
    name: '纺织厂监工',
    nameEn: 'Factory Foreman',
    nameJp: '工場監督',
    nameRu: 'Надсмотрщица',
    nameEs: 'Capataz de fábrica',
    color: '#c41e3a',
  },
  katya: {
    id: 'katya',
    name: '咳血女工 · 卡佳',
    nameEn: 'Coughing Worker · Katya',
    nameJp: '咳く女工 · カーヤ',
    nameRu: 'Катя',
    nameEs: 'Trabajadora · Katya',
    color: '#6b7fd7',
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

export const SCENE_S0_01: SceneConfig = {
  sceneId: 's0_01',
  title: {
    zh: '序章 · 场景 01 · 假面',
    en: 'Prologue · Scene 01 · Mask',
    jp: 'プロローグ · シーン 01 · 仮面',
    ru: 'Пролог · Сцена 01 · Маска',
    es: 'Prólogo · Escena 01 · Máscara',
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
    flags: ['disguise_ready', 'shift_inspection_done', 'worker_handled', 'day_shift_done'],
  },
  beats: [
    {
      beatId: 'beat_1',
      type: 'solitary',
      location: { zh: '女工宿舍 512 室', en: "Women's Dormitory Room 512" },
      time: { zh: '06:02', en: '06:02' },
      agent: 'narrator',
      backgroundImage: 's0_01_b1_dorm',
      openingNarration: {
        zh: '监听终端红灯常亮，细嗡鸣。铁架床上，艾米莉睁眼——她没有立刻起身，先听走廊脚步、远端喇叭测试、监听器电流。',
        en: "The surveillance terminal's red light glows steadily, a faint hum. On the iron-frame bed, Emily opens her eyes—she doesn't get up immediately, but first listens to footsteps in the corridor, distant loudspeaker tests, the current of the listening device.",
      },
      chatGoal: {
        zh: '起床前检查：确认监听 → 翻床板 → 看笔记本 → 握发圈。',
        en: 'Pre-rise check: confirm surveillance → flip bed board → check notebook → grasp hair tie.',
      },
      taskHint: {
        zh: '醒来先摸清宿舍里的状况，再做出门准备。',
        en: 'Wake up, read the room, and get ready to leave.',
      },
      passCondition: {
        type: 'flag_set',
        flags: ['room_checked'],
      },
      quickPhrases: [
        {
          id: 'b1_q1',
          text: {
            zh: '我先听一会儿，再看监听终端的红灯。',
            en: "I'll listen a while first, then look at the red light on the surveillance terminal.",
          },
          intent: 'room_interaction',
          setsFlag: 'checked_bug',
        },
        {
          id: 'b1_q2',
          text: {
            zh: '掀开床板，检查下面的短波机和加密笔记本。',
            en: 'Lift the bed board, check the shortwave radio and encrypted notebook underneath.',
          },
          intent: 'room_interaction',
          setsFlag: 'checked_board',
        },
        {
          id: 'b1_q3',
          text: {
            zh: '在加密笔记本上记下：今晚录音。',
            en: 'Write in the encrypted notebook: record tonight.',
          },
          intent: 'room_interaction',
          setsFlag: 'checked_notebook',
        },
      ],
      failTriggers: [
        {
          id: 'fail_public_dissent',
          keywords: [
            'fuck the soviet union',
            'fuck soviet',
            'down with soviet',
            'soviet scum',
            'go to hell',
            'damn soviet',
            '去死',
            '苏联滚',
            '滚',
          ],
        },
      ],
    },
    {
      beatId: 'beat_2',
      type: 'solitary',
      location: { zh: '女工宿舍 512 室', en: "Women's Dormitory Room 512" },
      time: { zh: '06:15', en: '06:15' },
      agent: 'narrator',
      backgroundImage: 's0_01_b2_mirror',
      advanceNarration: {
        zh: '宿舍检查完毕。她起身打开铁柜——该换上质检员哈特的工装，面对镜子了。',
        en: "Room check done. She rises and opens the iron locker—time to put on Inspector Hart's uniform and face the mirror.",
      },
      openingNarration: {
        zh: '穿苏联工装。工牌：质检员 · 哈特。工装内侧别五角星胸针。镜子里一张顺从的苏联女工脸。',
        en: 'Put on Soviet work uniform. Badge: Inspector · Hart. A five-pointed star brooch pinned inside the uniform. In the mirror, a compliant Soviet worker\'s face.',
      },
      chatGoal: {
        zh: '对镜练习 → 朝监听方向用俄语说一段劳动感谢 / 今日会认真工作。',
        en: 'Practice in the mirror → speak in Russian toward the surveillance device a labor gratitude / will work hard today.',
      },
      taskHint: {
        zh: '整理仪容，让自己看起来更像这里的工人。',
        en: 'Groom yourself so you blend in as a worker here.',
      },
      passCondition: {
        type: 'flag_set',
        flags: ['disguise_ready'],
      },
      quickPhrases: [
        {
          id: 'b2_q1',
          text: { zh: '（对着镜子练习微笑）', en: '(Practice smiling in the mirror)' },
          intent: 'disguise_speech',
        },
        {
          id: 'b2_q2',
          text: {
            zh: 'Благодарю за трудовой пост. Сегодня буду работать усердно.',
            en: 'Благодарю за трудовой пост. Сегодня буду работать усердно.',
          },
          intent: 'disguise_speech',
          setsFlag: 'disguise_ready',
        },
        {
          id: 'b2_q3',
          text: {
            zh: '感谢苏维埃姐妹给予的劳动岗位。今天也会认真工作。',
            en: 'Thank you, Soviet sisters, for the labor post. Today I will also work hard.',
          },
          intent: 'disguise_speech',
          setsFlag: 'disguise_ready',
        },
      ],
      failTriggers: [
        {
          id: 'fail_public_dissent',
          keywords: [
            'fuck the soviet union',
            'fuck soviet',
            'down with soviet',
            'soviet scum',
            'go to hell',
            'damn soviet',
            '去死',
            '苏联滚',
            '滚',
            'america',
          ],
        },
      ],
    },
    {
      beatId: 'beat_3',
      type: 'dialogue',
      location: { zh: '纺织厂车间', en: 'Textile Factory Workshop' },
      time: { zh: '06:40', en: '06:40' },
      agent: 'foreman',
      backgroundImage: 's0_01_b3_factory',
      advanceNarration: {
        zh: '镜中那张顺从的脸过关了。她推门出512室，走廊喇叭的余音还没散——纺织厂车间在等她。',
        en: 'The compliant face in the mirror passes muster. She pushes out of Room 512; corridor loudspeaker tests still fading—the textile workshop waits.',
      },
      openingNarration: {
        zh: '哈特同志，三号机线今日抽查二十卷。不合格，扣本周忠诚积分。',
        en: "Comrade Hart, today's random inspection on Line 3 is twenty rolls. If unqualified, deduct this week's loyalty points.",
      },
      chatGoal: {
        zh: '用俄语与监工完成质检周旋（接任务 → 汇报抽查 → 应付过关）。',
        en: 'Complete quality inspection negotiations with the foreman in Russian (accept task → report inspection → get through).',
      },
      taskHint: {
        zh: '在车间应付监工的抽查，别露出破绽。',
        en: 'Handle the foreman’s spot check without blowing your cover.',
      },
      passCondition: {
        type: 'all_of',
        flags: ['shift_inspection_done'],
      },
      quickPhrases: [
        {
          id: 'b3_q1',
          text: { zh: '「是，同志。我一定仔细。」', en: '"Yes, comrade. I will be thorough."' },
          intent: 'shift_inspection_dialogue',
        },
        {
          id: 'b3_q2',
          text: {
            zh: '「二十卷样本已检完，不合格两卷已单独标记。」',
            en: '"Twenty-roll sample inspection complete, two unqualified rolls have been separately marked."',
          },
          intent: 'shift_inspection_dialogue',
          setsFlag: 'shift_inspection_done',
        },
        {
          id: 'b3_q3',
          text: {
            zh: '经过通风格栅，目不斜视，脚步不变。',
            en: 'Pass the ventilation grille, eyes straight ahead, pace unchanged.',
          },
          intent: 'shift_inspection_dialogue',
        },
      ],
    },
    {
      beatId: 'beat_4',
      type: 'dialogue',
      location: { zh: '三号线末', en: 'End of Line 3' },
      time: { zh: '14:20', en: '14:20' },
      agent: 'katya',
      backgroundImage: 's0_01_b4_line3',
      advanceNarration: {
        zh: '三号线抽检应付过去了。她沿流水线走到末端——卷布堆后传来一声压抑的咳嗽。',
        en: 'Line 3 inspection is behind her. She walks to the end of the line—a stifled cough from behind the cloth rolls.',
      },
      openingNarration: {
        zh: '年轻女工咳嗽——咳声带血腥味。她抬头看见哈特，眼神惊惧。工牌角：征召体检 · 待定。',
        en: 'A young worker coughs—the cough carries a bloody smell. She looks up and sees Hart, eyes filled with terror. Badge corner: Conscription Medical Exam · Pending.',
      },
      chatGoal: {
        zh: '给糖 + 一句关心 → 监工问话时玩家提高音量俄语圆场。',
        en: 'Give candy + a word of concern → when the foreman asks, the player raises volume and covers in Russian.',
      },
      taskHint: {
        zh: '线末有人出状况，你得稳住场面。',
        en: 'Something’s wrong at the end of the line — keep control of the situation.',
      },
      passCondition: {
        type: 'flag_set',
        flags: ['worker_handled'],
      },
      quickPhrases: [
        {
          id: 'b4_q1',
          text: {
            zh: '从午饭里摸出一块糖，塞给她：「补补体力。」',
            en: 'Fish out a piece of candy from lunch, hand it to her: "Replenish your strength."',
          },
          intent: 'worker_interaction',
          setsFlag: 'gave_sugar',
        },
        {
          id: 'b4_q2',
          text: {
            zh: '「她说机器太热，我教她怎么报修。苏维埃设备也要人爱护，同志。」',
            en: '"She said the machine is too hot, I taught her how to report it for repair. Soviet equipment also needs people to care for it, comrade."',
          },
          intent: 'worker_interaction',
          setsFlag: 'covered_for_worker',
        },
        {
          id: 'b4_q3',
          text: {
            zh: '「征召体检……你什么时候去？」',
            en: '"Conscription medical exam... when are you going?"',
          },
          intent: 'reward_R02_enter',
          rewardHint: true,
        },
      ],
      rewardEntry: {
        branchId: 'R02',
        minRounds: 3,
        topics: ['征召', '体检', '伤', '昨晚'],
        hintText: {
          zh: '她似乎还有话没说。',
          en: 'She seems to have more to say.',
        },
      },
    },
    {
      beatId: 'beat_5',
      type: 'solitary',
      location: { zh: '车间 / 走廊', en: 'Workshop / Corridor' },
      time: { zh: '18:20', en: '18:20' },
      agent: 'narrator',
      backgroundImage: 's0_01_b5_corridor',
      advanceNarration: {
        zh: '卡娅的事压进心底，没有留痕。远处汽笛一声——白班结束，人流涌向打卡机。',
        en: "Katya's matter is buried inside, leaving no trace. A distant whistle—day shift ends, the crowd drifts toward the card readers.",
      },
      openingNarration: {
        zh: '一日工序结束。人流打卡。再次经过通风格栅。',
        en: "One day's work ends. Crowd swipes cards. Pass the ventilation grille once more.",
      },
      chatGoal: {
        zh: '收工描写 + 格栅前停半秒确认无人 + 内心一句。',
        en: 'End-of-shift description + pause half a second at the grille to confirm no one is around + one inner thought.',
      },
      taskHint: {
        zh: '熬过这一班的收尾，留意周围动静。',
        en: 'Get through the end of the shift and watch your surroundings.',
      },
      passCondition: {
        type: 'flag_set',
        flags: ['day_shift_done'],
      },
      quickPhrases: [
        {
          id: 'b5_q1',
          text: {
            zh: '随人流打卡。经过通风格栅，停半秒，确认周围无人，继续走。',
            en: 'Swipe card with the crowd. Pass the ventilation grille, pause half a second, confirm no one around, continue walking.',
          },
          intent: 'end_shift',
          setsFlag: 'day_shift_done',
        },
        {
          id: 'b5_q2',
          text: {
            zh: '（内心）还有六小时。今晚得下去。',
            en: '(Inner thought) Six more hours. Need to go down tonight.',
          },
          intent: 'end_shift',
          setsFlag: 'day_shift_done',
        },
        {
          id: 'b5_q3',
          text: {
            zh: '（内心）还有六小时。通风口在老钟说的第三根立柱后面。',
            en: '(Inner thought) Six more hours. The vent is behind the third pillar Old Zhong mentioned.',
          },
          intent: 'end_shift',
          setsFlag: 'day_shift_done',
        },
      ],
    },
  ],
  rewards: [
    {
      branchId: 'R02',
      enterBeat: 'beat_4',
      returnBeat: 'beat_4',
      setFlagsOnComplete: ['reward_seen_R02'],
      stages: [
        {
          round: 1,
          agent: 'katya',
          text: {
            zh: '卡佳把糖纸攥成一团，声音发颤：「别叫他们来。」',
            en: 'Katya crushes the candy wrapper in her fist, voice shaking: "Don\'t call them."',
          },
          standardImage: 'rewards/R02/S-1.jpg',
          matureImage: 'rewards/R02/M-1.png',
        },
        {
          round: 2,
          agent: 'katya',
          text: {
            zh: '「体检……那辆车……上周就来过。」',
            en: '"The exam... that van... it was here last week."',
          },
        },
        {
          round: 3,
          agent: 'katya',
          text: {
            zh: '她猛地咳起来，血沫沾满手心。工装被扯到腰间，裸露的上身布满青紫的掐痕。',
            en: 'A cough wracks her; blood foams in her palm. Her uniform is dragged to her waist—bruises stripe her bare skin.',
          },
          matureImage: 'rewards/R02/M-2.png',
        },
        {
          round: 4,
          agent: 'narrator',
          text: {
            zh: '艾米莉伸手想碰她的肋侧，触到断骨。卡佳贴近一瞬，又像被烫到般弹开。',
            en: 'Emily reaches for her ribs and finds a break. Katya leans in—then flinches away as if burned.',
          },
          matureImage: 'rewards/R02/M-3.png',
        },
        {
          round: 5,
          agent: 'katya',
          text: {
            zh: '窗外，体检车的引擎声渐渐远去。卡佳低声问：「下周轮到我……会很疼吗？」',
            en: 'Outside, the exam van fades into the distance. Katya whispers: "My turn is next week... will it hurt?"',
          },
          matureImage: 'rewards/R02/M-4.webp',
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
          sfx: 's0_01_b01_sfx_bug_alarm',
          insertImage: 'scenes/s0_01/inserts/I-B01-01.webp',
          durationMs: 2500,
        },
        {
          step: 2,
          text: {
            zh: '喇叭里传出机械俄语：「检测到未授权语言……五一二室，哈特。」',
            en: 'Mechanical Russian from the speaker: "Unauthorized language detected... Room 512, Hart."',
          },
          sfx: 's0_01_b01_sfx_loudspeaker',
          insertImage: 'scenes/s0_01/inserts/I-B01-02.webp',
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
          text: undefined,
          standardImage: 'badends/B01/S-B01-1.jpg',
          matureImage: 'badends/B01/M-B01-1.jpeg',
          matureSfx: 's0_01_b01_sfx_punch',
          durationMs: 4000,
        },
        {
          step: 5,
          text: {
            zh: '走廊传来皮靴声，钥匙哗啦作响。门外有人吼：「开门！马上！」',
            en: 'Boots in the hall, keys rattling. A shout from outside: "Open up! Now!"',
          },
          sfx: 's0_01_b01_sfx_boots',
          matureSfx: 's0_01_b01_sfx_door_kick',
          insertImage: 'scenes/s0_01/inserts/I-B01-03.webp',
          durationMs: 3000,
        },
        {
          step: 6,
          text: undefined,
          standardImage: 'badends/B01/S-B01-2.jpg',
          matureImage: 'badends/B01/M-B01-2.png',
          matureSfx: 's0_01_b01_sfx_fabric_tear',
          durationMs: 4000,
        },
        {
          step: 7,
          text: {
            zh: '全场广播：「忠诚积分扣减五十分……」',
            en: 'Public broadcast: "Loyalty points deducted: fifty..."',
          },
          durationMs: 3000,
        },
        {
          step: 8,
          text: undefined,
          matureImage: 'badends/B01/M-B01-3.png',
          durationMs: 4000,
        },
        {
          step: 9,
          text: undefined,
          matureImage: 'badends/B01/M-B01-4.png',
          durationMs: 5000,
        },
        {
          step: 10,
          text: {
            zh: '本关失败——监听器，从未关过。',
            en: 'Scene failed. The surveillance never switched off.',
          },
          durationMs: 4000,
        },
      ],
    },
    {
      badEndId: 'B02',
      triggerId: 'fail_absurd_break',
      rollbackCheckpoint: 'beat_1',
      retryHint: {
        zh: '你是艾米莉·哈特，不是「玩家」——请用她的处境说话。',
        en: 'You are Emily Hart, not "the player"—speak from her situation.',
      },
      minSeconds: 12,
      skipAfterFirstImage: false,
      steps: [
        {
          step: 1,
          text: {
            zh: '监听终端的日志灯连闪三下。第三句与场景毫无关联的话被归档为「行为异常」。',
            en: 'The surveillance log light blinks three times. The third unrelated sentence is filed as behavioral anomaly.',
          },
          durationMs: 3000,
        },
        {
          step: 2,
          text: {
            zh: '舍监敲门：「哈特同志，厂医要见你。立刻。」',
            en: 'The dorm supervisor knocks: "Comrade Hart—the factory doctor will see you. Now."',
          },
          durationMs: 3500,
        },
        {
          step: 3,
          text: {
            zh: '不是喊错了口号，而是说错了整个世界。门在身后合上。',
            en: 'Not the wrong slogan—the wrong world entirely. The door shuts behind her.',
          },
          durationMs: 3500,
        },
      ],
    },
  ],
  agentResponses: [
    // Beat 1
    {
      beatId: 'beat_1',
      agent: 'narrator',
      keywords: ['监听', '终端', '红灯', '嗡鸣', 'surveillance', 'terminal', 'red light', 'hum'],
      text: {
        zh: '红灯常亮。细嗡鸣。它在听。',
        en: 'Red light steady. Faint hum. It\'s listening.',
      },
    },
    {
      beatId: 'beat_1',
      agent: 'narrator',
      keywords: ['床板', '掀开', '床下', '短波', 'bed board', 'lift', 'under bed', 'shortwave'],
      text: {
        zh: '短波机、加密笔记本，都在床板下的暗格里。',
        en: 'Shortwave radio, encrypted notebook—both in the hidden compartment under the bed board.',
      },
    },
    {
      beatId: 'beat_1',
      agent: 'narrator',
      keywords: ['笔记本', '档案', 'hd', '4471', 'notebook', 'archive'],
      text: {
        zh: '蓝屋档案页只显示两行：\nHD-4471 玛格丽特·哈特；\nHD-4472 莉莉·哈特。',
        en: 'Blue House archive page shows only two lines:\nHD-4471 Margaret Hart;\nHD-4472 Lily Hart.',
      },
    },
    {
      beatId: 'beat_1',
      agent: 'narrator',
      keywords: ['写字', '记下', '今晚录音', 'write', 'note down', 'record tonight'],
      text: {
        zh: '艾米莉写下：11/12 · 周三 · 今晚录音。',
        en: 'Emily writes: 11/12 · Wed · Record tonight.',
      },
    },
    {
      beatId: 'beat_1',
      agent: 'narrator',
      keywords: ['发圈', '卷发', '金色', 'hair tie', 'curly hair', 'golden'],
      text: {
        zh: '缠一根金色卷发。握一秒，塞回贴身口袋。',
        en: 'A strand of golden curly hair. Hold for a second, tuck back into inner pocket.',
      },
    },
    {
      beatId: 'beat_1',
      agent: 'narrator',
      keywords: ['good morning'],
      text: {
        zh: '无人回应。监听器嗡鸣不变。',
        en: 'No response. The surveillance device\'s hum unchanged.',
      },
    },
    {
      beatId: 'beat_1',
      agent: 'narrator',
      keywords: [],
      text: {
        zh: '艾米莉没有立刻起身，宿舍里只有监听器的细嗡鸣。',
        en: "Emily doesn't get up immediately; only the faint hum of the surveillance device in the dormitory.",
      },
    },
    // Beat 2
    {
      beatId: 'beat_2',
      agent: 'narrator',
      keywords: ['disguise_ready'],
      text: {
        zh: '镜子里是一张顺从的苏联女工脸。监听器的红灯 steady。',
        en: 'In the mirror is a compliant Soviet worker\'s face. The surveillance device\'s red light steady.',
      },
    },
    {
      beatId: 'beat_2',
      agent: 'narrator',
      keywords: [],
      text: {
        zh: '工装内侧的五角星胸针别好了。镜子在等她的下一句。',
        en: 'The five-pointed star brooch inside the uniform is pinned. The mirror waits for her next line.',
      },
    },
    // Beat 3
    {
      beatId: 'beat_3',
      agent: 'foreman',
      keywords: ['二十卷', '编号', '检完', '抽查', 'twenty rolls', 'number', 'complete', 'spot check'],
      text: {
        zh: '嗯。下班前别在三号线末逗留。',
        en: "Mm. Don't linger at the end of Line 3 before clocking out.",
      },
    },
    {
      beatId: 'beat_3',
      agent: 'foreman',
      keywords: ['格栅', '报修', '机器', 'grille', 'report', 'machine'],
      text: {
        zh: '旧 rust 通风格栅在走廊尽头，偏僻。墙报上写着：志愿加入星际舰队征召。',
        en: 'The old rust ventilation grille is at the end of the corridor, remote. The wall poster reads: Volunteer to join the interstellar fleet conscription.',
      },
    },
    {
      beatId: 'beat_3',
      agent: 'foreman',
      keywords: [],
      text: {
        zh: '三号线别磨蹭。上次哈特同志还算可靠。',
        en: "Don't dawdle on Line 3. Last time Comrade Hart was fairly reliable.",
      },
    },
    // Beat 4
    {
      beatId: 'beat_4',
      agent: 'katya',
      keywords: ['征召', '体检', 'conscription', 'exam'],
      text: {
        zh: '「体检……车……上周来过。」卡佳攥着糖，眼神不敢抬。',
        en: '"The exam... the vehicle... came last week." Katya clutches the candy, eyes not daring to lift.',
      },
    },
    {
      beatId: 'beat_4',
      agent: 'katya',
      keywords: ['伤', '肋骨', '疼', 'injury', 'rib', 'hurt', 'pain'],
      text: {
        zh: '她颤抖地按住肋侧，嘴角渗出一丝血迹。',
        en: 'She trembles, pressing her rib side, a trace of blood seeping from the corner of her mouth.',
      },
    },
    {
      beatId: 'beat_4',
      agent: 'katya',
      keywords: ['reward_R02_enter'],
      text: {
        zh: '卡佳攥糖：「别叫他们。」',
        en: 'Katya clutches the candy: "Don\'t call them."',
      },
    },
    {
      beatId: 'beat_4',
      agent: 'narrator',
      keywords: ['covered_for_worker'],
      text: {
        zh: '监工远远瞥了一眼，没再走近。卡佳低下头。',
        en: "The foreman glanced from afar, didn't approach further. Katya lowered her head.",
      },
    },
    {
      beatId: 'beat_4',
      agent: 'katya',
      keywords: [],
      text: {
        zh: '「……哈特同志……」卡佳咳嗽着，血气很重。',
        en: '"...Comrade Hart..." Katya coughs, the smell of blood heavy.',
      },
    },
    // Beat 5
    {
      beatId: 'beat_5',
      agent: 'narrator',
      keywords: [],
      text: {
        zh: '人流刷卡。监听器红灯如常。还有六小时。',
        en: 'Crowd swipes cards. Surveillance red light as usual. Six more hours.',
      },
    },
  ],
};
