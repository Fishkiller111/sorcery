import React, { useCallback, useState } from 'react';
import {
  View,
  Platform,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputFocusEventData,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { authInputShellStyles, authSharedStyles } from './authTheme';

type AuthInputShellProps = {
  children: (bindFocus: (props: TextInputProps) => TextInputProps) => React.ReactNode;
  shellStyle?: StyleProp<ViewStyle>;
};

export function AuthInputShell({ children, shellStyle }: AuthInputShellProps) {
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
    <View
      {...hoverHandlers}
      style={[
        authSharedStyles.inputShell,
        authInputShellStyles.transition,
        highlighted && authInputShellStyles.focused,
        shellStyle,
      ]}
    >
      <View style={authSharedStyles.inputRow}>{children(bindFocus)}</View>
    </View>
  );
}
