import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useThemePage } from '../src/theme/useThemePage';
import { DefaultLoginScreen } from '../src/pages/default/Login';
import { SovietLoginScreen } from '../src/pages/soviet/Login';
import { useAuthStore } from '../src/stores/authStore';
import { COLORS } from '../src/theme/colors';

export default function LoginScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);

  const ThemedPage = useThemePage({
    default: DefaultLoginScreen,
  });

  if (!isRestored || isLoggedIn) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={COLORS.agents.brightGold} />
      </View>
    );
  }

  if (ThemedPage) {
    return <ThemedPage />;
  }

  return <SovietLoginScreen />;
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0b0f',
  },
});
