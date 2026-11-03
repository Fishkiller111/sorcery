import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/** React Native multipart file part (uri-based FormData). */
export type NativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export type ChatImageUploadFile = Blob | File | NativeUploadFile;

export interface PickedChatImage {
  previewUri: string;
  file: ChatImageUploadFile;
  filename: string;
}

export class PhotoPermissionDeniedError extends Error {
  constructor() {
    super('photo_permission_denied');
    this.name = 'PhotoPermissionDeniedError';
  }
}

export function isNativeUploadFile(file: ChatImageUploadFile): file is NativeUploadFile {
  return (
    typeof file === 'object' &&
    file !== null &&
    'uri' in file &&
    typeof (file as NativeUploadFile).uri === 'string'
  );
}

function inferFilename(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'png' || ext === 'webp' || ext === 'jpg' || ext === 'jpeg') {
    return `chat.${ext === 'jpeg' ? 'jpg' : ext}`;
  }
  if (file.type === 'image/png') return 'chat.png';
  if (file.type === 'image/webp') return 'chat.webp';
  return 'chat.jpg';
}

function mimeToExt(mime: string | undefined | null): 'jpg' | 'png' | 'webp' {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function pickOnWeb(): Promise<PickedChatImage | null> {
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
        finish({
          previewUri: URL.createObjectURL(file),
          file,
          filename: inferFilename(file),
        });
      } catch (e) {
        reject(e instanceof Error ? e : new Error('invalid image'));
      }
    };
    window.addEventListener('focus', onWindowFocus, { once: true });
    input.click();
  });
}

/** Pick a single image for Free Chat vision upload (no crop). */
export async function pickChatImage(): Promise<PickedChatImage | null> {
  if (Platform.OS === 'web') {
    return pickOnWeb();
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPermissionDeniedError();
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
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
  const filename = `chat.${ext}`;

  // RN FormData requires { uri, name, type } — Blob from fetch(uri) breaks on iOS.
  return {
    previewUri: asset.uri,
    file: {
      uri: asset.uri,
      name: filename,
      type: mime,
    },
    filename,
  };
}
