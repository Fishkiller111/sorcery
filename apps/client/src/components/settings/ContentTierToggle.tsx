import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Typo } from '../../theme/typography';
import { playTypewriterSound, preloadTypewriterSound } from '../../utils/playTypewriterSound';

/** Normalized toggle sprite from setting/select.png */
export const TOGGLE_SRC = { width: 651, height: 133 };

/** Left option / right option / LED+handle (approx. from art). */
const SLOT_LEFT = 0.455;
const SLOT_RIGHT = 0.285;

export function toggleSizeForRow(maxWidth: number, maxHeight: number) {
  let height = Math.round(maxHeight * 0.96);
  let width = Math.round((height * TOGGLE_SRC.width) / TOGGLE_SRC.height);
  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round((width * TOGGLE_SRC.height) / TOGGLE_SRC.width);
  }
  return { width, height };
}

type ContentTierToggleProps = {
  maxWidth: number;
  maxHeight: number;
  matureEnabled: boolean;
  onSelectStandard: () => void;
  onRequestMature: () => void;
  standardLabel: string;
  matureLabel: string;
};

export function ContentTierToggle({
  maxWidth,
  maxHeight,
  matureEnabled,
  onSelectStandard,
  onRequestMature,
  standardLabel,
  matureLabel,
}: ContentTierToggleProps) {
  const { width, height, labelSize } = useMemo(() => {
    const size = toggleSizeForRow(maxWidth, maxHeight);
    return { ...size, labelSize: Math.max(9, Math.round(size.height * 0.16)) };
  }, [maxWidth, maxHeight]);

  useEffect(() => {
    void preloadTypewriterSound();
  }, []);

  const handleStandard = useCallback(() => {
    void playTypewriterSound();
    onSelectStandard();
  }, [onSelectStandard]);

  const handleMature = useCallback(() => {
    void playTypewriterSound();
    onRequestMature();
  }, [onRequestMature]);

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Image
        source={
          matureEnabled
            ? require('../../../assets/images/ui/setting/toggle_mature.png')
            : require('../../../assets/images/ui/setting/toggle_standard.png')
        }
        style={styles.sprite}
        resizeMode="stretch"
      />
      <View style={[styles.overlay, { height }]}>
        <Pressable
          style={[styles.slot, { width: `${SLOT_LEFT * 100}%` }]}
          onPress={handleStandard}
          accessibilityRole="button"
          accessibilityLabel={standardLabel}
        >
          <Text
            style={[
              styles.slotLabel,
              { fontSize: labelSize },
              !matureEnabled ? styles.slotLabelActive : styles.slotLabelIdle,
            ]}
            numberOfLines={1}
          >
            {standardLabel}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.slot, { width: `${SLOT_RIGHT * 100}%` }]}
          onPress={handleMature}
          accessibilityRole="button"
          accessibilityLabel={matureLabel}
        >
          <Text
            style={[
              styles.slotLabel,
              { fontSize: labelSize },
              matureEnabled ? styles.slotLabelActive : styles.slotLabelIdle,
            ]}
            numberOfLines={1}
          >
            {matureLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  sprite: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slot: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  slotLabel: Typo(
    {
      fontWeight: '700',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    'sans',
  ),
  slotLabelActive: {
    color: '#2f281c',
    opacity: 0.92,
  },
  slotLabelIdle: {
    color: '#8a7d68',
    opacity: 0.78,
  },
});
