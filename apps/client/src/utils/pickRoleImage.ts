import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  isNativeUploadFile,
  PhotoPermissionDeniedError,
  type ChatImageUploadFile,
  type NativeUploadFile,
} from './pickChatImage';

export interface PickedRoleImage {
  previewUri: string;
  file: ChatImageUploadFile;
  filename: string;
  /** Static image vs motion video (mp4). GIF stays `image` with isGif. */
  mediaType?: 'image' | 'video';
  isGif?: boolean;
}

const FIGURE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,video/mp4,.gif,.mp4';

function isGifMeta(mime: string, filename: string): boolean {
  const lower = `${mime} ${filename}`.toLowerCase();
  return lower.includes('gif') || lower.endsWith('.gif');
}

function isVideoMeta(mime: string, filename: string): boolean {
  const lower = `${mime} ${filename}`.toLowerCase();
  return lower.includes('mp4') || lower.includes('video') || lower.endsWith('.m4v');
}

/** Skip crop / lossy resize for GIF and video so animation is preserved. */
export function isMotionFigurePick(picked: PickedRoleImage): boolean {
  return picked.mediaType === 'video' || Boolean(picked.isGif);
}

/** 根据 File 元数据推断上传文件名（Web 选图）。 */
function inferImageFilename(file: File, baseName: string): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'png' || ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'mp4') {
    return `${baseName}.${ext === 'jpeg' ? 'jpg' : ext}`;
  }
  if (file.type === 'image/png') return `${baseName}.png`;
  if (file.type === 'image/webp') return `${baseName}.webp`;
  if (file.type === 'image/gif') return `${baseName}.gif`;
  if (file.type === 'video/mp4' || file.type.startsWith('video/')) return `${baseName}.mp4`;
  return `${baseName}.jpg`;
}

function mimeToExt(mime: string | undefined | null): 'jpg' | 'png' | 'webp' | 'gif' | 'mp4' {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'video/mp4' || mime?.startsWith('video/')) return 'mp4';
  return 'jpg';
}

type WebPickerOptions = {
  accept: string;
  processFile: (file: File) => Promise<{
    file: Blob | File;
    filename: string;
    mediaType?: 'image' | 'video';
    isGif?: boolean;
  }>;
};

/** Web file input never fires `change` when the user cancels — listen for `cancel` + focus fallback. */
function pickOnWeb(options: WebPickerOptions): Promise<PickedRoleImage | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept;

    let settled = false;
    let fileSelected = false;

    const cleanup = () => {
      window.removeEventListener('focus', onWindowFocus);
    };

    const finish = (value: PickedRoleImage | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
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
        const normalized = await options.processFile(file);
        finish({
          previewUri: URL.createObjectURL(normalized.file),
          file: normalized.file,
          filename: normalized.filename,
          mediaType: normalized.mediaType ?? 'image',
          isGif: normalized.isGif,
        });
      } catch (e) {
        fail(e instanceof Error ? e : new Error('invalid image'));
      }
    };

    input.onerror = () => finish(null);

    window.addEventListener('focus', onWindowFocus);
    input.click();
  });
}

async function pickNativeEditedImage(
  baseName: 'figure' | 'avatar',
  aspect: [number, number],
): Promise<PickedRoleImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPermissionDeniedError();
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.9,
    // iOS Photos often returns HEIC; force a JPEG/PNG-compatible representation.
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const mime =
    asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' || asset.mimeType === 'image/jpeg'
      ? asset.mimeType
      : 'image/jpeg';
  const ext = mimeToExt(mime);
  const filename = `${baseName}.${ext}`;
  const file: NativeUploadFile = {
    uri: asset.uri,
    name: filename,
    type: mime,
  };

  // RN FormData requires { uri, name, type } — Blob from fetch(uri) breaks on iOS
  // ("Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported").
  return {
    previewUri: asset.uri,
    file,
    filename,
    mediaType: 'image',
  };
}

