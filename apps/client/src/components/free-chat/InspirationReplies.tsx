import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { TOKENS } from '../../pages/default/theme/tokens';
import { type FreeChatUiVariant, glassWebStyle } from './freeChatUi';

interface InspirationRepliesProps {
  items: string[];
  loading?: boolean;
  onSelect: (text: string) => void;
  disabled?: boolean;
  variant?: FreeChatUiVariant;
}

export function InspirationReplies({
  items,
  loading,
  onSelect,
  disabled,
  variant = 'soviet',
}: InspirationRepliesProps) {
  const { t } = useI18n();
  const isDefault = variant === 'default';

  if (!loading && items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isDefault && styles.labelDefault]}>{t('chat.inspirationLabel')}</Text>
      {loading && items.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={isDefault ? TOKENS.colors.accent : COLORS.accent.gold} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {items.map((text, index) => (
            <TouchableOpacity
              key={`${index}-${text.slice(0, 12)}`}
              style={[styles.chip, isDefault && styles.chipDefault, disabled && styles.chipDisabled]}
              onPress={() => !disabled && onSelect(text)}
              activeOpacity={disabled ? 1 : 0.75}
              disabled={disabled}
            >
              <Text style={[styles.text, isDefault && styles.textDefault]} numberOfLines={2}>
                {text}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  label: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.4,
      paddingHorizontal: 12,
      marginBottom: 4,
    },
    'sans',
  ),
  labelDefault: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      paddingHorizontal: 12,
      marginBottom: 4,
    },
    'mono',
  ),
  loadingRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(20, 22, 28, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    maxWidth: 260,
  },
  chipDefault: {
    backgroundColor: TOKENS.colors.card,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.pill,
    ...glassWebStyle,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  text: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 13,
      lineHeight: 18,
    },
    'sans',
  ),
  textDefault: {
    color: TOKENS.colors.navTextInactive,
  },
});
