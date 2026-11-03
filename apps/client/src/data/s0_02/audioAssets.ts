/** Bundled S0-02 parallel ambience + SFX (require map for Metro). */
export const S0_02_AUDIO: Record<string, number> = {
  s0_02_amb_office: require('../../../assets/audio/s0_02/s0_02_amb_office.mp3'),
  s0_02_sfx_wind_window: require('../../../assets/audio/s0_02/s0_02_sfx_wind_window.mp3'),
  s0_02_sfx_phone_hum: require('../../../assets/audio/s0_02/s0_02_sfx_phone_hum.mp3'),
  s0_02_sfx_footsteps_corridor: require('../../../assets/audio/s0_02/s0_02_sfx_footsteps_corridor.mp3'),
  s0_02_sfx_folder_drop: require('../../../assets/audio/s0_02/s0_02_sfx_folder_drop.mp3'),
  s0_02_sfx_paper_rustle: require('../../../assets/audio/s0_02/s0_02_sfx_paper_rustle.mp3'),
  s0_02_sfx_page_flip: require('../../../assets/audio/s0_02/s0_02_sfx_page_flip.mp3'),
  s0_02_sfx_stamp: require('../../../assets/audio/s0_02/s0_02_sfx_stamp.mp3'),
  s0_02_sfx_phone_hangup: require('../../../assets/audio/s0_02/s0_02_sfx_phone_hangup.mp3'),
};

export type S0_02AudioKey = keyof typeof S0_02_AUDIO;
