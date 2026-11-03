import type { ImageGenCategory } from '../../../../../constants/imageGenCategoryPresets';
import type { CreationCenterCategoryMeta } from './creationCenterPresetTypes';

const BASE_CATEGORY_META: Omit<CreationCenterCategoryMeta, 'hintKey'>[] = [
  {
    id: 'character',
    labelKey: 'creationCenter.categoryCharacter',
    icon: 'person-outline',
  },
  {
    id: 'pose',
    labelKey: 'creationCenter.categoryPose',
    icon: 'body-outline',
  },
  {
    id: 'clothing',
    labelKey: 'creationCenter.categoryClothing',
    icon: 'shirt-outline',
  },
  {
    id: 'scene',
    labelKey: 'creationCenter.categoryScene',
    icon: 'images-outline',
  },
];

const DEFAULT_HINTS: Record<ImageGenCategory, string> = {
  character: 'creationCenter.categoryCharacterHint',
  pose: 'creationCenter.categoryPoseHint',
  clothing: 'creationCenter.categoryClothingHint',
  scene: 'creationCenter.categorySceneHint',
};

/**
 * 预设分类元数据；可覆盖角色槽 hint（生视频为「起始帧必选」）。
 */
export function getCreationCenterCategoryMeta(
  characterHintKey?: string,
): CreationCenterCategoryMeta[] {
  return BASE_CATEGORY_META.map((item) => ({
    ...item,
    hintKey:
      item.id === 'character' && characterHintKey
        ? characterHintKey
        : DEFAULT_HINTS[item.id],
  }));
}
