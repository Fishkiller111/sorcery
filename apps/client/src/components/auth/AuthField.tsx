import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { AUTH_LABEL, authSharedStyles } from './authTheme';
import { AuthInputShell } from './AuthInputShell';

type AuthFieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  footer?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

const webInputProps =
  Platform.OS === 'web' ? ({ dataSet: { authInput: 'true' } } as object) : {};

export function AuthField({
  label,
  icon,
  footer,
  containerStyle,
  style,
  placeholderTextColor = COLORS.text.muted,
  ...inputProps
}: AuthFieldProps) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <AuthInputShell>
        {(bindFocus) => (
          <>
            <View style={authSharedStyles.iconSlot}>
              <Ionicons name={icon} size={16} color={AUTH_LABEL} />
            </View>
            <TextInput
              {...bindFocus(inputProps)}
              {...webInputProps}
              style={[authSharedStyles.textInput, style]}
              placeholderTextColor={placeholderTextColor}
            />
          </>
        )}
      </AuthInputShell>
      {footer}
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
});
