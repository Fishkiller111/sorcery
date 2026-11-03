import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typo } from '../typography';
import { TOKENS } from '../tokens';

type ModernSettingsRowProps = {
  title: string;
  configId?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  loading?: boolean;
  right?: React.ReactNode;
};

export function ModernSettingsRow({
  title,
  configId,
  value,
  onPress,
  danger = false,
  loading = false,
  right,
}: ModernSettingsRowProps) {
  const content = (
    <View style={[styles.row, danger && styles.rowDanger]}>
      <View style={styles.main}>
        <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
        {configId ? <Text style={styles.configId}>{configId}</Text> : null}
      </View>
      <View style={styles.right}>
        {right}
        {loading ? (
          <ActivityIndicator size="small" color={TOKENS.modePage.textMuted} />
        ) : value ? (
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {onPress && !right ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={danger ? '#9e1b1b' : TOKENS.modePage.textSubtle}
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
      style={({ pressed }) => pressed && styles.pressed}
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
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  rowDanger: {
    borderColor: 'rgba(158, 27, 27, 0.45)',
    backgroundColor: 'rgba(255,245,245,0.85)',
  },
  pressed: {
    opacity: 0.88,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: typo(
    {
      color: TOKENS.modePage.text,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  titleDanger: {
    color: '#9e1b1b',
  },
  configId: typo(
    {
      color: TOKENS.modePage.textSubtle,
      fontSize: 10,
      letterSpacing: 0.8,
    },
    'mono',
  ),
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '46%',
  },
  value: typo(
    {
      color: TOKENS.modePage.textMuted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'sans',
  ),
});
