import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ChatMessage, AgentId } from '../../engine/types';
import { AGENTS } from '../../data/storyAgents';
import { useI18n } from '../../i18n/I18nContext';
import { resolveAgentName } from '../../utils/agentName';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { Image } from 'expo-image';
import { resolveImage } from '../../utils/assets';
import { ChatBubble } from '../ui/ChatBubble';
import type { ImageSourcePropType } from 'react-native';

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
  playerBackgroundImage?: ImageSourcePropType;
  agentBackgroundImage?: ImageSourcePropType;
  bubbleCapInsets?: { left: number; top: number; right: number; bottom: number };
}

export function MessageBubble({
  message,
  index: _index,
  playerBackgroundImage,
  agentBackgroundImage,
  bubbleCapInsets,
}: MessageBubbleProps) {
  const { lang } = useI18n();
  const isPlayer = message.agent === 'player';
  const isSystem = message.type === 'system';
  const isImage = message.type === 'image';
  const agent = AGENTS[message.agent as AgentId] || AGENTS.system;
  const agentName = resolveAgentName(agent, lang);
  const portraitUri = agent.portrait;

  if (isImage && message.imageUri) {
    return (
      <View style={styles.imageWrapper}>
        <Image
          source={resolveImage(message.imageUri)}
          style={styles.imageCard}
          contentFit="cover"
          transition={400}
        />
      </View>
    );
  }

  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <View style={styles.systemLine} />
        <Text style={styles.systemText}>{message.text}</Text>
        <View style={styles.systemLine} />
      </View>
    );
  }

  const avatar = portraitUri ? (
    <Image
      source={resolveImage(portraitUri)}
      style={styles.portrait}
      contentFit="cover"
      contentPosition="top"
    />
  ) : (
    <View style={[styles.avatar, { backgroundColor: agent.color }]} />
  );

  return (
    <View style={[styles.row, isPlayer ? styles.playerRow : styles.agentRow]}>
      {!isPlayer && avatar}
      <ChatBubble
        backgroundImage={isPlayer ? playerBackgroundImage : agentBackgroundImage}
        backgroundColor={isPlayer ? 'rgba(14, 15, 20, 0.92)' : 'rgba(18, 20, 26, 0.94)'}
        borderColor={isPlayer ? COLORS.accent.red : 'rgba(232, 213, 181, 0.28)'}
        borderRadius={6}
        contentStyle={styles.bubbleContent}
        capInsets={bubbleCapInsets}
      >
        {!isPlayer && <Text style={[styles.agentName, { color: agent.color }]}>{agentName}</Text>}
        <Text style={[styles.text, isPlayer ? styles.playerText : styles.agentText]}>{message.text}</Text>
      </ChatBubble>
      {isPlayer && avatar}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 5,
    maxWidth: '88%',
  },
  playerRow: {
    alignSelf: 'flex-end',
  },
  agentRow: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    marginTop: 6,
    flexShrink: 0,
  },
  portrait: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexShrink: 0,
  },
  bubbleContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  agentName: Typo(
    {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 3,
      letterSpacing: 0.3,
    },
    'sans',
  ),
  text: Typo(
    {
      fontSize: 14,
      lineHeight: 20,
      flexShrink: 1,
      ...(Platform.OS === 'web'
        ? ({ wordBreak: 'break-word', overflowWrap: 'break-word' } as const)
        : {}),
    },
    'sans',
  ),
  playerText: {
    color: COLORS.text.primary,
  },
  agentText: {
    color: COLORS.text.primary,
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 16,
    opacity: 0.85,
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
    },
    'mono',
  ),
  imageWrapper: {
    alignSelf: 'center',
    marginVertical: 12,
    width: '92%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  imageCard: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
});
