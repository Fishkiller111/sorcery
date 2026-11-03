import React, { useRef, useEffect, useMemo } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { FreeChatMessageBubble } from './FreeChatMessageBubble';
import { AgentThinkingBubble } from './AgentThinkingBubble';
import type { FreeChatMessage } from '../../types/api';
import type { FreeChatUiVariant } from './freeChatUi';

import { CHAT_BUBBLE_BG, CHAT_BUBBLE_CAP } from '../../constants/chatBubbleAssets';

interface FreeChatLayerProps {
  messages: FreeChatMessage[];
  voiceEnabled?: boolean;
  streamingAudioMsgId?: string | null;
  playingMsgId?: string | null;
  onToggleAudio?: (msgId: string) => void;
  onRegenerate?: (msgId: string) => void;
  regenerating?: boolean;
  thinking?: boolean;
  agentName?: string;
  agentAvatar?: string;
  agentColor?: string;
  variant?: FreeChatUiVariant;
  verifiedRealPerson?: boolean;
  /** Tap empty chat area (not on bubbles) to reveal chrome. */
  onBlankPress?: () => void;
}

export function FreeChatLayer({
  messages,
  voiceEnabled,
  streamingAudioMsgId,
  playingMsgId,
  onToggleAudio,
  onRegenerate,
  regenerating,
  thinking,
  agentName,
  agentAvatar,
  agentColor,
  variant = 'soviet',
  verifiedRealPerson,
  onBlankPress,
}: FreeChatLayerProps) {
  const scrollRef = useRef<ScrollView>(null);

  const scrollAnchor = useMemo(() => {
    const last = messages[messages.length - 1];
    return `${messages.length}:${last?.id ?? ''}:${last?.text?.length ?? 0}:${last?.imageUrl ?? ''}:${thinking ? 1 : 0}`;
  }, [messages, thinking]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [scrollAnchor]);

  const visibleMessages = thinking
    ? messages.filter((m) => !(m.role === 'agent' && m.isStreaming && !m.text.trim()))
    : messages;

  const lastAgentId = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i -= 1) {
      if (visibleMessages[i].role === 'agent') return visibleMessages[i].id;
    }
    return null;
  }, [visibleMessages]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        style={styles.blankPressTarget}
        onPress={onBlankPress}
        accessible={false}
      >
        {visibleMessages.map((msg, idx) => {
          const canRegenerate =
            !!onRegenerate &&
            !thinking &&
            !regenerating &&
            msg.role === 'agent' &&
            msg.id === lastAgentId &&
            !msg.isStreaming &&
            !!msg.text.trim();
          return (
            <FreeChatMessageBubble
              key={msg.id}
              message={msg}
              index={idx}
              voiceEnabled={voiceEnabled}
              isStreamingAudio={streamingAudioMsgId === msg.id}
              isPlayingAudio={playingMsgId === msg.id}
              onToggleAudio={onToggleAudio}
              canRegenerate={canRegenerate}
              onRegenerate={canRegenerate ? () => onRegenerate?.(msg.id) : undefined}
              playerBackgroundImage={CHAT_BUBBLE_BG}
              agentBackgroundImage={CHAT_BUBBLE_BG}
              bubbleCapInsets={CHAT_BUBBLE_CAP}
              variant={variant}
              verifiedRealPerson={verifiedRealPerson}
            />
          );
        })}
        {thinking ? (
          <AgentThinkingBubble
            agentName={agentName}
            agentAvatar={agentAvatar}
            agentColor={agentColor}
            variant={variant}
          />
        ) : null}
        <View style={styles.bottomSpacer} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 12,
  },
  blankPressTarget: {
    flexGrow: 1,
    width: '100%',
    minHeight: '100%',
    // Keep early system/opening lines near the input instead of
    // scrolling them off-screen above a tall empty flex region.
    justifyContent: 'flex-end',
  },
  bottomSpacer: {
    height: 24,
  },
});
