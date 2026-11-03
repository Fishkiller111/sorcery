import { Image, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  isNativeUploadFile,
  type ChatImageUploadFile,
  type NativeUploadFile,
} from './pickChatImage';

/** Stay under backend 10MB image caps with headroom for multipart overhead. */
export const DEFAULT_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const DEFAULT_UPLOAD_MAX_EDGE = 1920;

const QUALITY_STEPS = [0.82, 0.7, 0.55, 0.4] as const;

export type CompressImageInput = {
  previewUri: string;
  file: ChatImageUploadFile;
  filename: string;
};

export type CompressImageOptions = {
  maxEdge?: number;
  maxBytes?: number;
};

export class EmptyImageError extends Error {
  constructor() {
    super('empty_image');
    this.name = 'EmptyImageError';
  }
}

export class ImageTooLargeError extends Error {
  constructor() {
    super('image_too_large');
    this.name = 'ImageTooLargeError';
  }
}

function jpegFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '') || 'media';
  return `${base}.jpg`;
}

async function blobByteSize(file: ChatImageUploadFile): Promise<number> {
  if (isNativeUploadFile(file)) {
    try {
      const fs = await import('expo-file-system/legacy');
      const info = await fs.getInfoAsync(file.uri);
      if (info.exists && typeof (info as { size?: number }).size === 'number') {
        return (info as { size: number }).size;
      }
    } catch {
      // fall through
    }
    const res = await fetch(file.uri);
    const blob = await res.blob();
    return blob.size;
  }
  return file.size;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err instanceof Error ? err : new Error('invalid image')),
    );
  });
}

async function loadHtmlImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('invalid image'));
    img.crossOrigin = 'anonymous';
    img.src = uri;
  });
}

async function encodeCanvasJpeg(
  img: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode failed'))),
      'image/jpeg',
      quality,
    );
  });
  return blob;
}

async function compressWeb(
  input: CompressImageInput,
  maxEdge: number,
  maxBytes: number,
): Promise<CompressImageInput> {
  const sourceBlob = isNativeUploadFile(input.file)
    ? await (await fetch(input.file.uri)).blob()
    : input.file;
  if (sourceBlob.size <= 0) throw new EmptyImageError();

  const objectUrl =
    typeof input.previewUri === 'string' && input.previewUri.startsWith('blob:')
      ? input.previewUri
      : URL.createObjectURL(sourceBlob);
  const shouldRevoke = objectUrl !== input.previewUri;

  try {
    const img = await loadHtmlImage(objectUrl);
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const filename = jpegFilename(input.filename);

    // Already small enough and no resize needed — keep original when JPEG-ish and under cap.
    if (
      scale >= 1
      && sourceBlob.size <= maxBytes
      && (sourceBlob.type === 'image/jpeg' || sourceBlob.type === 'image/jpg')
    ) {
      return input;
    }

    let best: Blob | null = null;
    for (const quality of QUALITY_STEPS) {
      const blob = await encodeCanvasJpeg(img, width, height, quality);
      best = blob;
      if (blob.size <= maxBytes) {
        const previewUri = URL.createObjectURL(blob);
        return { previewUri, file: blob, filename };
      }
    }
    if (!best || best.size <= 0) throw new EmptyImageError();
    if (best.size > maxBytes) throw new ImageTooLargeError();
    const previewUri = URL.createObjectURL(best);
    return { previewUri, file: best, filename };
  } finally {
    if (shouldRevoke) URL.revokeObjectURL(objectUrl);
  }
}

async function compressNative(
  input: CompressImageInput,
  maxEdge: number,
  maxBytes: number,
): Promise<CompressImageInput> {
  const uri = isNativeUploadFile(input.file) ? input.file.uri : input.previewUri;
  const initialSize = await blobByteSize(input.file);
  if (initialSize <= 0) throw new EmptyImageError();

  let width = 0;
  let height = 0;
  try {
    const size = await getImageSize(uri);
    width = size.width;
    height = size.height;
  } catch {
    // Proceed without pre-known dimensions; manipulator still works.
  }

  const scale =
    width > 0 && height > 0 ? Math.min(1, maxEdge / Math.max(width, height)) : 1;
  const actions: ImageManipulator.Action[] =
    scale < 1 && width > 0 && height > 0
      ? [{ resize: { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) } }]
      : scale < 1
        ? [{ resize: { width: maxEdge } }]
        : [];

  // Skip work when already JPEG under budget and no resize.
  if (
    actions.length === 0
    && initialSize <= maxBytes
    && isNativeUploadFile(input.file)
    && (input.file.type === 'image/jpeg' || input.filename.toLowerCase().endsWith('.jpg'))
  ) {
    return input;
  }

  const filename = jpegFilename(input.filename);
  let bestUri: string | null = null;
  let bestSize = Number.POSITIVE_INFINITY;

  for (const quality of QUALITY_STEPS) {
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const size = await blobByteSize({
      uri: result.uri,
      name: filename,
      type: 'image/jpeg',
    });
    if (size <= 0) continue;
    bestUri = result.uri;
    bestSize = size;
    if (size <= maxBytes) {
      const file: NativeUploadFile = {
        uri: result.uri,
        name: filename,
        type: 'image/jpeg',
      };
      return { previewUri: result.uri, file, filename };
    }
  }

  if (!bestUri || bestSize <= 0) throw new EmptyImageError();
  if (bestSize > maxBytes) throw new ImageTooLargeError();
  const file: NativeUploadFile = {
    uri: bestUri,
    name: filename,
    type: 'image/jpeg',
  };
  return { previewUri: bestUri, file, filename };
}

/**
 * Downscale + JPEG recompress images before multipart upload.
 * Call for image media only; skip videos.
 */
export async function compressImageForUpload(
  input: CompressImageInput,
  options?: CompressImageOptions,
): Promise<CompressImageInput> {
  const maxEdge = options?.maxEdge ?? DEFAULT_UPLOAD_MAX_EDGE;
  const maxBytes = options?.maxBytes ?? DEFAULT_UPLOAD_MAX_BYTES;
  if (Platform.OS === 'web') {
    return compressWeb(input, maxEdge, maxBytes);
  }
  return compressNative(input, maxEdge, maxBytes);
}

/** Ensure upload payload is non-empty (catches empty File on some Android WebView picks). */
export async function assertUploadHasBytes(file: ChatImageUploadFile): Promise<void> {
  const size = await blobByteSize(file);
  if (size <= 0) throw new EmptyImageError();
}
