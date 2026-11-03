import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const VERIFIED_REAL_PERSON_RED = '#E23B3B';

type VerifiedRealPersonBadgeProps = {
  size?: number;
  accessibilityLabel?: string;
  /** Cover overlay uses a slightly larger offset from the corner. */
  inset?: number;
  /** Shown to the left of the check on cover cards. Omit on compact avatars. */
  label?: string;
};

/** Red circle + white check. Positioned bottom-right of the nearest relative parent. */
export function VerifiedRealPersonBadge({
  size = 18,
  accessibilityLabel,
  inset = 0,
  label,
}: VerifiedRealPersonBadgeProps) {
  const dim = Math.max(12, size);
  const a11y = accessibilityLabel || label;
  const checkStyle = [
    styles.check,
    {
      width: dim,
      height: dim,
      borderRadius: dim / 2,
    },
  ];
  const icon = (
    <Ionicons name="checkmark" size={Math.round(dim * 0.68)} color="#fff" />
  );

  if (!label) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={a11y}
        style={[
          ...checkStyle,
          styles.anchor,
          { right: inset, bottom: inset },
        ]}
      >
        {icon}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={a11y}
      style={[styles.labeled, styles.anchor, { right: inset, bottom: inset }]}
    >
      <Text
        style={[styles.label, { fontSize: Math.max(9, Math.round(dim * 0.5)) }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={checkStyle}>{icon}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    zIndex: 6,
  },
  check: {
    backgroundColor: VERIFIED_REAL_PERSON_RED,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  labeled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '72%',
    paddingLeft: 8,
    paddingRight: 2,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  label: {
    flexShrink: 1,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
