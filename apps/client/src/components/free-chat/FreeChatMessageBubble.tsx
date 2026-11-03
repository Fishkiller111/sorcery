import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo, TYPO } from '../../theme/typography';
import { resolveStaticUrl } from '../../constants/config';
import { ChatBubble } from '../ui/ChatBubble';
import { ChatMessageBody } from '../chat/ChatMessageBody';
import { ChatBubbleImage } from '../chat/ChatBubbleImage';
import type { FreeChatMessage } from '../../types/api';
import type { ImageSourcePropType } from 'react-native';
import { TOKENS } from '../../pages/default/theme/tokens';
import { VerifiedRealPersonBadge } from '../agent/VerifiedRealPersonBadge';
import { type FreeChatUiVariant, glassWebStyle } from './freeChatUi';

function formatMessageTime(timestamp?: number | string): string {
  if (timestamp === undefined || timestamp === null) return '';
  const d = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

interface FreeChatMessageBubbleProps {
  message: FreeChatMessage;
  index: number;
  voiceEnabled?: boolean;
  isStreamingAudio?: boolean;
  isPlayingAudio?: boolean;
  onToggleAudio?: (msgId: string) => void;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  playerBackgroundImage?: ImageSourcePropType;
  agentBackgroundImage?: ImageSourcePropType;
  bubbleCapInsets?: { left: number; top: number; right: number; bottom: number };
  variant?: FreeChatUiVariant;
  verifiedRealPerson?: boolean;
}

export function FreeChatMessageBubble({
  message,
  index: _index,
  voiceEnabled,
  isStreamingAudio,
  isPlayingAudio,
  onToggleAudio,
  canRegenerate,
  onRegenerate,
  playerBackgroundImage,
  agentBackgroundImage,
  bubbleCapInsets,
  variant = 'soviet',
  verifiedRealPerson,
}: FreeChatMessageBubbleProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const isDefault = variant === 'default';
  const isPlayer = message.role === 'player';
  const isSystem = message.role === 'system';
  const agentName = message.agentName || t('freeChat.defaultAgentName');
  const agentColor = message.agentColor || COLORS.accent.gold;
  const portraitUrl = isPlayer ? message.playerAvatar : message.agentAvatar;
  const avatarSource = portraitUrl ? { uri: resolveStaticUrl(portraitUrl) } : undefined;
  const hasAudio = !!message.audioData && !!message.audioFormat;
  const timeLabel = formatMessageTime(message.timestamp);
  const showAudioControl =
    !isPlayer && (hasAudio || (voiceEnabled && isStreamingAudio)) && !!onToggleAudio;
  const imageUri = message.imageUrl ? resolveStaticUrl(message.imageUrl) : '';
  const captionText =
    message.text.trim() === '[Image]' ? '' : message.text.trim();

  if (isSystem) {
    const narrationLike = message.text.trim().length > 28 || /[\u4e00-\u9fff]/.test(message.text);
    return (
      <View style={[styles.systemRow, narrationLike && styles.systemRowNarration]}>
        {!narrationLike ? (
          <View style={[styles.systemLine, isDefault && styles.systemLineDefault]} />
        ) : null}
        <Text
          style={[
            styles.systemText,
            isDefault && styles.systemTextDefault,
            narrationLike && styles.systemTextNarration,
            narrationLike && isDefault && styles.systemTextNarrationDefault,
          ]}
        >
          {message.text}
        </Text>
        {!narrationLike ? (
          <View style={[styles.systemLine, isDefault && styles.systemLineDefault]} />
        ) : null}
      </View>
    );
  }

  const playerBubbleBg = isDefault ? TOKENS.colors.card : 'rgba(14, 15, 20, 0.92)';
  const agentBubbleBg = isDefault ? TOKENS.colors.card : 'rgba(18, 20, 26, 0.94)';
  const playerBorder = isDefault ? TOKENS.colors.inviteBannerBorder : COLORS.accent.red;
  const agentBorder = isDefault ? TOKENS.colors.cardBorder : 'rgba(232, 213, 181, 0.28)';
  const bubbleRadius = isDefault ? TOKENS.radius.card : 6;
  const useBubbleImage = !isDefault;

  const avatar = avatarSource ? (
    <View style={{ position: 'relative' }}>
      <Image
        source={avatarSource}
        style={[styles.portrait, isPlayer && styles.portraitPlayer, isDefault && styles.portraitDefault]}
        contentFit="cover"
        contentPosition="top"
      />
      {!isPlayer && verifiedRealPerson ? <VerifiedRealPersonBadge size={12} /> : null}
    </View>
  ) : (
    <View
      style={[
        styles.avatar,
        isPlayer && styles.avatarPlayer,
        isDefault && styles.portraitDefault,
        { backgroundColor: isPlayer ? (isDefault ? TOKENS.colors.textMuted : COLORS.agents.paleGoldMuted) : agentColor },
      ]}
    />
  );

  return (
    <View
      style={[styles.row, isPlayer ? styles.playerRow : styles.agentRow]}
    >
      {!isPlayer && avatar}
      <ChatBubble
        backgroundImage={useBubbleImage ? (isPlayer ? playerBackgroundImage : agentBackgroundImage) : undefined}
        backgroundColor={isPlayer ? playerBubbleBg : agentBubbleBg}
        borderColor={isPlayer ? playerBorder : agentBorder}
        borderRadius={bubbleRadius}
        capInsets={useBubbleImage ? bubbleCapInsets : undefined}
        glassStyle={isDefault ? glassWebStyle : undefined}
      >
        {!isPlayer && (
          <View style={styles.bubbleHeader}>
            <Text style={[styles.agentName, isDefault && styles.agentNameDefault]}>{agentName.toUpperCase()}</Text>
            <View style={styles.headerActions}>
              {canRegenerate && onRegenerate ? (
                <TouchableOpacity
                  style={[styles.regenBtn, isDefault && styles.regenBtnDefault]}
                  onPress={onRegenerate}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('chat.regenerate')}
                  hitSlop={8}
                >
                  <Ionicons
                    name="refresh"
                    size={14}
                    color={isDefault ? TOKENS.colors.textMuted : COLORS.agents.paleGoldMuted}
                  />
                </TouchableOpacity>
              ) : null}
              {timeLabel ? (
                <Text style={[styles.timeText, isDefault && styles.timeTextDefault]}>{timeLabel}</Text>
              ) : null}
              {showAudioControl && (
                <TouchableOpacity
                  style={[
                    styles.audioBtn,
                    isDefault && styles.audioBtnDefault,
                    isStreamingAudio && !hasAudio && !isPlayingAudio && styles.audioBtnPending,
                  ]}
                  onPress={() => onToggleAudio?.(message.id)}
                  disabled={!hasAudio && !isStreamingAudio}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      isPlayingAudio
                        ? 'pause'
                        : isStreamingAudio && !hasAudio
                          ? 'hourglass-outline'
                          : 'volume-high'
                    }
                    size={14}
                    color={
                      hasAudio || isStreamingAudio
                        ? isDefault
                          ? TOKENS.colors.accent
                          : COLORS.accent.gold
                        : isDefault
                          ? TOKENS.colors.textMuted
                          : COLORS.text.muted
                    }
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        {isPlayer && !!message.agentName && (
          <View style={styles.bubbleHeader}>
            <Text style={[styles.agentName, isDefault && styles.agentNameDefault, styles.playerName]}>
              {message.agentName.toUpperCase()}
            </Text>
            <View style={styles.headerActions}>
              {timeLabel ? (
                <Text style={[styles.timeText, isDefault && styles.timeTextDefault]}>{timeLabel}</Text>
              ) : null}
            </View>
          </View>
        )}
        {imageUri ? (
          <ChatBubbleImage uri={imageUri} accessibilityLabel={captionText || 'image'} />
        ) : null}
        {captionText ? (
          <ChatMessageBody
            text={captionText}
            dialogueStyle={[
              styles.text,
              isDefault && Typo(styles.textDefault, 'sans', lang),
              isPlayer ? styles.playerText : styles.agentText,
              isPlayer && isDefault && styles.playerTextDefault,
              isDefault && !isPlayer && styles.agentTextDefault,
              imageUri && styles.captionBelowImage,
            ]}
            actionStyle={[styles.actionText, isDefault && styles.actionTextDefault]}
          />
        ) : !imageUri ? (
          <ChatMessageBody
            text={message.text}
            dialogueStyle={[
              styles.text,
              isDefault && Typo(styles.textDefault, 'sans', lang),
              isPlayer ? styles.playerText : styles.agentText,
              isPlayer && isDefault && styles.playerTextDefault,
              isDefault && !isPlayer && styles.agentTextDefault,
            ]}
            actionStyle={[styles.actionText, isDefault && styles.actionTextDefault]}
          />
        ) : null}
        {message.isInterrupted && (
          <View style={styles.footerRow}>
            <Text style={[styles.interruptedTag, isDefault && styles.interruptedTagDefault]}>
              {t('chat.interrupted')}
            </Text>
          </View>
        )}
      </ChatBubble>
      {isPlayer && avatar}
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
    maxWidth: '92%',
  },
  playerRow: {
    alignSelf: 'flex-end',
  },
  agentRow: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 4,
    flexShrink: 0,
  },
  avatarPlayer: {
    marginRight: 0,
    marginLeft: 8,
  },
  portrait: {
    width: 34,
    height: 34,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 181, 0.2)',
    flexShrink: 0,
  },
  portraitPlayer: {
    marginRight: 0,
    marginLeft: 8,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  agentName: Typo(
    {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: COLORS.accent.red,
      flexShrink: 1,
    },
    'display', lang
  ),
  playerName: {
    textAlign: 'right',
  },
  timeText: Typo(
    {
      fontSize: 10,
      color: COLORS.agents.paleGoldMuted,
      flexShrink: 0,
    },
    'mono', lang
  ),
  text: Typo(
    {
      fontSize: 14,
      lineHeight: 24,
      flexShrink: 1,
      ...(Platform.OS === 'web'
        ? ({ wordBreak: 'break-word', overflowWrap: 'break-word' } as const)
        : {}),
    },
    'mono', lang
  ),
  playerText: {
    color: COLORS.agents.paleGold,
  },
  agentText: {
    color: COLORS.agents.paleGold,
  },
  actionText: {
    color: 'rgba(232, 160, 196, 0.92)',
    fontStyle: 'italic',
  },
  captionBelowImage: {
    marginTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 6,
    gap: 8,
  },
  interruptedTag: {
    fontSize: 11,
    color: '#ff6b6b',
    ...TYPO.sans,
  },
  audioBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  regenBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  regenBtnDefault: {
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  audioBtnPending: {
    opacity: 0.65,
  },
  audioBtnDefault: {
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  agentNameDefault: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    'mono', lang
  ),
  timeTextDefault: {
    color: TOKENS.colors.textMuted,
  },
  textDefault: { fontSize: 14, lineHeight: 24 },
  playerTextDefault: {
    color: TOKENS.colors.text,
  },
  agentTextDefault: {
    color: TOKENS.colors.navTextInactive,
  },
  actionTextDefault: {
    color: 'rgba(236, 164, 200, 0.95)',
    fontStyle: 'italic',
  },
  portraitDefault: {
    borderRadius: TOKENS.radius.input,
    borderColor: TOKENS.colors.cardBorder,
  },
  systemLineDefault: {
    backgroundColor: TOKENS.colors.lineFaint,
  },
  systemTextDefault: {
    color: TOKENS.colors.textMuted,
  },
  interruptedTagDefault: {
    color: TOKENS.colors.accent,
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 16,
    opacity: 0.85,
    maxWidth: '92%',
  },
  systemRowNarration: {
    flexDirection: 'column',
    alignItems: 'stretch',
    opacity: 1,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(8, 10, 14, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 181, 0.22)',
  },
  systemLine: {
    width: 36,
    height: 1,
    backgroundColor: COLORS.border,
  },
  systemText: Typo(
    {
      color: COLORS.text.muted,
      fontSize: 11,
      marginHorizontal: 10,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
      textAlign: 'center',
    },
    'mono', lang
  ),
  systemTextNarration: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 14,
      lineHeight: 22,
      marginHorizontal: 0,
      letterSpacing: 0.2,
      textTransform: 'none',
      textAlign: 'left',
      fontWeight: '400',
    },
    'sans', lang
  ),
  systemTextNarrationDefault: {
    color: TOKENS.colors.text,
  },
});
};
