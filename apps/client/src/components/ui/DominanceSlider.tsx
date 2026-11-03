import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

import { TOKENS } from '../../pages/default/theme/tokens';

const LEVELS = [0, 25, 50, 75, 100];
const THUMB_SIZE_DEFAULT = 22;
const THUMB_SIZE_COMPACT = 14;
const TRACK_HEIGHT_DEFAULT = 3;
const TRACK_HEIGHT_COMPACT = 2;

interface DominanceSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  colorScheme?: 'soviet' | 'default';
}

export function DominanceSlider({
  value,
  onChange,
  disabled,
  variant = 'default',
  colorScheme = 'soviet',
}: DominanceSliderProps) {
  const isDefaultTheme = colorScheme === 'default';
  const compact = variant === 'compact';
  const thumbSize = compact ? THUMB_SIZE_COMPACT : THUMB_SIZE_DEFAULT;
  const trackHeight = compact ? TRACK_HEIGHT_COMPACT : TRACK_HEIGHT_DEFAULT;
  const { t } = useI18n();
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(valueToIndex(value));
  const translateX = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const currentIndex = useSharedValue(valueToIndex(value));
  const startXRef = useRef(0);

  const syncToValue = useCallback(
    (val: number) => {
      const idx = valueToIndex(val);
      currentIndex.value = idx;
      setActiveIndex(idx);
      if (trackWidth.value > 0) {
        translateX.value = withSpring(indexToX(idx, trackWidth.value), {
          stiffness: 300,
          damping: 25,
        });
      }
    },
    [currentIndex, trackWidth, translateX],
  );

  useEffect(() => {
    syncToValue(value);
  }, [value, syncToValue]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      setContainerWidth(width);
      trackWidth.value = Math.max(0, width - thumbSize);
      syncToValue(value);
    },
    [syncToValue, trackWidth, thumbSize, value],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        startXRef.current = translateX.value;
      },
      onPanResponderMove: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        const trackW = trackWidth.value;
        if (trackW <= 0) return;
        const rawX = Math.max(0, Math.min(trackW, startXRef.current + gestureState.dx));
        const idx = xToIndex(rawX, trackW);
        if (idx !== currentIndex.value) {
          Haptics.selectionAsync();
          currentIndex.value = idx;
          setActiveIndex(idx);
        }
        translateX.value = rawX;
      },
      onPanResponderRelease: () => {
        const trackW = trackWidth.value;
        if (trackW <= 0) return;
        const idx = xToIndex(translateX.value, trackW);
        const snapX = indexToX(idx, trackW);
        translateX.value = withSpring(snapX, { stiffness: 300, damping: 25 });
        onChange(LEVELS[idx]);
        setActiveIndex(idx);
        currentIndex.value = idx;
      },
    }),
  ).current;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const trackInnerWidth = Math.max(0, containerWidth - thumbSize);
  const tickSize = compact ? 4 : 6;
  const mutedLabel = isDefaultTheme ? TOKENS.colors.textMuted : COLORS.agents.paleGoldMuted;
  const activeLabel = isDefaultTheme ? TOKENS.colors.text : COLORS.accent.gold;
  const trackColor = isDefaultTheme ? TOKENS.colors.lineFaint : COLORS.agents.border;
  const tickActiveColor = isDefaultTheme ? TOKENS.colors.accent : COLORS.accent.gold;
  const thumbColor = isDefaultTheme ? TOKENS.colors.accent : COLORS.accent.gold;
  const thumbBorder = isDefaultTheme ? TOKENS.colors.bg : COLORS.bg.primary;

  return (
    <View style={[styles.root, compact && styles.rootCompact]} onLayout={onLayout}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Text style={[styles.endLabel, compact && styles.endLabelCompact, isDefaultTheme && { color: mutedLabel }]}>
          {t('freeChat.dominanceActive')}
        </Text>
        <Text
          style={[
            styles.currentLabel,
            compact && styles.currentLabelCompact,
            isDefaultTheme && styles.currentLabelDefault,
            isDefaultTheme && { color: activeLabel },
          ]}
        >
          {t(`freeChat.dominanceLevel${activeIndex}`)}
        </Text>
        <Text style={[styles.endLabel, compact && styles.endLabelCompact, isDefaultTheme && { color: mutedLabel }]}>
          {t('freeChat.dominanceSubmissive')}
        </Text>
      </View>
      <View style={[styles.trackContainer, { height: thumbSize }]}>
        <View
          style={[
            styles.track,
            {
              left: thumbSize / 2,
              width: trackInnerWidth,
              height: trackHeight,
              borderRadius: trackHeight / 2,
              backgroundColor: trackColor,
            },
          ]}
        />
        {LEVELS.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.tick,
              {
                top: (thumbSize - tickSize) / 2,
                width: tickSize,
                height: tickSize,
                borderRadius: tickSize / 2,
                marginLeft: -tickSize / 2,
                left: thumbSize / 2 + (idx / (LEVELS.length - 1)) * trackInnerWidth,
                backgroundColor: idx <= activeIndex ? tickActiveColor : trackColor,
              },
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              borderWidth: compact ? 1.5 : 2,
              backgroundColor: thumbColor,
              borderColor: thumbBorder,
            },
            thumbStyle,
          ]}
          {...panResponder.panHandlers}
        />
      </View>
    </View>
  );
}

function valueToIndex(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped / 25);
}

function indexToX(index: number, trackWidthValue: number): number {
  if (trackWidthValue <= 0) return 0;
  return (index / (LEVELS.length - 1)) * trackWidthValue;
}

function xToIndex(x: number, trackWidthValue: number): number {
  if (trackWidthValue <= 0) return 2;
  const ratio = Math.max(0, Math.min(1, x / trackWidthValue));
  return Math.round(ratio * (LEVELS.length - 1));
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rootCompact: {
    width: 108,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerCompact: {
    marginBottom: 3,
  },
  endLabel: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 11,
      letterSpacing: 0.6,
    },
    'sans',
  ),
  endLabelCompact: {
    fontSize: 8,
    letterSpacing: 0.3,
  },
  currentLabel: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
    },
    'display',
  ),
  currentLabelCompact: {
    fontSize: 9,
    letterSpacing: 0.4,
  },
  currentLabelDefault: Typo(
    {
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    'mono',
  ),
  trackContainer: {
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    backgroundColor: COLORS.agents.border,
  },
  tick: {
    position: 'absolute',
    backgroundColor: COLORS.agents.border,
  },
  tickActive: {
    backgroundColor: COLORS.accent.gold,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: COLORS.accent.gold,
    borderColor: COLORS.bg.primary,
  },
});
