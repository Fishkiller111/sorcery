import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  PhotoPermissionDeniedError,
  type ChatImageUploadFile,
  type PickedChatImage,
  isNativeUploadFile,
} from './pickChatImage';

const ASPECT_TOLERANCE = 0.08;
const PORTRAIT_RATIO = 9 / 16;
const LANDSCAPE_RATIO = 16 / 9;

export type ChatBgAspect = 'portrait' | 'landscape';

export class ChatBgAspectError extends Error {
  constructor(public readonly expected: ChatBgAspect) {
    super(expected === 'portrait' ? 'need_9_16' : 'need_16_9');
    this.name = 'ChatBgAspectError';
  }
}

export function matchesChatBgAspect(
  width: number,
  height: number,
  expected: ChatBgAspect,
): boolean {
  if (width <= 0 || height <= 0) return false;
  const ratio = width / height;
  const target = expected === 'portrait' ? PORTRAIT_RATIO : LANDSCAPE_RATIO;
  return Math.abs(ratio - target) <= ASPECT_TOLERANCE;
}

function inferFilename(mime: string | undefined, expected: ChatBgAspect): string {
  const base = expected === 'portrait' ? 'chat-bg-portrait' : 'chat-bg-landscape';
  if (mime === 'image/png') return `${base}.png`;
  if (mime === 'image/webp') return `${base}.webp`;
  return `${base}.jpg`;
}

function pickOnWeb(expected: ChatBgAspect): Promise<PickedChatImage | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';

    let settled = false;
    let fileSelected = false;

    const finish = (value: PickedChatImage | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const onWindowFocus = () => {
      window.setTimeout(() => {
        if (!fileSelected && !settled) finish(null);
      }, 400);
    };

    input.addEventListener('cancel', () => finish(null));
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      fileSelected = true;
      try {
        const objectUrl = URL.createObjectURL(file);
        const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
          const img = new Image();
          img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => rej(new Error('image_load_failed'));
          img.src = objectUrl;
        });
        if (!matchesChatBgAspect(dims.w, dims.h, expected)) {
          URL.revokeObjectURL(objectUrl);
          reject(new ChatBgAspectError(expected));
          return;
        }
        finish({
          previewUri: objectUrl,
          file,
          filename: inferFilename(file.type, expected),
        });
      } catch (err) {
        reject(err);
      }
    };

    window.addEventListener('focus', onWindowFocus, { once: true });
    input.click();
  });
}

async function pickOnNative(expected: ChatBgAspect): Promise<PickedChatImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPermissionDeniedError();
  }
  const aspect: [number, number] = expected === 'portrait' ? [9, 16] : [16, 9];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.92,
    allowsEditing: true,
    aspect,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const w = asset.width ?? 0;
  const h = asset.height ?? 0;
  if (w > 0 && h > 0 && !matchesChatBgAspect(w, h, expected)) {
    throw new ChatBgAspectError(expected);
  }
  const mime = asset.mimeType || 'image/jpeg';
  const filename = inferFilename(mime, expected);
  const file: ChatImageUploadFile = {
    uri: asset.uri,
    name: filename,
    type: mime,
  };
  return { previewUri: asset.uri, file, filename };
}

/** Pick a chat background image and enforce 9:16 or 16:9. */
export async function pickChatBackgroundImage(
  expected: ChatBgAspect,
): Promise<PickedChatImage | null> {
  if (Platform.OS === 'web') {
    return pickOnWeb(expected);
  }
  return pickOnNative(expected);
}

export { isNativeUploadFile };
