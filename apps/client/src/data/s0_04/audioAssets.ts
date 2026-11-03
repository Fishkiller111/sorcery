/** Bundled S0-04 ambience + SFX (require map for Metro). */
export const S0_04_AUDIO: Record<string, number> = {
  s0_04_amb_dorm_night: require('../../../assets/audio/s0_04/s0_04_amb_dorm_night.mp3'),
  s0_04_amb_silence: require('../../../assets/audio/s0_04/s0_04_amb_silence.mp3'),
  s0_04_sfx_door_lock: require('../../../assets/audio/s0_04/s0_04_sfx_door_lock.mp3'),
  s0_04_sfx_city_hum: require('../../../assets/audio/s0_04/s0_04_sfx_city_hum.mp3'),
  s0_04_sfx_tape_hiss: require('../../../assets/audio/s0_04/s0_04_sfx_tape_hiss.mp3'),
  s0_04_sfx_tape_stop: require('../../../assets/audio/s0_04/s0_04_sfx_tape_stop.mp3'),
  s0_04_sfx_pencil: require('../../../assets/audio/s0_04/s0_04_sfx_pencil.mp3'),
  s0_04_sfx_page_turn: require('../../../assets/audio/s0_04/s0_04_sfx_page_turn.mp3'),
  s0_04_sfx_breath: require('../../../assets/audio/s0_04/s0_04_sfx_breath.mp3'),
  s0_04_sting_broadcast: require('../../../assets/audio/s0_04/s0_04_sting_broadcast.mp3'),
  s0_04_sfx_radio_fade: require('../../../assets/audio/s0_04/s0_04_sfx_radio_fade.mp3'),
  s0_04_music_whistle: require('../../../assets/audio/s0_04/s0_04_music_whistle.mp3'),
  s0_04_r04_amb_flashback: require('../../../assets/audio/s0_04/s0_04_r04_amb_flashback.mp3'),
  s0_04_r04_sfx_tape_long: require('../../../assets/audio/s0_04/s0_04_r04_sfx_tape_long.mp3'),
};

export type S0_04AudioKey = keyof typeof S0_04_AUDIO;
