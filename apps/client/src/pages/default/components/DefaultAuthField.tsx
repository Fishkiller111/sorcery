import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultAuthFieldProps = TextInputProps & {
  label: string;
  footer?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

const webInputProps =
  Platform.OS === 'web' ? ({ dataSet: { authInput: 'true' } } as object) : {};

export function DefaultAuthField({
  label,
  footer,
  containerStyle,
  style,
  placeholderTextColor = TOKENS.colors.textMuted,
  ...inputProps
}: DefaultAuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const highlighted = focused || hovered;

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

  const hoverHandlers =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : {};

  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        {...hoverHandlers}
        style={[styles.shell, highlighted && styles.shellFocused]}
      >
        <TextInput
          {...bindFocus(inputProps)}
          {...webInputProps}
          style={[
            styles.input,
            style,
            Platform.OS === 'web'
              ? ({
                  outlineStyle: 'none',
                  outlineWidth: 0,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                } as object)
              : null,
          ]}
          placeholderTextColor={placeholderTextColor}
        />
      </View>
      {footer}
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
  shell: {
    minHeight: 48,
    borderRadius: TOKENS.radius.input,
    backgroundColor: TOKENS.colors.inputBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.inputBorder,
    justifyContent: 'center',
    paddingHorizontal: 14,
    ...(Platform.OS === 'web'
      ? ({
          transitionProperty: 'border-color, box-shadow',
          transitionDuration: '200ms',
        } as object)
      : {}),
  },
  shellFocused: {
    borderColor: TOKENS.colors.inputBorderFocus,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 0 1px rgba(186, 60, 71, 0.2)',
        } as object)
      : {}),
  },
  input: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      paddingVertical: 12,
    },
    'sans',
  ),
});
