import { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  buildComposedImagePrompt,
  CLOTHING_PRESETS,
  type ImageGenCategory,
  POSE_PRESETS,
  SCENE_PRESETS,
} from '../../../../../constants/imageGenCategoryPresets';
import { useIsDesktop } from '../../../../../hooks/useIsDesktop';
import { useI18n } from '../../../../../i18n/I18nContext';
import { formatApiError } from '../../../../../utils/apiError';
import { notifyError } from '../../../../../utils/notify';
import {
  pickChatImage,
  PhotoPermissionDeniedError,
} from '../../../../../utils/pickChatImage';
import { promptPhotoLibraryAccessSettings } from '../../../../../utils/promptPhotoLibraryAccessSettings';
import { getCreationCenterCategoryMeta } from './creationCenterPresetMeta';
import type {
  CreationCenterCharacterSelection,
  CreationCenterDisplayTemplate,
  CreationCenterSlotSelection,
} from './creationCenterPresetTypes';

type UseCreationCenterPresetSelectionOptions = {
  /** 覆盖角色槽 hint i18n key */
  characterHintKey?: string;
  /** 相册权限拒绝时的文案 key */
  photoPermissionDeniedKey?: string;
  /** 选中模板后的额外副作用（如生图同步 aspect / tags） */
  onTemplateSelected?: (template: CreationCenterDisplayTemplate) => void;
  /** 角色变更时的回调（如生视频清空结果占位） */
  onCharacterChanged?: () => void;
  /**
   * 覆盖桌面判定（生视频三列工作室在宽度不足时强制走移动端槽位/列数）。
   * 不传则用全局 useIsDesktop。
   */
  isDesktopOverride?: boolean;
};

/**
 * 生图 / 生视频共用的预设选中态与拼装逻辑。
 */
