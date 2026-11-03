/**
 * 创作中心共用：预设底栏（自下而上滑入，可下拉关闭）。
 * 生图移动端 / 生视频窄屏共用。
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Animated,
  PanResponder,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ImageGenCategory } from '../../../../../constants/imageGenCategoryPresets';
import { useI18n } from '../../../../../i18n/I18nContext';
import { TOKENS } from '../../../theme/tokens';
import { CreationCenterPresetBrowser } from './CreationCenterPresetBrowser';
import type { CreationCenterPresetStyles } from './creationCenterPresetStyles';
import type {
  CreationCenterCategoryMeta,
  CreationCenterCharacterCopyKeys,
  CreationCenterCharacterSelection,
  CreationCenterDisplayTemplate,
} from './creationCenterPresetTypes';

type CreationCenterPresetSheetProps = {
  visible: boolean;
  onClose: () => void;
  categoryMeta: CreationCenterCategoryMeta[];
  activeCategory: ImageGenCategory;
  onChangeCategory: (category: ImageGenCategory) => void;
  styles: CreationCenterPresetStyles;
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
  loading?: boolean;
  recyclingKeyPrefix?: string;
};

export function CreationCenterPresetSheet({
  visible,
  onClose,
  categoryMeta,
  activeCategory,
  onChangeCategory,
  styles: presetStyles,
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
  loading = false,
  recyclingKeyPrefix = 'preset-sheet',
}: CreationCenterPresetSheetProps) {
  const { t } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  const sheetDragY = useRef(new Animated.Value(0)).current;
  const sheetOffscreenY = Math.max(windowHeight, 720);
  /** 固定高度，避免 ScrollView 在 Modal 内 flex 塌缩导致内容显示不全 */
  const sheetHeight = Math.min(windowHeight * 0.86, 720);
  const closingRef = useRef(false);

  /** 关闭：先滑出屏外，再通知父级卸掉 */
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(sheetDragY, {
      toValue: sheetOffscreenY,
      duration: 280,
      useNativeDriver: true,
    }).start(({ finished }) => {
      closingRef.current = false;
      if (!finished) return;
      onClose();
    });
  }, [onClose, sheetDragY, sheetOffscreenY]);

  /** 点选角色模板后收起 */
  const handleSelectCharacterTemplate = useCallback(
    (template: CreationCenterDisplayTemplate) => {
      onSelectCharacterTemplate(template);
      requestClose();
    },
    [onSelectCharacterTemplate, requestClose],
  );

  /** 点选姿势/服装/场景后收起 */
  const handleSelectPreset = useCallback(
    (category: Exclude<ImageGenCategory, 'character'>, id: string) => {
      onSelectPreset(category, id);
      requestClose();
    },
    [onSelectPreset, requestClose],
  );

  /** 自定义参考：仅在成功选好图片后收起（取消/失败保持打开） */
  const handlePickCharacterReference = useCallback(async () => {
    const result = await Promise.resolve(onPickCharacterReference());
    if (result === false) return;
    // true 或 void（兼容旧回调）都视为可关；但我们约定 pick 返回 boolean
    if (result === true) requestClose();
  }, [onPickCharacterReference, requestClose]);

  /** 打开：从屏外滑到 0 */
  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    sheetDragY.setValue(sheetOffscreenY);
    const raf = requestAnimationFrame(() => {
      Animated.timing(sheetDragY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
    return () => cancelAnimationFrame(raf);
  }, [sheetDragY, sheetOffscreenY, visible]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => {
          if (g.dy > 0) sheetDragY.setValue(g.dy);
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 110 || g.vy > 0.85) {
            requestClose();
            return;
          }
          Animated.spring(sheetDragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(sheetDragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
      }),
    [requestClose, sheetDragY],
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={requestClose}>
      <View style={sheetStyles.root}>
        <Pressable style={sheetStyles.backdrop} onPress={requestClose} />
        <Animated.View
          style={[
            sheetStyles.panel,
            {
              height: sheetHeight,
              maxHeight: sheetHeight,
              transform: [{ translateY: sheetDragY }],
            },
          ]}
        >
          <View {...sheetPanResponder.panHandlers} style={sheetStyles.dragZone}>
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.header}>
              <Pressable onPress={requestClose} hitSlop={10} style={sheetStyles.headerBtn}>
                <Ionicons name="close" size={22} color={TOKENS.colors.text} />
              </Pressable>
              <Text style={sheetStyles.title}>{t('creationCenter.presets')}</Text>
              <View style={sheetStyles.headerBtn} />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={sheetStyles.tabsScroll}
            contentContainerStyle={sheetStyles.tabs}
          >
            {categoryMeta.map((c) => {
              const active = activeCategory === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => onChangeCategory(c.id)}
                  style={[sheetStyles.tab, active && sheetStyles.tabActive]}
                >
                  <Text style={[sheetStyles.tabText, active && sheetStyles.tabTextActive]}>
                    {t(c.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            style={sheetStyles.body}
            contentContainerStyle={sheetStyles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <ActivityIndicator color={TOKENS.colors.accent} style={sheetStyles.loader} />
            ) : (
              <CreationCenterPresetBrowser
                styles={presetStyles}
                activeCategory={activeCategory}
                character={character}
                displayTemplates={displayTemplates}
                poseId={poseId}
                clothingId={clothingId}
                sceneId={sceneId}
                tileWidthStyle={tileWidthStyle}
                onPresetGridLayout={onPresetGridLayout}
                onPickCharacterReference={handlePickCharacterReference}
                onSelectCharacterTemplate={handleSelectCharacterTemplate}
                onSelectPreset={handleSelectPreset}
                characterCopy={characterCopy}
                recyclingKeyPrefix={recyclingKeyPrefix}
              />
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  panel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(16, 18, 26, 0.98)',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: TOKENS.colors.cardBorder,
    paddingBottom: Platform.OS === 'web' ? 20 : 28,
    minHeight: 420,
    width: '100%',
    flexDirection: 'column',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 -12px 40px rgba(0,0,0,0.45)',
          display: 'flex',
        } as object)
      : {}),
  },
  dragZone: {
    flexShrink: 0,
    paddingBottom: 2,
    ...(Platform.OS === 'web' ? ({ cursor: 'grab' } as object) : null),
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexShrink: 0,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: TOKENS.colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  tabsScroll: {
    flexShrink: 0,
    maxHeight: 52,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexShrink: 0,
    minHeight: 44,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabText: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  tabTextActive: {
    color: TOKENS.colors.text,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },
  loader: {
    marginVertical: 24,
  },
});
