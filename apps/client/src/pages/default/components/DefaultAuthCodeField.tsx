import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
  type TextInputProps,
} from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultAuthCodeFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onSendCode: () => void;
  sending: boolean;
  codeSent: boolean;
  cooldownSeconds?: number;
  sendLabel: string;
  resendLabel: string;
  cooldownLabel?: string;
  disabled?: boolean;
};

const webInputProps =
  Platform.OS === 'web' ? ({ dataSet: { authInput: 'true' } } as object) : {};

export function DefaultAuthCodeField({
  label,
  value,
  onChangeText,
  placeholder,
  onSendCode,
  sending,
  codeSent,
  cooldownSeconds = 0,
  sendLabel,
  resendLabel,
  cooldownLabel,
  disabled,
}: DefaultAuthCodeFieldProps) {
  const [focused, setFocused] = useState(false);
  const onCooldown = cooldownSeconds > 0;
  const btnLabel = onCooldown
    ? (cooldownLabel ?? `${cooldownSeconds}s`)
    : codeSent
      ? resendLabel
      : sendLabel;

  const bindFocus = useCallback(
    (props: TextInputProps): TextInputProps => ({
      ...props,
      onFocus: (event) => {
        setFocused(true);
        props.onFocus?.(event);
      },
      onBlur: (event) => {
        setFocused(false);
        props.onBlur?.(event);
      },
    }),
    [],
  );

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={[styles.shell, focused && styles.shellFocused]}>
          <TextInput
            {...bindFocus({
              value,
              onChangeText,
              placeholder,
              placeholderTextColor: TOKENS.colors.textMuted,
              keyboardType: 'number-pad',
              maxLength: 6,
              editable: !disabled,
            })}
            {...webInputProps}
            style={[
              styles.input,
              Platform.OS === 'web'
                ? ({
                    outlineStyle: 'none',
                    outlineWidth: 0,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                  } as object)
                : null,
            ]}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSendCode}
          disabled={sending || disabled || onCooldown}
          style={[
            styles.sendBtn,
            (sending || disabled || onCooldown) && styles.sendBtnDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={TOKENS.colors.text} />
          ) : (
            <Text style={styles.sendBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {btnLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
    },
    'sans',
  ),
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  shell: {
    flex: 1,
    minHeight: 48,
    borderRadius: TOKENS.radius.input,
    backgroundColor: TOKENS.colors.inputBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.inputBorder,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  shellFocused: {
    borderColor: TOKENS.colors.inputBorderFocus,
  },
  input: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      paddingVertical: 12,
    },
    'sans',
  ),
  sendBtn: {
    minWidth: 96,
    minHeight: 48,
    borderRadius: TOKENS.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: TOKENS.colors.accent,
  },
  sendBtnDisabled: {
    opacity: 0.55,
  },
  sendBtnText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    'sans',
  ),
});