async function pickNativeFigureMotion(): Promise<PickedRoleImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPermissionDeniedError();
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsEditing: false,
    quality: 1,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const mime = asset.mimeType || '';
  const nameHint = asset.fileName || asset.uri;
  const gif = isGifMeta(mime, nameHint);
  const video = isVideoMeta(mime, nameHint) || asset.type === 'video';

  if (video) {
    const filename = asset.fileName?.trim() || 'figure.mp4';
    const file: NativeUploadFile = {
      uri: asset.uri,
      name: filename,
      type: mime || 'video/mp4',
    };
    return {
      previewUri: asset.uri,
      file,
      filename,
      mediaType: 'video',
    };
  }

  if (gif) {
    const filename = asset.fileName?.trim() || 'figure.gif';
    const file: NativeUploadFile = {
      uri: asset.uri,
      name: filename,
      type: mime || 'image/gif',
    };
    return {
      previewUri: asset.uri,
      file,
      filename,
      mediaType: 'image',
      isGif: true,
    };
  }

  const resolvedMime =
    mime === 'image/png' || mime === 'image/webp' || mime === 'image/jpeg' ? mime : 'image/jpeg';
  const ext = mimeToExt(resolvedMime);
  const filename = asset.fileName?.trim() || `figure.${ext}`;
  const file: NativeUploadFile = {
    uri: asset.uri,
    name: filename,
    type: resolvedMime,
  };
  return {
    previewUri: asset.uri,
    file,
    filename,
    mediaType: 'image',
  };
}

/** 选择立绘：支持静态图（可裁切）以及 GIF / MP4 动图视频（直传）。 */
export async function pickRoleFigureImage(): Promise<PickedRoleImage | null> {
  if (Platform.OS === 'web') {
    return pickOnWeb({
      accept: FIGURE_ACCEPT,
      processFile: async (file) => {
        const filename = inferImageFilename(file, 'figure');
        const gif = isGifMeta(file.type, file.name);
        const video = isVideoMeta(file.type, file.name);
        return {
          file,
          filename,
          mediaType: video ? 'video' : 'image',
          isGif: gif,
        };
      },
    });
  }
  return pickNativeFigureMotion();
}

/** 世界编辑器上传：封面/图鉴可裁切，关卡背景/地图用全图 */
export type WorldEditorImageKind = 'cover' | 'background' | 'gallery' | 'map';

async function pickNativeWorldEditorImage(kind: WorldEditorImageKind): Promise<PickedRoleImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPermissionDeniedError();
  }

  const crop = kind === 'cover' || kind === 'gallery';
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: crop,
    aspect: crop ? [16, 9] : undefined,
    quality: 0.92,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const mime =
    asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' || asset.mimeType === 'image/jpeg'
      ? asset.mimeType
      : 'image/jpeg';
  const ext = mimeToExt(mime);
  const baseName =
    kind === 'background' ? 'background' : kind === 'map' ? 'map' : kind === 'gallery' ? 'gallery' : 'cover';
  const filename = asset.fileName?.trim() || `${baseName}.${ext}`;
  const file: NativeUploadFile = {
    uri: asset.uri,
    name: filename,
    type: mime,
  };

  return {
    previewUri: asset.uri,
    file,
    filename,
    mediaType: 'image',
  };
}

/** 世界剧本编辑器选图（封面 / 关卡背景 / 图鉴 / 地图） */
export async function pickWorldEditorImage(
  kind: WorldEditorImageKind,
): Promise<PickedRoleImage | null> {
  if (Platform.OS === 'web') {
    const baseName =
      kind === 'background' ? 'background' : kind === 'map' ? 'map' : kind === 'gallery' ? 'gallery' : 'cover';
    return pickOnWeb({
      accept: 'image/jpeg,image/png,image/webp',
      processFile: async (file) => ({
        file,
        filename: inferImageFilename(file, baseName),
        mediaType: 'image',
      }),
    });
  }
  return pickNativeWorldEditorImage(kind);
}

/**
 * 选择用户头像（相册 / 文件选择器）。
 * Web 返回原图；原生使用系统 1:1 裁切界面。
 */
export async function pickUserAvatarImage(): Promise<PickedRoleImage | null> {
  if (Platform.OS === 'web') {
    return pickOnWeb({
      accept: 'image/jpeg,image/png,image/webp',
      processFile: async (file) => ({
        file,
        filename: inferImageFilename(file, 'avatar'),
        mediaType: 'image',
      }),
    });
  }
  return pickNativeEditedImage('avatar', [1, 1]);
}

export { isNativeUploadFile };
export type { ChatImageUploadFile, NativeUploadFile };
