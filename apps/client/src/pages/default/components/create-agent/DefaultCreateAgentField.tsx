import React from 'react';
import { Text, TextInput, StyleSheet, Platform } from 'react-native';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { DefaultCreateAgentSectionLabel } from './DefaultCreateAgentSectionLabel';

type DefaultCreateAgentFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  error?: boolean;
};

export function DefaultCreateAgentField({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  error,
}: DefaultCreateAgentFieldProps) {
  return (
    <>
      <DefaultCreateAgentSectionLabel label={label} />
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TOKENS.colors.textMuted}
        multiline={multiline}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: TOKENS.colors.text,
    fontSize: 15,
    backgroundColor: TOKENS.colors.card,
    marginBottom: 8,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          outlineStyle: 'none',
        } as object)
      : {}),
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: TOKENS.colors.accent,
  },
});
