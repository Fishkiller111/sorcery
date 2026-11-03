import React, { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type AuthFormProps = {
  onSubmit: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function AuthForm({ style, children }: AuthFormProps) {
  return <View style={style}>{children}</View>;
}
