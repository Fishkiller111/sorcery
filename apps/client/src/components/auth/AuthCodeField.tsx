import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { AUTH_LABEL, AUTH_OFF_WHITE, authSharedStyles } from './authTheme';
import { AuthInputShell } from './AuthInputShell';

type AuthCodeFieldProps = {
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

export function AuthCodeField({
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
}: AuthCodeFieldProps) {
  const onCooldown = cooldownSeconds > 0;
  const btnLabel = onCooldown
    ? (cooldownLabel ?? `${cooldownSeconds}s`)
    : codeSent
      ? resendLabel
      : sendLabel;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <AuthInputShell shellStyle={styles.codeFrame}>
          {(bindFocus) => (
            <>
              <View style={authSharedStyles.iconSlot}>
                <Ionicons name="shield-checkmark-outline" size={16} color={AUTH_LABEL} />
              </View>
              <TextInput
                {...bindFocus({
                  value,
                  onChangeText,
                  placeholder,
                  placeholderTextColor: COLORS.text.muted,
                  keyboardType: 'number-pad',
                  maxLength: 6,
                  editable: !disabled,
                })}
                {...webInputProps}
                style={authSharedStyles.textInput}
              />
            </>
          )}
        </AuthInputShell>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSendCode}
          disabled={sending || disabled || onCooldown}
          style={[
            authSharedStyles.sendCodeBtn,
            (sending || disabled || onCooldown) && authSharedStyles.primaryBtnDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={AUTH_OFF_WHITE} />
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
    gap: 6,
  },
  label: Typo(
    {
      color: AUTH_LABEL,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  codeFrame: {
    flex: 1,
  },
  sendBtnText: Typo(
    {
      color: AUTH_OFF_WHITE,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'display',
  ),
});
