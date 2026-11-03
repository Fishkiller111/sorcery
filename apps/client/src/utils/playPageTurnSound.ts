import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';

const PAGE_TURN_SOUND = require('../../assets/sounds/page_turn.wav');

let cachedPlayer: AudioPlayer | null = null;
let loading: Promise<AudioPlayer | null> | null = null;

async function getPlayer(): Promise<AudioPlayer | null> {
  if (cachedPlayer) return cachedPlayer;
  if (loading) return loading;

  loading = (async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
      });
      const player = createAudioPlayer(PAGE_TURN_SOUND);
      player.volume = 0.62;
      cachedPlayer = player;
      return player;
    } catch {
      return null;
    }
  })();

  return loading;
}

export async function preloadPageTurnSound(): Promise<void> {
  await getPlayer();
}

export async function playPageTurnSound(): Promise<void> {
  const player = await getPlayer();
  if (!player) return;

  try {
    await player.seekTo(0);
    player.play();
  } catch {
    // Ignore overlapping replays while the clip is still playing.
  }
}
