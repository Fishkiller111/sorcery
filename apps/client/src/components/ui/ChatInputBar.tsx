import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { TYPO, Typo } from '../../theme/typography';
import { TOKENS } from '../../pages/default/theme/tokens';
import { glassWebStyle } from '../free-chat/freeChatUi';

export type ChatInputBarVariant = 'default' | 'soviet' | 'soulthread';

export type PhotoRequestStyle = 'sexy' | 'playful' | 'daily' | 'nsfw';

export type ChatInputBarProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onInterrupt?: () => void;
  placeholder?: string;
  recording?: boolean;
  asrLoading?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onAttachImage?: () => void;
  imageUploading?: boolean;
  pendingImagePreview?: string | null;
  onRemovePendingImage?: () => void;
  /** Request agent media-library photo (mic right). */
  onRequestPhoto?: (style: PhotoRequestStyle) => void;
  photoRequestEnabled?: boolean;
  photoRequestLoading?: boolean;
  showNsfwPhotoStyle?: boolean;
  showSexyPhotoStyle?: boolean;
  /** AI polish of current draft (wand). Used when photo request is not wired. */
  onPolishDraft?: (text: string) => Promise<string | void> | string | void;
  polishLoading?: boolean;
  variant?: ChatInputBarVariant;
};

