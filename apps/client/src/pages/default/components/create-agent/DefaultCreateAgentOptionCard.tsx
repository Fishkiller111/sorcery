import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  Platform,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { OPTION_CARD_ASPECT } from '../../../../components/create-agent/options/optionAssets';

const LABEL_SIZE_RATIO = 52 / 768;
const CHECK_SIZE_RATIO = 22 / 768;
/** Horizontal inset as fraction of card width (symmetric). */
const PORTRAIT_INSET_X = 0.08;
const PORTRAIT_TOP = 0.07;
const PORTRAIT_BOTTOM = 0.18;

function cardMetrics(width: number) {
  // Keep labels readable in 3-col grids (~100px cards); avoid sub-14px from ratio alone.
  const labelSize = Math.round(Math.max(14, Math.min(18, width > 0 ? width * LABEL_SIZE_RATIO * 1.85 : 14)));
  const checkSize = Math.round(Math.max(18, Math.min(28, width * CHECK_SIZE_RATIO)));
  return {
    labelSize,
    letterSpacing: Math.min(1.2, labelSize * 0.04),
    checkSize,
    checkIconSize: Math.max(10, Math.round(checkSize * 0.64)),
    checkInset: Math.max(6, Math.round(width * 0.03)),
  };
}

function portraitFrameLayout(cardWidth: number) {
  const cardHeight = cardWidth / OPTION_CARD_ASPECT;
  const left = Math.round(cardWidth * PORTRAIT_INSET_X);
  const width = Math.round(cardWidth * (1 - PORTRAIT_INSET_X * 2));
  const top = Math.round(cardHeight * PORTRAIT_TOP);
  const height = Math.round(cardHeight * (1 - PORTRAIT_TOP - PORTRAIT_BOTTOM));
  return { left, top, width, height };
}

type DefaultCreateAgentOptionCardProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  image?: ImageSourcePropType;
  style?: ViewStyle;
  large?: boolean;
};

export function DefaultCreateAgentOptionCard({
  label,
  selected,
  onPress,
  image,
  style,
  large = false,
}: DefaultCreateAgentOptionCardProps) {
  const [cardWidth, setCardWidth] = useState(0);
  const metrics = useMemo(() => cardMetrics(cardWidth), [cardWidth]);
  const portraitBox = useMemo(
    () => (cardWidth > 0 ? portraitFrameLayout(cardWidth) : null),
    [cardWidth],
  );

  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) setCardWidth(width);
  }, []);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.wrap,
        large && styles.wrapLarge,
        selected && styles.wrapSelected,
        pressed && styles.wrapPressed,
        style,
      ]}
      onPress={onPress}
      onLayout={onCardLayout}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.card, large && styles.cardLarge]}>
        {image && portraitBox ? (
          <View style={[styles.portraitFrame, portraitBox]}>
            <Image
              source={image}
              style={styles.portrait}
              contentFit="cover"
              // 全身图用顶部对齐，避免 cover 居中裁掉头
              contentPosition="top"
            />
          </View>
        ) : null}

        <Text
          style={[
            styles.cardLabel,
            {
              fontSize: metrics.labelSize,
              letterSpacing: metrics.letterSpacing,
              lineHeight: metrics.labelSize + 4,
            },
            selected && styles.cardLabelSelected,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
        >
          {label.toUpperCase()}
        </Text>

        {selected ? (
          <View
            style={[
              styles.checkBadge,
              {
                top: metrics.checkInset,
                right: metrics.checkInset,
                width: metrics.checkSize,
                height: metrics.checkSize,
                borderRadius: metrics.checkSize / 2,
              },
            ]}
          >
            <Ionicons name="checkmark" size={metrics.checkIconSize} color={TOKENS.colors.text} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const glassBase = Platform.OS === 'web'
  ? ({
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    } as object)
  : {};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as object)
      : {}),
  },
  wrapLarge: {
    minHeight: 280,
  },
  wrapSelected: {
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
  },
  wrapPressed: {
    transform: [{ scale: 0.985 }],
  },
  card: {
    width: '100%',
    aspectRatio: OPTION_CARD_ASPECT,
    backgroundColor: TOKENS.colors.card,
    justifyContent: 'flex-end',
    ...glassBase,
  },
  cardLarge: {
    minHeight: 280,
  },
  portraitFrame: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
  },
  portrait: {
    width: '100%',
    height: '100%',
  },
  cardLabel: Typo(
    {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: '6%',
      color: TOKENS.colors.textMuted,
      textAlign: 'center',
    },
    'mono',
  ),
  cardLabelSelected: {
    color: TOKENS.colors.text,
  },
  checkBadge: {
    position: 'absolute',
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
