import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { AGENT_MEDIA_IMAGES } from '../theme/images';
import { AGENT_MEDIA } from './agentMediaTokens';

type AgentGiftButtonProps = {
  onPress: () => void;
  /** Compact for side panels (CharacterInfoPanel). */
  compact?: boolean;
  /** Sit in a horizontal action row (mobile View Media). */
  inline?: boolean;
};

/** Figma Gift CTA (Rectangle 91) — shared by View Media + Character info panel. */
export function AgentGiftButton({ onPress, compact = false, inline = false }: AgentGiftButtonProps) {
  const { t } = useI18n();
  const height = inline ? 56 : compact ? 64 : 76;
  const iconH = inline ? 52 : compact ? 60 : 72;
  const iconW = inline ? 62 : compact ? 70 : 84;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        inline && styles.wrapInline,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('agentMedia.gift')}
    >
      <Image
        source={AGENT_MEDIA_IMAGES.giftIcon}
        pointerEvents="none"
        style={[
          styles.icon,
          {
            width: iconW,
            height: iconH,
            left: inline ? -8 : compact ? -10 : -14,
            top: inline ? 4 : compact ? 6 : 8,
          },
        ]}
        contentFit="contain"
      />
      <LinearGradient
        colors={[AGENT_MEDIA.giftBgFrom, AGENT_MEDIA.giftBgTo]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.btn,
          { height, minHeight: height },
          inline && styles.btnInline,
          compact && !inline && styles.btnCompact,
        ]}
      >
        <View style={styles.labelCol}>
          <Text style={[styles.label, (compact || inline) && styles.labelCompact]}>
            {t('agentMedia.gift')}
          </Text>
          <View style={styles.underline} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignSelf: 'stretch',
  },
  wrapInline: {
    flex: 1.15,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.85,
  },
  btn: {
    paddingHorizontal: 28,
    borderRadius: AGENT_MEDIA.giftRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnInline: {
    paddingHorizontal: 16,
    paddingLeft: 36,
  },
  btnCompact: {
    paddingHorizontal: 20,
  },
  icon: {
    position: 'absolute',
    zIndex: 2,
  },
  labelCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: Typo(
    {
      color: AGENT_MEDIA.text,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    'sans',
  ),
  labelCompact: {
    fontSize: 16,
  },
  underline: {
    width: 44,
    height: 2,
    borderRadius: 1,
    backgroundColor: AGENT_MEDIA.giftUnderline,
    alignSelf: 'center',
  },
});
