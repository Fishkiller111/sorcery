import React, { useCallback, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { LANG_LABELS, nextAppLang } from '../../i18n/langs';
import { useAuthStore } from '../../stores/authStore';
import { LangPickerModal } from './LangPickerModal';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

export function LangToggle({ top = 48 }: { top?: number }) {
  const { lang, setLang } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const updateUserLang = useAuthStore((s) => s.updateUserLang);
  const [pickerOpen, setPickerOpen] = useState(false);

  const applyLang = useCallback(
    async (next: typeof lang) => {
      setLang(next);
      if (isLoggedIn) {
        try {
          await updateUserLang(next);
        } catch {
          // settings page handles explicit errors
        }
      }
    },
    [isLoggedIn, setLang, updateUserLang],
  );

  const handlePress = useCallback(() => {
    void applyLang(nextAppLang(lang));
  }, [applyLang, lang]);

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { top }]}
        onPress={handlePress}
        onLongPress={() => setPickerOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.text}>{LANG_LABELS[lang].short}</Text>
      </TouchableOpacity>
      <LangPickerModal
        visible={pickerOpen}
        current={lang}
        onSelect={(next) => void applyLang(next)}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 18,
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
