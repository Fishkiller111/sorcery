/** Bundled S0-03 ambience + SFX (require map for Metro). */
export const S0_03_AUDIO: Record<string, number> = {
  s0_03_amb_tunnel: require('../../../assets/audio/s0_03/s0_03_amb_tunnel.mp3'),
  s0_03_amb_cellar: require('../../../assets/audio/s0_03/s0_03_amb_cellar.mp3'),
  s0_03_sfx_knock_signal: require('../../../assets/audio/s0_03/s0_03_sfx_knock_signal.mp3'),
  s0_03_sfx_door_slit: require('../../../assets/audio/s0_03/s0_03_sfx_door_slit.mp3'),
  s0_03_sfx_spiral_stairs: require('../../../assets/audio/s0_03/s0_03_sfx_spiral_stairs.mp3'),
  s0_03_sfx_shortwave_on: require('../../../assets/audio/s0_03/s0_03_sfx_shortwave_on.mp3'),
  s0_03_sfx_microfilm: require('../../../assets/audio/s0_03/s0_03_sfx_microfilm.mp3'),
  s0_03_sfx_mic_light: require('../../../assets/audio/s0_03/s0_03_sfx_mic_light.mp3'),
  s0_03_sfx_radio_tx: require('../../../assets/audio/s0_03/s0_03_sfx_radio_tx.mp3'),
  s0_03_sfx_door_close: require('../../../assets/audio/s0_03/s0_03_sfx_door_close.mp3'),
  s0_03_sfx_surface_walk: require('../../../assets/audio/s0_03/s0_03_sfx_surface_walk.mp3'),
  s0_03_sfx_timer_tick: require('../../../assets/audio/s0_03/s0_03_sfx_timer_tick.mp3'),
  s0_03_b03_sfx_steps_back: require('../../../assets/audio/s0_03/s0_03_b03_sfx_steps_back.mp3'),
  s0_03_b03_sfx_paper_rip: require('../../../assets/audio/s0_03/s0_03_b03_sfx_paper_rip.mp3'),
  s0_03_b03_sfx_radio_kill: require('../../../assets/audio/s0_03/s0_03_b03_sfx_radio_kill.mp3'),
  s0_03_b03_sfx_slap: require('../../../assets/audio/s0_03/s0_03_b03_sfx_slap.mp3'),
  s0_03_b03_sfx_film_crush: require('../../../assets/audio/s0_03/s0_03_b03_sfx_film_crush.mp3'),
  s0_03_b03_sfx_child_gasp: require('../../../assets/audio/s0_03/s0_03_b03_sfx_child_gasp.mp3'),
  s0_03_r06_sfx_projector: require('../../../assets/audio/s0_03/s0_03_r06_sfx_projector.mp3'),
};

export type S0_03AudioKey = keyof typeof S0_03_AUDIO;
