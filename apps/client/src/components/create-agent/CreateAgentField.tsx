import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';

type CreateAgentFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  error?: boolean;
};

export function CreateAgentField({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  error,
}: CreateAgentFieldProps) {
  const { lang } = useI18n();

  return (
    <>
      <Text style={Typo(styles.label, 'sans', lang)}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text.muted}
        multiline={multiline}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: { color: COLORS.text.secondary, fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text.primary,
    fontSize: 15,
    backgroundColor: 'rgba(20,22,28,0.85)',
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  inputError: { borderColor: COLORS.accent.red },
});
