import type { CroppedAreaPixels } from '../../utils/cropAvatarImage';

export type CropModalVariant = 'avatar' | 'figure';

/** 裁切 Modal 的 props，Web / 原生共用。 */
export type AvatarCropModalProps = {
  visible: boolean;
  imageUri: string;
  loading?: boolean;
  onConfirm: (area: CroppedAreaPixels) => void;
  onCancel: () => void;
  /** avatar: 1:1 圆形；figure: 9:16 长方形 */
  variant?: CropModalVariant;
};
