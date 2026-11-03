import type { ComponentProps } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ImageGenCategory } from '../../../../../constants/imageGenCategoryPresets';
import type { ChatImageUploadFile } from '../../../../../utils/pickChatImage';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** 角色槽选中态（上传参考 / 模板） */
export type CreationCenterCharacterSelection = {
  templateId: string | null;
  prompt: string;
  previewUri?: string;
  localPreview?: ImageSourcePropType;
  /** 本地或远端参考图，后续可上传为公网 URL */
  referenceUri?: string;
  referenceFile?: ChatImageUploadFile;
  referenceFilename?: string;
  label: string;
};

/** 右侧模板网格条目 */
export type CreationCenterDisplayTemplate = {
  id: string;
  prompt: string;
  label: string;
  previewUri?: string;
  localPreview?: ImageSourcePropType;
  aspectRatio?: '9:16' | '1:1' | '16:9';
  tagCodes?: string[];
};

/** 槽位缩略信息 */
export type CreationCenterSlotSelection = {
  label: string;
  previewUri?: string;
  localPreview?: ImageSourcePropType;
};

export type CreationCenterCategoryMeta = {
  id: ImageGenCategory;
  labelKey: string;
  hintKey: string;
  icon: IoniconName;
};

/** 角色浏览器文案键（生图 / 生视频略有差异） */
export type CreationCenterCharacterCopyKeys = {
  browserHintKey: string;
  uploadTitleKey: string;
  uploadSubKey: string;
  uploadFilledSubKey: string;
};
