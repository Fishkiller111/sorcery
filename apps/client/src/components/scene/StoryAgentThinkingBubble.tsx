import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { AgentId } from '../../engine/types';
import { AGENTS } from '../../data/storyAgents';
import { useI18n } from '../../i18n/I18nContext';
import { resolveAgentName } from '../../utils/agentName';
import { resolveImage } from '../../utils/assets';
import { ChatBubble } from '../ui/ChatBubble';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import type { ImageSourcePropType } from 'react-native';

type StoryAgentThinkingBubbleProps = {
  agentId: AgentId;
  agentBackgroundImage?: ImageSourcePropType;
  bubbleCapInsets?: { left: number; top: number; right: number; bottom: number };
};

function ThinkingDot({ delayMs }: { delayMs: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(withTiming(1, { duration: 380 }), withTiming(0.3, { duration: 380 })),
        -1,
        false,
      ),
    );
  }, [delayMs, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

/** Story-mode typing indicator styled like MessageBubble. */
export function StoryAgentThinkingBubble({
  agentId,
  agentBackgroundImage,
  bubbleCapInsets,
}: StoryAgentThinkingBubbleProps) {
  const { lang, t } = useI18n();
  const agent = AGENTS[agentId] || AGENTS.narrator;
  const agentName = resolveAgentName(agent, lang);
  const portraitUri = agent.portrait;

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
    <Animated.View entering={FadeInUp.duration(260)} style={styles.row}>
      {avatar}
      <ChatBubble
        backgroundImage={agentBackgroundImage}
        backgroundColor="rgba(18, 20, 26, 0.94)"
        borderColor="rgba(232, 213, 181, 0.28)"
        borderRadius={6}
        contentStyle={styles.bubbleContent}
        capInsets={bubbleCapInsets}
      >
        <Text style={[styles.agentName, { color: agent.color }]}>{agentName}</Text>
        <View style={styles.thinkingRow}>
          <Text style={styles.thinkingText}>{t('scene.thinking')}</Text>
          <View style={styles.dots}>
            <ThinkingDot delayMs={0} />
            <ThinkingDot delayMs={160} />
            <ThinkingDot delayMs={320} />
          </View>
        </View>
      </ChatBubble>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    marginVertical: 5,
    maxWidth: '88%',
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
    marginRight: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexShrink: 0,
  },
  bubbleContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120,
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
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thinkingText: Typo(
    {
      fontSize: 14,
      lineHeight: 20,
      color: COLORS.text.muted,
      fontStyle: 'italic',
      ...(Platform.OS === 'web' ? ({ userSelect: 'none' } as const) : {}),
    },
    'sans',
  ),
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.accent.gold,
  },
});
