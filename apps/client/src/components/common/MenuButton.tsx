import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

export function MenuButton({ top = 48 }: { top?: number }) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <TouchableOpacity
      style={[styles.button, { top }]}
      onPress={() => router.replace('/')}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>{t('menu.back')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 74,
    zIndex: 100,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 22, 28, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    'sans',
  ),
});
