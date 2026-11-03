import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useThemePage } from '../src/theme/useThemePage';
import { DefaultHomeScreen } from '../src/pages/default/Home';
import { ModernExplore } from '../src/pages/modern/Explore';
import { HomeEntryModals } from '../src/components/common/HomeEntryModals';
import { ShellLayout } from '../src/components/shell/ShellLayout';
import { SovietExplorePage } from '../src/pages/explore/SovietExplorePage';
import { useAuthStore } from '../src/stores/authStore';
import { COLORS } from '../src/theme/colors';

export default function Home() {
  const isRestored = useAuthStore((s) => s.isRestored);

  const ThemedPage = useThemePage({
    default: DefaultHomeScreen,
    modern: ModernExplore,
  });

  if (!isRestored) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={COLORS.agents.brightGold} />
      </View>
    );
  }

  return (
    <>
      {ThemedPage ? (
        <ThemedPage />
      ) : (
        <ShellLayout scrollable={false} showLangToggle={false}>
          <SovietExplorePage />
        </ShellLayout>
      )}
      <HomeEntryModals />
    </>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0b0f',
  },
});
