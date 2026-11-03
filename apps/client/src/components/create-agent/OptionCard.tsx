import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  Text,
  ImageBackground,
  StyleSheet,
  View,
  ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';
import { OPTION_CARD_ASPECT, OPTION_CARD_BG } from './options/optionAssets';

/** Card art is 768px wide — scale label from that reference. */
const LABEL_SIZE_RATIO = 52 / 768;
const CHECK_SIZE_RATIO = 22 / 768;
const PORTRAIT_INSET_X = 0.08;
const PORTRAIT_TOP = 0.06;
const PORTRAIT_BOTTOM = 0.2;

function cardMetrics(width: number) {
  const labelSize = Math.round(Math.max(14, Math.min(18, width > 0 ? width * LABEL_SIZE_RATIO * 1.85 : 14)));
  const checkSize = Math.round(Math.max(18, Math.min(30, width * CHECK_SIZE_RATIO)));
  return {
    labelSize,
    letterSpacing: Math.min(1.2, labelSize * 0.04),
    checkSize,
    checkIconSize: Math.max(10, Math.round(checkSize * 0.64)),
    checkInset: Math.max(4, Math.round(width * 0.022)),
  };
}

function portraitFrameLayout(cardWidth: number) {
  const cardHeight = cardWidth / OPTION_CARD_ASPECT;
  return {
    left: Math.round(cardWidth * PORTRAIT_INSET_X),
    top: Math.round(cardHeight * PORTRAIT_TOP),
    width: Math.round(cardWidth * (1 - PORTRAIT_INSET_X * 2)),
    height: Math.round(cardHeight * (1 - PORTRAIT_TOP - PORTRAIT_BOTTOM)),
  };
}

type OptionCardProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  image?: ImageSourcePropType;
  style?: ViewStyle;
};

export function OptionCard({ label, selected, onPress, image, style }: OptionCardProps) {
  const { lang } = useI18n();
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
      style={[styles.wrap, style, selected && styles.wrapSelected]}
      onPress={onPress}
      onLayout={onCardLayout}
    >
      <ImageBackground
        source={OPTION_CARD_BG}
        style={styles.card}
        imageStyle={styles.cardImage}
        resizeMode="cover"
      >
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
            Typo(styles.label, 'display', lang),
            {
              fontSize: metrics.labelSize,
              letterSpacing: metrics.letterSpacing,
              lineHeight: metrics.labelSize + 4,
            },
            selected && styles.labelSelected,
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
            <Ionicons name="checkmark" size={metrics.checkIconSize} color="#fff" />
          </View>
        ) : null}
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  wrapSelected: {
    borderColor: COLORS.accent.red,
  },
  card: {
    width: '100%',
    aspectRatio: OPTION_CARD_ASPECT,
    justifyContent: 'flex-end',
  },
  cardImage: {
    borderRadius: 2,
  },
  portraitFrame: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(40, 32, 24, 0.35)',
  },
  portrait: {
    width: '100%',
    height: '100%',
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '5%',
    color: '#2a2218',
    textAlign: 'center',
  },
  labelSelected: {
    color: COLORS.accent.redDark,
  },
  checkBadge: {
    position: 'absolute',
    backgroundColor: COLORS.accent.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