export function useCreationCenterPresetSelection(
  options: UseCreationCenterPresetSelectionOptions = {},
) {
  const {
    characterHintKey,
    photoPermissionDeniedKey = 'creationCenter.photoPermissionDenied',
    onTemplateSelected,
    onCharacterChanged,
    isDesktopOverride,
  } = options;
  const { t } = useI18n();
  const isDesktopGlobal = useIsDesktop();
  const isDesktop = isDesktopOverride ?? isDesktopGlobal;

  const [activeCategory, setActiveCategory] = useState<ImageGenCategory>('character');
  const [character, setCharacter] = useState<CreationCenterCharacterSelection | null>(null);
  const [poseId, setPoseId] = useState<string | null>(null);
  const [clothingId, setClothingId] = useState<string | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [presetGridWidth, setPresetGridWidth] = useState(0);

  const categoryMeta = useMemo(
    () => getCreationCenterCategoryMeta(characterHintKey),
    [characterHintKey],
  );

  const pose = useMemo(() => POSE_PRESETS.find((p) => p.id === poseId) ?? null, [poseId]);
  const clothing = useMemo(
    () => CLOTHING_PRESETS.find((p) => p.id === clothingId) ?? null,
    [clothingId],
  );
  const scene = useMemo(() => SCENE_PRESETS.find((p) => p.id === sceneId) ?? null, [sceneId]);

  const composedPrompt = useMemo(
    () =>
      buildComposedImagePrompt({
        characterPrompt: character?.prompt,
        posePrompt: pose?.promptPart,
        clothingPrompt: clothing?.promptPart,
        scenePrompt: scene?.promptPart,
        customPrompt,
      }),
    [character?.prompt, clothing?.promptPart, customPrompt, pose?.promptPart, scene?.promptPart],
  );

  const selectCharacterTemplate = useCallback(
    (template: CreationCenterDisplayTemplate) => {
      setCharacter({
        templateId: template.id,
        prompt: template.prompt,
        previewUri: template.previewUri,
        localPreview: template.localPreview,
        referenceUri: undefined,
        referenceFile: undefined,
        referenceFilename: undefined,
        label: template.label,
      });
      onTemplateSelected?.(template);
      onCharacterChanged?.();
    },
    [onCharacterChanged, onTemplateSelected],
  );

  const clearCharacter = useCallback(() => {
    setCharacter(null);
    onCharacterChanged?.();
  }, [onCharacterChanged]);

  const pickCharacterReference = useCallback(async (): Promise<boolean> => {
    try {
      const picked = await pickChatImage();
      if (!picked) return false;
      setCharacter((prev) => ({
        templateId: null,
        prompt: prev?.prompt?.trim() || t('creationCenter.characterReferencePrompt'),
        previewUri: picked.previewUri,
        localPreview: undefined,
        referenceUri: picked.previewUri,
        referenceFile: picked.file,
        referenceFilename: picked.filename,
        label: t('creationCenter.characterUploadLabel'),
      }));
      onCharacterChanged?.();
      return true;
    } catch (e) {
      if (e instanceof PhotoPermissionDeniedError) {
        promptPhotoLibraryAccessSettings(t);
      } else {
        notifyError(formatApiError(t, e));
      }
      return false;
    }
  }, [onCharacterChanged, photoPermissionDeniedKey, t]);

  const applyDeepLinkReference = useCallback(
    (referenceUrl: string, roleName?: string) => {
      setActiveCategory('character');
      setCharacter({
        templateId: null,
        prompt: t('creationCenter.characterReferencePrompt'),
        previewUri: referenceUrl,
        localPreview: undefined,
        referenceUri: referenceUrl,
        label: roleName || t('creationCenter.characterUploadLabel'),
      });
      onCharacterChanged?.();
    },
    [onCharacterChanged, t],
  );

  const slotSelection = useCallback(
    (category: ImageGenCategory): CreationCenterSlotSelection | null => {
      if (category === 'character') {
        if (!character) return null;
        return {
          label: character.label,
          previewUri: character.previewUri,
          localPreview: character.localPreview,
        };
      }
      const preset = category === 'pose' ? pose : category === 'clothing' ? clothing : scene;
      if (!preset) return null;
      return {
        label: t(preset.labelKey),
        localPreview: preset.preview,
      };
    },
    [character, clothing, pose, scene, t],
  );

  const clearCategory = useCallback(
    (category: ImageGenCategory) => {
      if (category === 'character') clearCharacter();
      else if (category === 'pose') setPoseId(null);
      else if (category === 'clothing') setClothingId(null);
      else setSceneId(null);
    },
    [clearCharacter],
  );

  const selectPreset = useCallback(
    (category: Exclude<ImageGenCategory, 'character'>, id: string) => {
      if (category === 'pose') setPoseId((prev) => (prev === id ? null : id));
      else if (category === 'clothing') setClothingId((prev) => (prev === id ? null : id));
      else setSceneId((prev) => (prev === id ? null : id));
    },
    [],
  );

  /**
   * 列数：移动端固定 2；桌面按网格宽度 2/3/4。
   * 卡片必须给明确 height——iOS 上仅 width + aspectRatio + 绝对定位图会塌成细线。
   */
  const browserColumns = useMemo(() => {
    if (!isDesktop) return 2;
    if (presetGridWidth >= 560) return 4;
    if (presetGridWidth >= 400) return 3;
    return 2;
  }, [isDesktop, presetGridWidth]);
  const presetGap = 10;
  /** 预设卡宽高比：宽/高 = 9/16 */
  const PRESET_TILE_ASPECT = 9 / 16;
  const { width: windowWidth } = useWindowDimensions();
  const tileWidthStyle = useMemo(() => {
    // Modal 内首帧 onLayout 可能为 0；用屏宽估算，避免百分比宽度在 iOS flexWrap 里高度为 0
    const gridW =
      presetGridWidth > 0
        ? presetGridWidth
        : Math.max(200, windowWidth - (isDesktop ? 120 : 48));
    const width = Math.max(
      120,
      (gridW - presetGap * (browserColumns - 1)) / browserColumns,
    );
    const height = width / PRESET_TILE_ASPECT;
    return { width, height, flexGrow: 0, flexShrink: 0 };
  }, [browserColumns, isDesktop, presetGap, presetGridWidth, windowWidth]);

  const onPresetGridLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      const w = e.nativeEvent.layout.width;
      if (w > 0 && Math.abs(w - presetGridWidth) > 1) {
        setPresetGridWidth(w);
      }
    },
    [presetGridWidth],
  );

  return {
    isDesktop,
    categoryMeta,
    activeCategory,
    setActiveCategory,
    character,
    setCharacter,
    poseId,
    clothingId,
    sceneId,
    pose,
    clothing,
    scene,
    customPrompt,
    setCustomPrompt,
    composedPrompt,
    selectCharacterTemplate,
    clearCharacter,
    pickCharacterReference,
    applyDeepLinkReference,
    slotSelection,
    clearCategory,
    selectPreset,
    tileWidthStyle,
    onPresetGridLayout,
  };
}
