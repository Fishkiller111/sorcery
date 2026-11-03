import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  isNativeUploadFile,
  PhotoPermissionDeniedError,
  type ChatImageUploadFile,
  type NativeUploadFile,
} from './pickChatImage';

export type PickedRoleMedia = {
  previewUri: string;
  file: ChatImageUploadFile;
  filename: string;
  mediaType: 'image' | 'video';
  /** True when the file is an animated/static GIF (skip lossy compress). */
  isGif?: boolean;
};

export type PickRoleMediaOptions = {
  /** Restrict picker to GIF files only. */
  gifOnly?: boolean;
};

const MAX_BATCH = 20;

function isGifFile(mime: string, filename: string): boolean {
  const lower = `${mime} ${filename}`.toLowerCase();
  return lower.includes('gif') || lower.endsWith('.gif');
}

function inferMediaType(mime: string, filename: string): 'image' | 'video' | null {
  const lower = `${mime} ${filename}`.toLowerCase();
  if (lower.includes('mp4') || lower.includes('video')) return 'video';
  if (
    lower.includes('jpeg') ||
    lower.includes('jpg') ||
    lower.includes('png') ||
    lower.includes('webp') ||
    lower.includes('gif') ||
    lower.includes('image')
  ) {
    return 'image';
  }
  return null;
}

function fileToPicked(file: File): PickedRoleMedia | null {
  const mediaType = inferMediaType(file.type, file.name);
  if (!mediaType) return null;
  const gif = isGifFile(file.type, file.name);
  const ext =
    mediaType === 'video'
      ? 'mp4'
      : gif
        ? 'gif'
        : file.type.includes('png')
          ? 'png'
          : file.type.includes('webp')
            ? 'webp'
            : 'jpg';
  return {
    previewUri: URL.createObjectURL(file),
    file,
    filename: file.name?.trim() || `media.${ext}`,
    mediaType,
    isGif: gif,
  };
}

function pickOnWeb(multiple: boolean, gifOnly: boolean): Promise<PickedRoleMedia[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = gifOnly
      ? 'image/gif,.gif'
      : 'image/jpeg,image/png,image/webp,image/gif,video/mp4';
    input.multiple = multiple;
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) {
        resolve([]);
        return;
      }
      const picked = files
        .slice(0, MAX_BATCH)
        .map(fileToPicked)
        .filter((x): x is PickedRoleMedia => !!x && (!gifOnly || !!x.isGif));
      resolve(picked);
    };
    input.click();
  });
}

/** Convert a web FileList / File[] (e.g. drag-drop) into upload payloads. */
export function roleMediaFromFiles(files: ArrayLike<File> | File[]): PickedRoleMedia[] {
  return Array.from(files)
    .slice(0, MAX_BATCH)
    .map(fileToPicked)
    .filter((x): x is PickedRoleMedia => x != null);
}

async function pickOnNative(multiple: boolean, gifOnly: boolean): Promise<PickedRoleMedia[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPermissionDeniedError();
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: gifOnly ? ['images'] : ['images', 'videos'],
    quality: 1,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? MAX_BATCH : 1,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled || !result.assets?.length) return [];

  const out: PickedRoleMedia[] = [];
  for (const asset of result.assets.slice(0, MAX_BATCH)) {
    const mime = asset.mimeType || '';
    const mediaType = inferMediaType(mime, asset.fileName || asset.uri);
    if (!mediaType) continue;
    const gif = isGifFile(mime, asset.fileName || asset.uri);
    if (gifOnly && !gif) continue;
    const ext =
      mediaType === 'video'
        ? 'mp4'
        : gif
          ? 'gif'
          : mime.includes('png')
            ? 'png'
            : mime.includes('webp')
              ? 'webp'
              : 'jpg';
    const filename = asset.fileName?.trim() || `media.${ext}`;
    const file: NativeUploadFile = {
      uri: asset.uri,
      name: filename,
      type: mime || (mediaType === 'video' ? 'video/mp4' : gif ? 'image/gif' : 'image/jpeg'),
    };
    out.push({
      previewUri: asset.uri,
      file,
      filename,
      mediaType,
      isGif: gif,
    });
  }
  return out;
}

/** Pick one image/video (or GIF-only) for posts / Agent media. */
export async function pickRoleMedia(opts?: PickRoleMediaOptions): Promise<PickedRoleMedia | null> {
  const list = await pickRoleMediaMultiple(opts);
  return list[0] ?? null;
}

/** Pick one or more images/videos (max 20). */
export async function pickRoleMediaMultiple(opts?: PickRoleMediaOptions): Promise<PickedRoleMedia[]> {
  const gifOnly = Boolean(opts?.gifOnly);
  if (Platform.OS === 'web') {
    return pickOnWeb(true, gifOnly);
  }
  return pickOnNative(true, gifOnly);
}

export { isNativeUploadFile, PhotoPermissionDeniedError, MAX_BATCH };
