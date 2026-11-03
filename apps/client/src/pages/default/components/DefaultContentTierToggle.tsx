import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultContentTierToggleProps = {
  matureEnabled: boolean;
  onSelectStandard: () => void;
  onRequestMature: () => void;
  standardLabel: string;
  matureLabel: string;
};

export function DefaultContentTierToggle({
  matureEnabled,
  onSelectStandard,
  onRequestMature,
  standardLabel,
  matureLabel,
}: DefaultContentTierToggleProps) {
  return (
    <View style={styles.track}>
      <Pressable
        style={[styles.segment, !matureEnabled && styles.segmentActive]}
        onPress={onSelectStandard}
        accessibilityRole="button"
        accessibilityState={{ selected: !matureEnabled }}
        accessibilityLabel={standardLabel}
      >
        <Text
          style={[styles.segmentText, !matureEnabled && styles.segmentTextActive]}
          numberOfLines={1}
        >
          {standardLabel}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.segment, matureEnabled && styles.segmentActive]}
        onPress={onRequestMature}
        accessibilityRole="button"
        accessibilityState={{ selected: matureEnabled }}
        accessibilityLabel={matureLabel}
      >
        <Text
          style={[styles.segmentText, matureEnabled && styles.segmentTextActive]}
          numberOfLines={1}
        >
          {matureLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.72)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as object)
      : {}),
  },
  segment: {
    minHeight: 32,
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: TOKENS.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: TOKENS.colors.accent,
  },
  segmentText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.3,
      textAlign: 'center',
    },
    'sans',
  ),
  segmentTextActive: {
    color: '#fff',
  },
});
