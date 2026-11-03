import React from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  Image as RNImage,
  type ImageSourcePropType,
  type StyleProp,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  type ImageGenCategory,
  presetsForCategory,
  type ImageGenPresetOption,
} from '../../../../../constants/imageGenCategoryPresets';
import { useI18n } from '../../../../../i18n/I18nContext';
import type { CreationCenterPresetStyles } from './creationCenterPresetStyles';
import type {
  CreationCenterCharacterCopyKeys,
  CreationCenterCharacterSelection,
  CreationCenterDisplayTemplate,
} from './creationCenterPresetTypes';

type CreationCenterPresetBrowserProps = {
  styles: CreationCenterPresetStyles;
  activeCategory: ImageGenCategory;
  character: CreationCenterCharacterSelection | null;
  displayTemplates: CreationCenterDisplayTemplate[];
  poseId: string | null;
  clothingId: string | null;
  sceneId: string | null;
  tileWidthStyle: StyleProp<ViewStyle>;
  onPresetGridLayout: (e: { nativeEvent: { layout: { width: number } } }) => void;
  onPickCharacterReference: () => void | boolean | Promise<void | boolean>;
  onSelectCharacterTemplate: (template: CreationCenterDisplayTemplate) => void;
  onSelectPreset: (category: Exclude<ImageGenCategory, 'character'>, id: string) => void;
  characterCopy: CreationCenterCharacterCopyKeys;
  recyclingKeyPrefix?: string;
};

/** iOS 审核：预设区仅展示文字卡片，不加载敏感预览图 */
const IOS_TEXT_ONLY_PRESETS = Platform.OS === 'ios';

function PresetStillImage({
  source,
  style,
  recyclingKey,
}: {
  source: ImageSourcePropType | { uri: string };
  style: StyleProp<ImageStyle>;
  recyclingKey: string;
}) {
  if (Platform.OS === 'web') {
    return (
      <ExpoImage
        source={source}
        style={style}
        contentFit="cover"
        contentPosition="top"
        recyclingKey={recyclingKey}
      />
    );
  }
  return <RNImage source={source} style={style} resizeMode="cover" />;
}

/** 右侧预设浏览器：角色上传+模板，或姿势/服装/场景网格 */
export function CreationCenterPresetBrowser({
  styles,
  activeCategory,
  character,
  displayTemplates,
  poseId,
  clothingId,
  sceneId,
  tileWidthStyle,
  onPresetGridLayout,
  onPickCharacterReference,
  onSelectCharacterTemplate,
  onSelectPreset,
  characterCopy,
  recyclingKeyPrefix = 'preset',
}: CreationCenterPresetBrowserProps) {
  const { t } = useI18n();

  if (activeCategory === 'character') {
    return (
      <View style={styles.browserSection}>
        <Text style={styles.browserTitle}>{t('creationCenter.categoryCharacter')}</Text>
        <Text style={styles.browserHint}>{t(characterCopy.browserHintKey)}</Text>
        <Pressable
          onPress={() => {
            void onPickCharacterReference();
          }}
          style={({ pressed }) => [
            styles.uploadCard,
            character?.templateId == null && character?.previewUri
              ? styles.uploadCardFilled
              : null,
            pressed && styles.cardPressed,
          ]}
        >
          {character?.templateId == null && character?.previewUri ? (
            <>
              <View style={styles.uploadPreviewFrame}>
                <PresetStillImage
                  source={{ uri: character.previewUri }}
                  style={styles.uploadPreview}
                  recyclingKey={`${recyclingKeyPrefix}-character-reference`}
                />
              </View>
              <View style={styles.uploadPreviewMeta}>
                <Text style={styles.uploadText} numberOfLines={1}>
                  {character.label || t(characterCopy.uploadTitleKey)}
                </Text>
                <Text style={[styles.uploadSub, styles.uploadSubFilled]}>
                  {t(characterCopy.uploadFilledSubKey)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.uploadEmoji}>＋</Text>
              <Text style={styles.uploadText}>{t(characterCopy.uploadTitleKey)}</Text>
              <Text style={styles.uploadSub}>{t(characterCopy.uploadSubKey)}</Text>
            </>
          )}
        </Pressable>
        <View style={styles.presetGrid} onLayout={onPresetGridLayout}>
          {displayTemplates.map((template) => {
            const active = character?.templateId === template.id;
            return (
              <Pressable
                key={template.id}
                onPress={() => onSelectCharacterTemplate(template)}
                style={[
                  styles.presetTile,
                  IOS_TEXT_ONLY_PRESETS && styles.presetTileTextOnly,
                  tileWidthStyle,
                  active && styles.presetTileActive,
                ]}
              >
                {IOS_TEXT_ONLY_PRESETS ? (
                  <Text style={styles.presetTileTextLabel} numberOfLines={4}>
                    {template.label}
                  </Text>
                ) : (
                  <>
                    <PresetStillImage
                      source={
                        template.previewUri
                          ? { uri: template.previewUri }
                          : (template.localPreview as ImageSourcePropType)
                      }
                      style={styles.presetTileImage}
                      recyclingKey={`${recyclingKeyPrefix}-tpl-${template.id}`}
                    />
                    <View style={styles.presetTileLabelBar}>
                      <Text style={styles.presetTileLabel} numberOfLines={2}>
                        {template.label}
                      </Text>
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const category = activeCategory;
  const options: ImageGenPresetOption[] = presetsForCategory(category);
  const selectedId =
    category === 'pose' ? poseId : category === 'clothing' ? clothingId : sceneId;
  const titleKey =
    category === 'pose'
      ? 'creationCenter.categoryPose'
      : category === 'clothing'
        ? 'creationCenter.categoryClothing'
        : 'creationCenter.categoryScene';

  return (
    <View style={styles.browserSection}>
      <Text style={styles.browserTitle}>{t(titleKey)}</Text>
      <View style={styles.presetGrid} onLayout={onPresetGridLayout}>
        {options.map((opt) => {
          const active = selectedId === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelectPreset(category, opt.id)}
              style={[
                styles.presetTile,
                (IOS_TEXT_ONLY_PRESETS || !opt.preview) && styles.presetTileTextOnly,
                !IOS_TEXT_ONLY_PRESETS && !opt.preview && styles.presetTileSymbol,
                tileWidthStyle,
                active && styles.presetTileActive,
              ]}
            >
              {IOS_TEXT_ONLY_PRESETS ? (
                <>
                  {opt.emoji ? <Text style={styles.presetSymbol}>{opt.emoji}</Text> : null}
                  <Text style={styles.presetTileTextLabel} numberOfLines={4}>
                    {t(opt.labelKey)}
                  </Text>
                </>
              ) : opt.preview ? (
                <>
                  <PresetStillImage
                    source={opt.preview as ImageSourcePropType}
                    style={styles.presetTileImage}
                    recyclingKey={`${recyclingKeyPrefix}-${category}-${opt.id}`}
                  />
                  <View style={styles.presetTileLabelBar}>
                    <Text style={styles.presetTileLabel} numberOfLines={2}>
                      {t(opt.labelKey)}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.presetSymbol}>{opt.emoji || '•'}</Text>
                  <View style={styles.presetTileLabelBar}>
                    <Text style={styles.presetTileLabel} numberOfLines={2}>
                      {t(opt.labelKey)}
                    </Text>
                  </View>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
