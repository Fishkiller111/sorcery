import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const AUDIO_LS_PREFIX = 'st_audio_';
const AUDIO_FMT_PREFIX = 'st_audio_fmt_';
const AUDIO_TS_PREFIX = 'st_audio_ts_';
const MAX_STORED_AUDIOS = 50;

type FileSystemModule = typeof import('expo-file-system/legacy');

async function getFileSystem(): Promise<FileSystemModule | null> {
  if (isWeb) return null;
  // SDK 54+: default expo-file-system is the new API; keep legacy for existing cache paths.
  return import('expo-file-system/legacy');
}

function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function evictOldestWebAudios(): void {
  try {
    const keys = Object.keys(localStorage).filter((x) => x.startsWith(AUDIO_LS_PREFIX));
    if (keys.length <= MAX_STORED_AUDIOS) return;

    const ranked = keys
      .map((storageKey) => {
        const id = storageKey.slice(AUDIO_LS_PREFIX.length);
        const ts = Number(localStorage.getItem(`${AUDIO_TS_PREFIX}${id}`) || '0');
        return { id, ts };
      })
      .sort((a, b) => a.ts - b.ts);

    const removeCount = ranked.length - MAX_STORED_AUDIOS;
    for (let i = 0; i < removeCount; i++) {
      const id = ranked[i].id;
      localStorage.removeItem(`${AUDIO_LS_PREFIX}${id}`);
      localStorage.removeItem(`${AUDIO_FMT_PREFIX}${id}`);
      localStorage.removeItem(`${AUDIO_TS_PREFIX}${id}`);
    }
  } catch {
    // ignore eviction errors
  }
}

export async function saveAudio(
  key: string,
  base64: string,
  format: 'mp3' | 'wav' = 'wav',
): Promise<void> {
  const k = safeKey(key);
  if (isWeb) {
    try {
      localStorage.setItem(`${AUDIO_LS_PREFIX}${k}`, base64);
      localStorage.setItem(`${AUDIO_FMT_PREFIX}${k}`, format);
      localStorage.setItem(`${AUDIO_TS_PREFIX}${k}`, String(Date.now()));
      evictOldestWebAudios();
    } catch {
      // localStorage 满或不可写
    }
    return;
  }

  const fs = await getFileSystem();
  if (!fs || !fs.documentDirectory) return;
  const dir = `${fs.documentDirectory}soulthread_audio/`;
  const info = await fs.getInfoAsync(dir);
  if (!info.exists) {
    await fs.makeDirectoryAsync(dir, { intermediates: true });
  }
  const ext = format === 'mp3' ? 'mp3' : 'wav';
  const path = `${dir}${k}.${ext}`;
  await fs.writeAsStringAsync(path, base64, { encoding: fs.EncodingType.Base64 });
  const metaPath = `${dir}${k}.meta.json`;
  await fs.writeAsStringAsync(
    metaPath,
    JSON.stringify({ ts: Date.now(), format }),
    { encoding: fs.EncodingType.UTF8 },
  );

  const files = await fs.readDirectoryAsync(dir);
  const audioFiles = files.filter((f) => f.endsWith('.mp3') || f.endsWith('.wav'));
  if (audioFiles.length > MAX_STORED_AUDIOS) {
    const ranked = await Promise.all(
      audioFiles.map(async (name) => {
        const base = name.replace(/\.(mp3|wav)$/, '');
        const metaFile = `${dir}${base}.meta.json`;
        let ts = 0;
        try {
          const metaInfo = await fs.getInfoAsync(metaFile);
          if (metaInfo.exists) {
            const raw = await fs.readAsStringAsync(metaFile);
            const parsed = JSON.parse(raw) as { ts?: number };
            ts = parsed.ts ?? 0;
          }
        } catch {
          /* use ts=0 */
        }
        return { name, ts };
      }),
    );
    ranked.sort((a, b) => a.ts - b.ts);
    const removeCount = ranked.length - MAX_STORED_AUDIOS;
    for (let i = 0; i < removeCount; i++) {
      const base = ranked[i].name.replace(/\.(mp3|wav)$/, '');
      await fs.deleteAsync(`${dir}${ranked[i].name}`, { idempotent: true });
      await fs.deleteAsync(`${dir}${base}.meta.json`, { idempotent: true });
    }
  }
}

export async function getAudioBundle(
  key: string,
): Promise<{ data: string; format: 'mp3' | 'wav' } | null> {
  const k = safeKey(key);
  if (isWeb) {
    try {
      const data = localStorage.getItem(`${AUDIO_LS_PREFIX}${k}`);
      if (!data) return null;
      const fmt = localStorage.getItem(`${AUDIO_FMT_PREFIX}${k}`);
      return { data, format: fmt === 'mp3' ? 'mp3' : 'wav' };
    } catch {
      return null;
    }
  }

  const fs = await getFileSystem();
  if (!fs || !fs.documentDirectory) return null;
  const dir = `${fs.documentDirectory}soulthread_audio/`;
  const mp3Path = `${dir}${k}.mp3`;
  const wavPath = `${dir}${k}.wav`;
  const mp3Info = await fs.getInfoAsync(mp3Path);
  if (mp3Info.exists) return { data: mp3Path, format: 'mp3' };
  const wavInfo = await fs.getInfoAsync(wavPath);
  if (wavInfo.exists) return { data: wavPath, format: 'wav' };
  return null;
}

export async function readAudioFile(uri: string): Promise<string> {
  if (isWeb) return uri;
  const fs = await getFileSystem();
  if (!fs) throw new Error('FileSystem not available');
  return fs.readAsStringAsync(uri, { encoding: fs.EncodingType.Base64 });
}
