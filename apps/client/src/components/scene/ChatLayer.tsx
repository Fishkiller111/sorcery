import React, { useRef, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import { ChatMessage, AgentId } from '../../engine/types';
import { MessageBubble } from './MessageBubble';
import { StoryAgentThinkingBubble } from './StoryAgentThinkingBubble';
import { CHAT_BUBBLE_BG, CHAT_BUBBLE_CAP } from '../../constants/chatBubbleAssets';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

interface ChatLayerProps {
  messages: ChatMessage[];
  loading?: boolean;
  loadingAgentId?: AgentId;
  turnProgress?: boolean;
}

export function ChatLayer({ messages, loading, loadingAgentId = 'narrator', turnProgress }: ChatLayerProps) {

  const scrollRef = useRef<ScrollView>(null);
  const { t, lang } = useI18n();

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [messages, loading, turnProgress]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          index={idx}
          playerBackgroundImage={CHAT_BUBBLE_BG}
          agentBackgroundImage={CHAT_BUBBLE_BG}
          bubbleCapInsets={CHAT_BUBBLE_CAP}
        />
      ))}
      {loading ? (
        <StoryAgentThinkingBubble
          agentId={loadingAgentId}
          agentBackgroundImage={CHAT_BUBBLE_BG}
          bubbleCapInsets={CHAT_BUBBLE_CAP}
        />
      ) : null}
      {turnProgress && !loading ? (
        <View style={styles.turnProgressRow}>
          <Text style={Typo(styles.turnProgressText, 'sans', lang)}>{t('scene.turnProgress')}</Text>
          <Text style={Typo(styles.turnProgressDots, 'sans', lang)}>···</Text>
        </View>
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  turnProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginVertical: 6,
    marginLeft: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(18, 20, 26, 0.72)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  turnProgressText: { color: COLORS.text.muted, fontSize: 12, fontStyle: 'italic' },
  turnProgressDots: { color: COLORS.accent.gold, fontSize: 12, letterSpacing: 1 },
  bottomSpacer: {
    height: 20,
  },
});
