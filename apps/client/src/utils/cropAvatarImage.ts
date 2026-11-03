import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import type { ChatImageUploadFile, NativeUploadFile } from './pickChatImage';

/** 原图上的像素裁切区域，来自 react-easy-crop（仅 Web Modal）。 */
export type CroppedAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CroppedImageFile = {
  file: ChatImageUploadFile;
  filename: string;
};

/** @deprecated 使用 CroppedImageFile */
export type CroppedAvatarFile = CroppedImageFile;

export type CropOutput = {
  width: number;
  height: number;
  mime: string;
  filename: string;
};

export const AVATAR_CROP_OUTPUT: CropOutput = {
  width: 512,
  height: 512,
  mime: 'image/webp',
  filename: 'avatar.webp',
};

export const FIGURE_CROP_OUTPUT: CropOutput = {
  width: 576,
  height: 1024,
  mime: 'image/jpeg',
  filename: 'figure.jpg',
};

/** @deprecated 使用 AVATAR_CROP_OUTPUT.width */
export const AVATAR_OUTPUT_SIZE = AVATAR_CROP_OUTPUT.width;

function loadImageFromBlob(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('invalid image'));
    };
    img.src = url;
  });
}

async function blobFromSource(source: Blob | string): Promise<Blob> {
  if (typeof source !== 'string') return source;
  const response = await fetch(source);
  return response.blob();
}

async function cropImageWeb(
  file: Blob,
  area: CroppedAreaPixels,
  output: CropOutput,
): Promise<CroppedImageFile> {
  const img = await loadImageFromBlob(file);
  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    output.width,
    output.height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode failed'))),
      output.mime,
      0.92,
    );
  });

  return { file: blob, filename: output.filename };
}

async function resizeImageWeb(file: Blob, output: CropOutput): Promise<CroppedImageFile> {
  const img = await loadImageFromBlob(file);
  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  ctx.drawImage(img, 0, 0, output.width, output.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode failed'))),
      output.mime,
      0.92,
    );
  });

  return { file: blob, filename: output.filename };
}

async function resizeImageNative(uri: string, output: CropOutput): Promise<CroppedImageFile> {
  const format =
    output.mime === 'image/webp'
      ? ImageManipulator.SaveFormat.WEBP
      : ImageManipulator.SaveFormat.JPEG;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: output.width, height: output.height } }],
    { compress: 0.92, format },
  );

  // Keep uri-shaped FormData parts on native — response.blob() throws on iOS Hermes.
  const file: NativeUploadFile = {
    uri: result.uri,
    name: output.filename,
    type: output.mime,
  };
  return { file, filename: output.filename };
}

/** Web Modal 确认：将裁切坐标转为目标尺寸。 */
export async function cropImage(
  source: Blob | string,
  area: CroppedAreaPixels,
  output: CropOutput,
): Promise<CroppedImageFile> {
  const file = await blobFromSource(source);
  return cropImageWeb(file, area, output);
}

/** 原生系统裁切后规范为目标尺寸。 */
export async function resizeImage(
  source: Blob | string | NativeUploadFile,
  output: CropOutput,
): Promise<CroppedImageFile> {
  if (Platform.OS === 'web') {
    if (typeof source === 'object' && source !== null && 'uri' in source) {
      throw new Error('native upload file unsupported on web resize');
    }
    const file = await blobFromSource(source as Blob | string);
    return resizeImageWeb(file, output);
  }

  const uri =
    typeof source === 'string'
      ? source
      : 'uri' in source
        ? source.uri
        : URL.createObjectURL(source);
  const shouldRevoke = typeof source !== 'string' && !('uri' in source);
  try {
    return await resizeImageNative(uri, output);
  } finally {
    if (shouldRevoke) {
      URL.revokeObjectURL(uri);
    }
  }
}

export async function cropAvatarImage(
  source: Blob | string,
  area: CroppedAreaPixels,
): Promise<CroppedImageFile> {
  return cropImage(source, area, AVATAR_CROP_OUTPUT);
}

export async function resizeAvatarImage(source: Blob | string): Promise<CroppedImageFile> {
  return resizeImage(source, AVATAR_CROP_OUTPUT);
}
