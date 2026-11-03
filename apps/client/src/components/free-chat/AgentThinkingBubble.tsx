import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { resolveStaticUrl } from '../../constants/config';
import { TOKENS } from '../../pages/default/theme/tokens';
import { type FreeChatUiVariant, glassWebStyle } from './freeChatUi';

interface AgentThinkingBubbleProps {
  agentName?: string;
  agentAvatar?: string;
  agentColor?: string;
  labelKey?: string;
  variant?: FreeChatUiVariant;
}

function ThinkingDot({ delayMs, isDefault }: { delayMs: number; isDefault: boolean }) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(withTiming(1, { duration: 360 }), withTiming(0.25, { duration: 360 })),
        -1,
        false,
      ),
    );
  }, [delayMs, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.dot, isDefault && styles.dotDefault, style]}
    />
  );
}

export function AgentThinkingBubble({
  agentName,
  agentAvatar,
  agentColor = COLORS.accent.gold,
  labelKey = 'chat.thinking',
  variant = 'soviet',
}: AgentThinkingBubbleProps) {
  const { t } = useI18n();
  const isDefault = variant === 'default';
  const displayName = agentName || t('freeChat.defaultAgentName');
  const avatarSource = agentAvatar ? { uri: resolveStaticUrl(agentAvatar) } : undefined;
  const nameColor = isDefault ? TOKENS.colors.accent : agentColor;

  return (
    <View style={styles.row}>
      {avatarSource ? (
        <Image
          source={avatarSource}
          style={[styles.portrait, isDefault && styles.portraitDefault]}
          contentFit="cover"
          contentPosition="top"
        />
      ) : (
        <View
          style={[
            styles.avatar,
            isDefault && styles.portraitDefault,
            { backgroundColor: isDefault ? TOKENS.colors.cardSolid : agentColor },
          ]}
        />
      )}
      <View style={[styles.bubble, isDefault && styles.bubbleDefault]}>
        <Text style={[styles.agentName, { color: nameColor }, isDefault && styles.agentNameDefault]}>
          {displayName}
        </Text>
        <View style={styles.thinkingRow}>
          <Text style={[styles.thinkingText, isDefault && styles.thinkingTextDefault]}>{t(labelKey)}</Text>
          <View style={styles.dots}>
            <ThinkingDot delayMs={0} isDefault={isDefault} />
            <ThinkingDot delayMs={180} isDefault={isDefault} />
            <ThinkingDot delayMs={360} isDefault={isDefault} />
          </View>
        </View>
      </View>
    </View>
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
  portraitDefault: {
    borderRadius: TOKENS.radius.input,
    borderColor: TOKENS.colors.cardBorder,
  },
  bubble: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(20, 22, 28, 0.88)',
    borderColor: COLORS.border,
  },
  bubbleDefault: {
    borderRadius: TOKENS.radius.card,
    backgroundColor: TOKENS.colors.card,
    borderColor: TOKENS.colors.cardBorder,
    ...glassWebStyle,
  },
  agentName: Typo(
    {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 6,
      letterSpacing: 0.3,
    },
    'sans',
  ),
  agentNameDefault: Typo(
    {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    'mono',
  ),
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  thinkingText: Typo(
    {
      fontSize: 14,
      color: COLORS.text.muted,
      fontStyle: 'italic',
    },
    'sans',
  ),
  thinkingTextDefault: {
    color: TOKENS.colors.textSecondary,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 2,
    paddingBottom: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.accent.gold,
  },
  dotDefault: {
    backgroundColor: TOKENS.colors.accent,
  },
});
