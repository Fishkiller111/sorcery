import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultSettingsRowProps = {
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  loading?: boolean;
  right?: React.ReactNode;
};

export function DefaultSettingsRow({
  title,
  value,
  onPress,
  danger = false,
  loading = false,
  right,
}: DefaultSettingsRowProps) {
  const content = (
    <View style={[styles.row, danger && styles.rowDanger]}>
      <View style={styles.main}>
        <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
      </View>
      <View style={[styles.right, right != null && styles.rightCustom]}>
        {right}
        {loading ? (
          <ActivityIndicator size="small" color={TOKENS.colors.accent} />
        ) : value ? (
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {onPress && !right ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={danger ? TOKENS.colors.accent : TOKENS.colors.textMuted}
          />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as object)
      : {}),
  },
  rowDanger: {
    borderColor: 'rgba(186, 60, 71, 0.35)',
    backgroundColor: TOKENS.colors.inviteBanner,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  titleDanger: {
    color: TOKENS.colors.accent,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '50%',
  },
  rightCustom: {
    maxWidth: undefined,
    flexShrink: 0,
  },
  value: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
      fontWeight: '500',
      letterSpacing: 0.3,
      textAlign: 'right',
    },
    'sans',
  ),
});
