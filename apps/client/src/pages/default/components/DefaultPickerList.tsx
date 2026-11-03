import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultPickerListProps = {
  children: React.ReactNode;
};

export function DefaultPickerList({ children }: DefaultPickerListProps) {
  return <View style={styles.list}>{children}</View>;
}

type DefaultPickerRowProps = {
  label: string;
  sublabel?: string;
  selected?: boolean;
  isLast?: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
};

export function DefaultPickerRow({
  label,
  sublabel,
  selected = false,
  isLast = false,
  onPress,
  leading,
}: DefaultPickerRowProps) {
  const [hovered, setHovered] = useState(false);
  const highlighted = hovered || selected;
  const hoverHandlers =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : {};

  return (
    <Pressable
      {...hoverHandlers}
      style={[styles.row, !isLast && styles.rowDivider, highlighted && styles.rowHighlighted]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {leading}
      <View style={styles.textCol}>
        <Text style={[styles.rowLabel, highlighted && styles.rowLabelHighlighted]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[styles.rowSublabel, highlighted && styles.rowSublabelHighlighted]} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={16} color={TOKENS.colors.accent} /> : null}
    </Pressable>
  );
}

export function DefaultPickerPreviewDot({ color }: { color: string }) {
  return <View style={[styles.previewDot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.input,
    overflow: 'hidden',
    backgroundColor: 'rgba(8, 10, 15, 0.45)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer', transition: 'background-color 0.15s ease' } as const)
      : {}),
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.lineFaint,
  },
  rowHighlighted: {
    backgroundColor: 'rgba(186, 60, 71, 0.08)',
  },
  textCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowLabel: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    'sans',
  ),
  rowLabelHighlighted: {
    color: TOKENS.colors.text,
    fontWeight: '600',
  },
  rowSublabel: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    'sans',
  ),
  rowSublabelHighlighted: {
    color: TOKENS.colors.textSecondary,
  },
  previewDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: TOKENS.colors.line,
  },
});
