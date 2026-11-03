import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { isMotionFigurePick, type PickedRoleImage } from '../utils/pickRoleImage';
import type { ChatImageUploadFile } from '../utils/pickChatImage';
import {
  cropImage,
  resizeImage,
  type CropOutput,
  type CroppedAreaPixels,
} from '../utils/cropAvatarImage';

type UseCropUploadOptions<T> = {
  pick: () => Promise<PickedRoleImage | null>;
  output: CropOutput;
  upload: (file: ChatImageUploadFile, filename: string) => Promise<T>;
  onSuccess?: (result: T, previewUri: string) => void;
  onError?: (error: unknown) => void;
};

/**
 * 通用裁切上传：Web 选原图 → CropModal → 裁切上传；原生系统裁切 → resize → 上传。
 * GIF / MP4 立绘跳过裁切，直接上传以保留动效。
 */
export function useCropUpload<T>(options: UseCropUploadOptions<T>) {
  const [cropPick, setCropPick] = useState<PickedRoleImage | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadDirect = useCallback(
    async (picked: PickedRoleImage) => {
      setUploading(true);
      try {
        const result = await options.upload(picked.file, picked.filename);
        options.onSuccess?.(result, picked.previewUri);
      } catch (err) {
        options.onError?.(err);
        console.error('Image upload failed:', err);
      } finally {
        setUploading(false);
      }
    },
    [options],
  );

  const handlePick = useCallback(async () => {
    if (uploading) return;
    try {
      const picked = await options.pick();
      if (!picked) return;

      if (isMotionFigurePick(picked)) {
        await uploadDirect(picked);
        return;
      }

      if (Platform.OS === 'web') {
        setCropPick(picked);
        return;
      }

      setUploading(true);
      try {
        const resized = await resizeImage(picked.previewUri, options.output);
        const result = await options.upload(resized.file, resized.filename);
        options.onSuccess?.(result, picked.previewUri);
      } catch (err) {
        options.onError?.(err);
        console.error('Image upload failed:', err);
      } finally {
        setUploading(false);
      }
    } catch (err) {
      options.onError?.(err);
      console.error('Image pick failed:', err);
    }
  }, [uploading, options, uploadDirect]);

  const handleCropCancel = useCallback(() => {
    if (uploading) return;
    setCropPick(null);
  }, [uploading]);

  const handleCropConfirm = useCallback(
    async (area: CroppedAreaPixels) => {
      if (!cropPick || uploading) return;
      setUploading(true);
      try {
        const source =
          typeof cropPick.file === 'object' && cropPick.file !== null && 'uri' in cropPick.file
            ? cropPick.previewUri
            : (cropPick.file as Blob);
        const cropped = await cropImage(source, area, options.output);
        const previewUri =
          typeof cropped.file === 'object' && cropped.file !== null && 'uri' in cropped.file
            ? cropped.file.uri
            : URL.createObjectURL(cropped.file as Blob);
        const result = await options.upload(cropped.file, cropped.filename);
        options.onSuccess?.(result, previewUri);
        setCropPick(null);
      } catch (err) {
        options.onError?.(err);
        console.error('Image upload failed:', err);
      } finally {
        setUploading(false);
      }
    },
    [uploading, cropPick, options],
  );

  return {
    cropPick,
    uploading,
    handlePick,
    handleCropCancel,
    handleCropConfirm,
  };
}
