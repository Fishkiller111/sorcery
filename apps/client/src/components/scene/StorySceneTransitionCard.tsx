import React from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

interface StorySceneTransitionCardProps {
  visible: boolean;
  title: string;
  hint: string;
}

export function StorySceneTransitionCard({ visible, title, hint }: StorySceneTransitionCardProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>
          <ActivityIndicator color={COLORS.accent.gold} style={styles.spinner} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.bg.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.accent.gold,
    padding: 22,
    alignItems: 'center',
  },
  title: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
    },
    'display',
  ),
  hint: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
    },
    'sans',
  ),
  spinner: {
    marginTop: 20,
  },
});
