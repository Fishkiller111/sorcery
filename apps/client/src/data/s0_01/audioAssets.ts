/** Bundled S0-01 ambience + SFX (require map for Metro). */
export const S0_01_AUDIO: Record<string, number> = {
  s0_01_amb_dorm: require('../../../assets/audio/s0_01/s0_01_amb_dorm.mp3'),
  s0_01_amb_factory: require('../../../assets/audio/s0_01/s0_01_amb_factory.mp3'),
  s0_01_sfx_bed_creak: require('../../../assets/audio/s0_01/s0_01_sfx_bed_creak.mp3'),
  s0_01_sfx_notebook: require('../../../assets/audio/s0_01/s0_01_sfx_notebook.mp3'),
  s0_01_sfx_locker: require('../../../assets/audio/s0_01/s0_01_sfx_locker.mp3'),
  s0_01_sfx_loom_near: require('../../../assets/audio/s0_01/s0_01_sfx_loom_near.mp3'),
  s0_01_sfx_grate_pass: require('../../../assets/audio/s0_01/s0_01_sfx_grate_pass.mp3'),
  s0_01_sfx_cough: require('../../../assets/audio/s0_01/s0_01_sfx_cough.mp3'),
  s0_01_sfx_factory_whistle: require('../../../assets/audio/s0_01/s0_01_sfx_factory_whistle.mp3'),
  s0_01_sfx_stampede: require('../../../assets/audio/s0_01/s0_01_sfx_stampede.mp3'),
  s0_01_b01_sfx_bug_alarm: require('../../../assets/audio/s0_01/s0_01_b01_sfx_bug_alarm.mp3'),
  s0_01_b01_sfx_loudspeaker: require('../../../assets/audio/s0_01/s0_01_b01_sfx_loudspeaker.mp3'),
  s0_01_b01_sfx_boots: require('../../../assets/audio/s0_01/s0_01_b01_sfx_boots.mp3'),
  s0_01_b01_sfx_door_kick: require('../../../assets/audio/s0_01/s0_01_b01_sfx_door_kick.mp3'),
  s0_01_b01_sfx_punch: require('../../../assets/audio/s0_01/s0_01_b01_sfx_punch.mp3'),
  s0_01_b01_sfx_fabric_tear: require('../../../assets/audio/s0_01/s0_01_b01_sfx_fabric_tear.mp3'),
  s0_01_r02_amb_truck: require('../../../assets/audio/s0_01/s0_01_r02_amb_truck.mp3'),
  s0_01_r02_sfx_cough_blood: require('../../../assets/audio/s0_01/s0_01_r02_sfx_cough_blood.mp3'),
};

export type S0_01AudioKey = keyof typeof S0_01_AUDIO;
