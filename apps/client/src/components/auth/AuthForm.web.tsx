import React, { type FormEvent, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type AuthFormProps = {
  onSubmit: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function AuthForm({ onSubmit, style, children }: AuthFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} style={StyleSheet.flatten(style) as React.CSSProperties}>
      {children}
    </form>
  );
}
