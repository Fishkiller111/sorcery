import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { PageBackground } from '../../../src/components/ui/PageBackground';
import { StoryModeTopBar } from '../../../src/components/story/StoryModeTopBar';
import { StoryWorldviewEncyclopedia } from '../../../src/components/story/StoryWorldviewEncyclopedia';
import { COLORS } from '../../../src/theme/colors';
import { useMobileSafeAreaPaddingStyle } from '../../../src/hooks/useMobileSafeAreaPadding';

export default function StoryWorldviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const worldviewId = typeof id === 'string' ? id : '';
  const safeAreaBottom = useMobileSafeAreaPaddingStyle({ top: false });

  return (
    <View style={[styles.root, safeAreaBottom]}>
      <StatusBar style="light" />
      <PageBackground variant="modes" />
      <StoryModeTopBar />
      {worldviewId ? (
        <StoryWorldviewEncyclopedia worldviewId={worldviewId} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg.primary },
});
