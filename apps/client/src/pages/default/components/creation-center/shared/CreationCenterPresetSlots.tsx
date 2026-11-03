import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ImageGenCategory } from '../../../../../constants/imageGenCategoryPresets';
import { useI18n } from '../../../../../i18n/I18nContext';
import { TOKENS } from '../../../theme/tokens';
import { BreathingSlotFrame } from './BreathingSlotFrame';
import type { CreationCenterPresetStyles } from './creationCenterPresetStyles';
import type {
  CreationCenterCategoryMeta,
  CreationCenterSlotSelection,
} from './creationCenterPresetTypes';

type CreationCenterPresetSlotsProps = {
  styles: CreationCenterPresetStyles;
  isDesktop: boolean;
  categoryMeta: CreationCenterCategoryMeta[];
  activeCategory: ImageGenCategory;
  onSelectCategory: (category: ImageGenCategory) => void;
  slotSelection: (category: ImageGenCategory) => CreationCenterSlotSelection | null;
  onClearCategory: (category: ImageGenCategory) => void;
  /** recyclingKey 前缀，避免生图/生视频图片缓存冲突 */
  recyclingKeyPrefix?: string;
};

/** iOS 预设槽仅展示文字，不加载预览图 */
const IOS_TEXT_ONLY_PRESETS = Platform.OS === 'ios';

/** 左侧四分类预设槽（桌面网格 / 移动横向滚动） */
export function CreationCenterPresetSlots({
  styles,
  isDesktop,
  categoryMeta,
  activeCategory,
  onSelectCategory,
  slotSelection,
  onClearCategory,
  recyclingKeyPrefix = 'slot',
}: CreationCenterPresetSlotsProps) {
  const { t } = useI18n();

  const renderSlotCard = (category: ImageGenCategory, compact?: boolean) => {
    const metaItem = categoryMeta.find((c) => c.id === category)!;
    const selected = slotSelection(category);
    const active = activeCategory === category;
    return (
      <BreathingSlotFrame
        key={category}
        active={active}
        compact={compact}
        style={compact ? styles.slotCardCompact : styles.slotCardSize}
      >
        <Pressable
          onPress={() => onSelectCategory(category)}
          style={[styles.slotCard, active && styles.slotCardActive]}
        >
          {selected ? (
            <>
              {IOS_TEXT_ONLY_PRESETS ? (
                <View style={styles.slotFallback}>
                  <View style={[styles.slotIconBadge, styles.slotIconBadgeActive]}>
                    <Ionicons name={metaItem.icon} size={22} color={TOKENS.colors.accent} />
                  </View>
                  <Text style={styles.slotEmptyLabel} numberOfLines={3}>
                    {selected.label}
                  </Text>
                </View>
              ) : selected.previewUri || selected.localPreview != null ? (
                <ExpoImage
                  source={
                    selected.previewUri
                      ? { uri: selected.previewUri }
                      : selected.localPreview!
                  }
                  style={styles.slotImage}
                  contentFit="cover"
                  contentPosition="top"
                  recyclingKey={`${recyclingKeyPrefix}-${category}`}
                />
              ) : (
                <View style={styles.slotFallback}>
                  <View style={styles.slotIconBadge}>
                    <Ionicons name={metaItem.icon} size={22} color={TOKENS.colors.textSecondary} />
                  </View>
                </View>
              )}
              {!IOS_TEXT_ONLY_PRESETS ? (
                <View style={styles.slotLabelBar}>
                  <Text style={styles.slotLabel} numberOfLines={1}>
                    {selected.label}
                  </Text>
                </View>
              ) : null}
              <Pressable
                hitSlop={8}
                onPress={() => onClearCategory(category)}
                style={styles.slotClear}
              >
                <Text style={styles.slotClearText}>×</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.slotEmpty}>
              <View style={[styles.slotIconBadge, active && styles.slotIconBadgeActive]}>
                <Ionicons
                  name={metaItem.icon}
                  size={compact ? 22 : 26}
                  color={active ? TOKENS.colors.accent : 'rgba(242, 242, 244, 0.72)'}
                />
              </View>
              <Text style={styles.slotEmptyLabel} numberOfLines={2}>
                {t(metaItem.labelKey)}
              </Text>
              <Text style={styles.slotEmptyHint} numberOfLines={2}>
                {t(metaItem.hintKey)}
              </Text>
            </View>
          )}
        </Pressable>
      </BreathingSlotFrame>
    );
  };

  return (
    <>
      <Text style={styles.presetsHeading}>{t('creationCenter.presets')}</Text>
      <View style={styles.slotGrid}>
        {categoryMeta.map((c) => renderSlotCard(c.id))}
      </View>
    </>
  );
}