/** Shared chat input — used by scene mode and FreeChat. */
export function ChatInputBar({
  onSend,
  disabled,
  isGenerating,
  onInterrupt,
  placeholder,
  recording,
  asrLoading,
  onStartRecording,
  onStopRecording,
  onAttachImage,
  imageUploading,
  pendingImagePreview,
  onRemovePendingImage,
  onRequestPhoto,
  photoRequestEnabled = false,
  photoRequestLoading = false,
  showNsfwPhotoStyle = false,
  showSexyPhotoStyle = true,
  onPolishDraft,
  polishLoading = false,
  variant = 'default',
}: ChatInputBarProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (recording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoop.current?.stop();
    };
  }, [recording, pulseAnim]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    const hasPendingImage = !!pendingImagePreview;
    if ((!trimmed && !hasPendingImage) || disabled) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  }, [text, disabled, onSend, pendingImagePreview]);

  const handleSubmitKey = useCallback(() => {
    if (isGenerating && onInterrupt) {
      onInterrupt();
      return;
    }
    handleSend();
  }, [handleSend, isGenerating, onInterrupt]);

  const handleWebKeyDown = useCallback(
    (event: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmitKey();
      }
    },
    [handleSubmitKey],
  );

  const webEnterToSendProps =
    Platform.OS === 'web'
      ? ({
          onKeyDown: handleWebKeyDown,
        } as Record<string, unknown>)
      : {};

  const canSend = (!!text.trim() || !!pendingImagePreview) && !disabled && !recording;
  const isStopMode = !!isGenerating && !!onInterrupt;
  const isSoviet = variant === 'soviet';
  const isSoulthread = variant === 'soulthread';
  /** soviet / soulthread：上输入、下工具行 */
  const isComposerLayout = isSoviet || isSoulthread;
  const playerGold = COLORS.agents.paleGold;
  const accentIcon = isSoulthread ? TOKENS.colors.navTextInactive : isSoviet ? playerGold : COLORS.accent.gold;
  const mutedPlaceholder = isSoulthread ? TOKENS.colors.textMuted : COLORS.text.muted;
  const voiceInputEnabled = !!onStartRecording && !!onStopRecording;
  const imageAttachEnabled = !!onAttachImage;

  const micPressProps = useMemo(() => {
    if (!voiceInputEnabled) return {};
    if (Platform.OS === 'web') {
      return {
        onPointerDown: (event: { preventDefault: () => void }) => {
          event.preventDefault();
          onStartRecording?.();
        },
        onPointerUp: () => onStopRecording?.(),
        onPointerLeave: () => {
          if (recording) onStopRecording?.();
        },
        onPointerCancel: () => {
          if (recording) onStopRecording?.();
        },
      } as Record<string, unknown>;
    }
    return {
      onPressIn: () => onStartRecording?.(),
      onPressOut: () => onStopRecording?.(),
    };
  }, [voiceInputEnabled, onStartRecording, onStopRecording, recording]);

  const toolBtnBase = [
    styles.toolBtn,
    isSoviet && styles.toolBtnSoviet,
    isSoulthread && styles.toolBtnSoulthread,
  ];

  /** 底部左侧：图片附件 */
  const renderAttachBtn = () => {
    if (!imageAttachEnabled) return null;
    if (imageUploading) {
      return <ActivityIndicator size="small" color={accentIcon} style={styles.toolBtnSpacer} />;
    }
    return (
      <TouchableOpacity
        style={[
          ...toolBtnBase,
          // 参考图：左侧图片按钮高亮白底
          isComposerLayout && styles.attachBtnHighlight,
          isSoulthread && styles.attachBtnHighlightSoulthread,
          isSoviet && styles.attachBtnHighlightSoviet,
        ]}
        activeOpacity={0.7}
        disabled={disabled || recording || asrLoading || isGenerating || imageUploading || !!pendingImagePreview}
        onPress={onAttachImage}
      >
        <Ionicons
          name="image-outline"
          size={20}
          color={isComposerLayout ? (isSoulthread ? '#111' : '#0a0b0f') : accentIcon}
        />
      </TouchableOpacity>
    );
  };

  /** 底部：请求写真 或 AI 润色（同色魔杖入口） */
  const renderPhotoBtn = () => {
    if (onPolishDraft && !onRequestPhoto) {
      if (polishLoading) {
        return <ActivityIndicator size="small" color={accentIcon} style={styles.toolBtnSpacer} />;
      }
      return (
        <TouchableOpacity
          style={[...toolBtnBase, styles.toolBtnGhost]}
          activeOpacity={0.7}
          disabled={disabled || recording || asrLoading || isGenerating || polishLoading || !text.trim()}
          onPress={() => {
            void (async () => {
              const draft = text.trim();
              if (!draft) return;
              const next = await onPolishDraft(draft);
              if (typeof next === 'string' && next.trim()) {
                setText(next.trim());
              }
            })();
          }}
          accessibilityLabel={t('chat.polishDraftA11y')}
        >
          <Ionicons name="color-wand-outline" size={20} color={accentIcon} />
        </TouchableOpacity>
      );
    }
    if (!onRequestPhoto) return null;
    if (photoRequestLoading) {
      return <ActivityIndicator size="small" color={accentIcon} style={styles.toolBtnSpacer} />;
    }
    return (
      <TouchableOpacity
        style={[
          ...toolBtnBase,
          styles.toolBtnGhost,
          photoMenuOpen && { borderColor: accentIcon },
        ]}
        activeOpacity={0.7}
        disabled={disabled || recording || asrLoading || isGenerating || photoRequestLoading}
        onPress={() => {
          if (!photoRequestEnabled) {
            onRequestPhoto('daily');
            return;
          }
          setPhotoMenuOpen((v) => !v);
        }}
        accessibilityLabel={t('requestPhoto.a11y')}
      >
        <Ionicons name="color-wand-outline" size={20} color={accentIcon} />
      </TouchableOpacity>
    );
  };

  /** 底部右侧：麦克风 */
  const renderMicBtn = () => {
    if (!voiceInputEnabled) return null;
    if (asrLoading) {
      return <ActivityIndicator size="small" color={accentIcon} style={styles.toolBtnSpacer} />;
    }
    return (
      <TouchableOpacity
        style={[
          ...toolBtnBase,
          recording && { backgroundColor: 'rgba(255, 107, 107, 0.2)', borderColor: '#ff6b6b' },
        ]}
        activeOpacity={0.7}
        disabled={disabled || asrLoading}
        {...micPressProps}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons
            name={recording ? 'radio-button-on' : 'mic'}
            size={20}
            color={recording ? '#ff6b6b' : accentIcon}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  /** 底部右侧：发送 / 中断 */
  const renderSendBtn = () => (
    <TouchableOpacity
      style={[
        styles.sendButton,
        isSoviet && styles.sendButtonSoviet,
        isSoulthread && styles.sendButtonSoulthread,
        !isStopMode && !canSend && styles.sendButtonDisabled,
        isSoviet && !isStopMode && !canSend && styles.sendButtonSovietDisabled,
        isSoulthread && !isStopMode && !canSend && styles.sendButtonSoulthreadDisabled,
      ]}
      onPress={isStopMode ? onInterrupt : handleSend}
      disabled={!isStopMode && !canSend}
      activeOpacity={0.7}
    >
      {isComposerLayout ? (
        <Ionicons name={isStopMode ? 'stop' : 'paper-plane'} size={18} color="#fff" />
      ) : (
        <Text style={styles.sendText}>{t('input.send')}</Text>
      )}
    </TouchableOpacity>
  );

  // ─── Composer 布局（上输入 / 下工具），对齐参考图 ───
  if (isComposerLayout) {
    return (
      <View
        style={[
          styles.container,
          isSoviet && styles.containerSoviet,
          isSoulthread && styles.containerSoulthread,
        ]}
      >
        {pendingImagePreview ? (
          <View style={styles.pendingRow}>
            <Image source={{ uri: pendingImagePreview }} style={styles.pendingThumb} contentFit="cover" />
            {onRemovePendingImage ? (
              <TouchableOpacity
                style={styles.pendingRemove}
                onPress={onRemovePendingImage}
                activeOpacity={0.7}
                accessibilityLabel="Remove image"
              >
                <Ionicons name="close-circle" size={22} color={COLORS.text.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.composerShell,
            isSoviet && styles.composerShellSoviet,
            isSoulthread && styles.composerShellSoulthread,
          ]}
        >
          <TextInput
            style={[
              styles.composerInput,
              isSoviet && styles.composerInputSoviet,
              isSoulthread && styles.composerInputSoulthread,
            ]}
            value={text}
            onChangeText={setText}
            placeholder={recording ? t('chat.recording') : (placeholder ?? t('input.placeholder'))}
            placeholderTextColor={mutedPlaceholder}
            multiline
            maxLength={280}
            editable={!disabled && !recording && !asrLoading}
            returnKeyType="send"
            enterKeyHint="send"
            submitBehavior="submit"
            onSubmitEditing={handleSubmitKey}
            blurOnSubmit={false}
            {...webEnterToSendProps}
          />

          <View style={styles.composerToolbar}>
            <View style={styles.composerToolbarLeft}>
              {renderAttachBtn()}
            </View>
            <View style={styles.composerToolbarRight}>
              {renderPhotoBtn()}
              {/* 无内容可发送 / 生成中：显示发送或中断；否则显示麦克风 */}
              {isStopMode || canSend ? renderSendBtn() : renderMicBtn()}
            </View>
          </View>
        </View>

        {recording && voiceInputEnabled ? (
          <Text style={styles.hint}>{t('input.holdToTalk')}</Text>
        ) : null}
        {photoMenuOpen && onRequestPhoto && photoRequestEnabled ? (
          <View style={styles.photoMenu}>
            {(
              [
                ...(showSexyPhotoStyle
                  ? [{ style: 'sexy' as const, labelKey: 'requestPhoto.styleSexy' }]
                  : []),
                { style: 'playful' as const, labelKey: 'requestPhoto.stylePlayful' },
                { style: 'daily' as const, labelKey: 'requestPhoto.styleDaily' },
                ...(showNsfwPhotoStyle
                  ? [{ style: 'nsfw' as const, labelKey: 'requestPhoto.styleNsfw' }]
                  : []),
              ] as const
            ).map((item) => (
              <TouchableOpacity
                key={item.style}
                style={styles.photoChip}
                activeOpacity={0.8}
                disabled={disabled || photoRequestLoading}
                onPress={() => {
                  setPhotoMenuOpen(false);
                  onRequestPhoto(item.style);
                }}
              >
                <Text style={styles.photoChipText}>{t(item.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  // ─── 默认单行布局（场景模式等） ───
  return (
    <View style={styles.container}>
      {pendingImagePreview ? (
        <View style={styles.pendingRow}>
          <Image source={{ uri: pendingImagePreview }} style={styles.pendingThumb} contentFit="cover" />
          {onRemovePendingImage ? (
            <TouchableOpacity
              style={styles.pendingRemove}
              onPress={onRemovePendingImage}
              activeOpacity={0.7}
              accessibilityLabel="Remove image"
            >
              <Ionicons name="close-circle" size={22} color={COLORS.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      <View style={styles.inputWrapper}>
        {imageAttachEnabled && (
          imageUploading ? (
            <ActivityIndicator size="small" color={accentIcon} style={styles.attachBtn} />
          ) : (
            <TouchableOpacity
              style={styles.attachBtn}
              activeOpacity={0.7}
              disabled={disabled || recording || asrLoading || isGenerating || imageUploading || !!pendingImagePreview}
              onPress={onAttachImage}
            >
              <Ionicons name="image-outline" size={20} color={accentIcon} />
            </TouchableOpacity>
          )
        )}
        {voiceInputEnabled && (asrLoading ? (
          <ActivityIndicator size="small" color={accentIcon} style={styles.micBtn} />
        ) : (
          <TouchableOpacity
            style={[
              styles.micBtn,
              recording && { backgroundColor: 'rgba(255, 107, 107, 0.2)', borderColor: '#ff6b6b' },
            ]}
            activeOpacity={0.7}
            disabled={disabled || asrLoading}
            {...micPressProps}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons
                name={recording ? 'radio-button-on' : 'mic'}
                size={20}
                color={recording ? '#ff6b6b' : accentIcon}
              />
            </Animated.View>
          </TouchableOpacity>
        ))}

        {onRequestPhoto ? (
          photoRequestLoading ? (
            <ActivityIndicator size="small" color={accentIcon} style={styles.micBtn} />
          ) : (
            <TouchableOpacity
              style={[
                styles.micBtn,
                photoMenuOpen && { borderColor: accentIcon },
              ]}
              activeOpacity={0.7}
              disabled={disabled || recording || asrLoading || isGenerating || photoRequestLoading}
              onPress={() => {
                if (!photoRequestEnabled) {
                  onRequestPhoto('daily');
                  return;
                }
                setPhotoMenuOpen((v) => !v);
              }}
              accessibilityLabel={t('requestPhoto.a11y')}
            >
              <Ionicons name="color-wand-outline" size={20} color={accentIcon} />
            </TouchableOpacity>
          )
        ) : null}

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={recording ? t('chat.recording') : (placeholder ?? t('input.placeholder'))}
          placeholderTextColor={mutedPlaceholder}
          multiline
          maxLength={280}
          editable={!disabled && !recording && !asrLoading}
          returnKeyType="send"
          enterKeyHint="send"
          submitBehavior="submit"
          onSubmitEditing={handleSubmitKey}
          blurOnSubmit={false}
          {...webEnterToSendProps}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !isStopMode && !canSend && styles.sendButtonDisabled,
          ]}
          onPress={isStopMode ? onInterrupt : handleSend}
          disabled={!isStopMode && !canSend}
          activeOpacity={0.7}
        >
          <Text style={styles.sendText}>{t('input.send')}</Text>
        </TouchableOpacity>
      </View>
      {recording && voiceInputEnabled && (
        <Text style={styles.hint}>{t('input.holdToTalk')}</Text>
      )}
      {photoMenuOpen && onRequestPhoto && photoRequestEnabled ? (
        <View style={styles.photoMenu}>
          {(
            [
              ...(showSexyPhotoStyle
                ? [{ style: 'sexy' as const, labelKey: 'requestPhoto.styleSexy' }]
                : []),
              { style: 'playful' as const, labelKey: 'requestPhoto.stylePlayful' },
              { style: 'daily' as const, labelKey: 'requestPhoto.styleDaily' },
              ...(showNsfwPhotoStyle
                ? [{ style: 'nsfw' as const, labelKey: 'requestPhoto.styleNsfw' }]
                : []),
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.style}
              style={styles.photoChip}
              activeOpacity={0.8}
              disabled={disabled || photoRequestLoading}
              onPress={() => {
                setPhotoMenuOpen(false);
                onRequestPhoto(item.style);
              }}
            >
              <Text style={styles.photoChipText}>{t(item.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 11, 15, 0.85)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  containerSoviet: {
    backgroundColor: '#08090C',
    borderTopColor: COLORS.agents.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  containerSoulthread: {
    backgroundColor: TOKENS.colors.bg,
    borderTopColor: TOKENS.colors.cardBorder,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  /** Composer 外壳：圆角大卡片，内含输入 + 工具行 */
  composerShell: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  composerShellSoviet: {
    backgroundColor: 'rgba(14, 15, 20, 0.95)',
    borderColor: 'rgba(232, 213, 181, 0.18)',
  },
  composerShellSoulthread: {
    backgroundColor: TOKENS.colors.inputBg,
    borderColor: TOKENS.colors.inputBorder,
    ...glassWebStyle,
  },
  composerInput: {
    minHeight: 44,
    maxHeight: 120,
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
    ...TYPO.sans,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  composerInputSoviet: {
    color: COLORS.text.primary,
  },
  composerInputSoulthread: {
    color: TOKENS.colors.text,
  },
  composerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  composerToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? ({ userSelect: 'none', touchAction: 'none' } as Record<string, string>)
      : {}),
  },
  toolBtnSoviet: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(232, 213, 181, 0.16)',
  },
  toolBtnSoulthread: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: TOKENS.colors.cardBorder,
  },
  toolBtnGhost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  toolBtnSpacer: {
    width: 36,
    height: 36,
  },
  /** 参考图左侧图片按钮：白底高对比 */
  attachBtnHighlight: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  attachBtnHighlightSoulthread: {
    backgroundColor: '#F3F3F3',
    borderColor: '#F3F3F3',
  },
  attachBtnHighlightSoviet: {
    backgroundColor: COLORS.agents.paleGold,
    borderColor: COLORS.agents.paleGold,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(20, 22, 28, 0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    ...(Platform.OS === 'web'
      ? ({ userSelect: 'none', touchAction: 'none' } as Record<string, string>)
      : {}),
  },
  attachBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 80,
    paddingTop: 8,
    paddingBottom: 8,
    ...TYPO.sans,
  },
  sendButton: {
    backgroundColor: COLORS.accent.gold,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(201, 162, 39, 0.35)',
  },
  sendButtonSoviet: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent.redDark,
    borderWidth: 1,
    borderColor: COLORS.accent.red,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginLeft: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonSovietDisabled: {
    backgroundColor: 'rgba(139, 26, 26, 0.45)',
    borderColor: 'rgba(158, 27, 27, 0.4)',
  },
  sendButtonSoulthread: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.accent,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginLeft: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonSoulthreadDisabled: {
    backgroundColor: 'rgba(186, 60, 71, 0.35)',
    borderColor: 'rgba(186, 60, 71, 0.28)',
  },
  sendText: Typo(
    {
      color: '#0a0b0f',
      fontWeight: '700',
      fontSize: 13,
    },
    'display',
  ),
  hint: {
    fontSize: 11,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginTop: 6,
    ...TYPO.sans,
  },
  photoMenu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  photoChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 181, 0.28)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  photoChipText: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '600',
    ...TYPO.sans,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pendingThumb: {
    width: 56,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pendingRemove: {
    padding: 4,
  },
});
