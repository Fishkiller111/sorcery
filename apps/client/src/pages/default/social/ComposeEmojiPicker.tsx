import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SOCIAL } from './socialTokens';
import { themedScrollViewProps } from '../../../theme/webScrollbar';

/** Compact emoji set for post compose (Unicode; no extra deps). */
export const COMPOSE_EMOJI_GROUPS: { title: string; emojis: string[] }[] = [
  {
    title: 'Smileys',
    emojis: [
      '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
      '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗',
      '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
      '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜',
      '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️',
      '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨',
      '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵',
      '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇',
    ],
  },
  {
    title: 'Gestures',
    emojis: [
      '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞',
      '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️',
      '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🫶', '❤️',
    ],
  },
  {
    title: 'Hearts',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '✨',
    ],
  },
  {
    title: 'Fun',
    emojis: [
      '🔥', '⭐', '🌟', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇',
      '🎯', '🎮', '🎲', '🧩', '🎵', '🎶', '📷', '🎬', '🚀', '🌈',
      '☀️', '🌙', '⚡', '❄️', '🌸', '🌹', '🍀', '🐱', '🐶', '🦊',
    ],
  },
];

type ComposeEmojiPickerProps = {
  onPick: (emoji: string) => void;
};

export function ComposeEmojiPicker({ onPick }: ComposeEmojiPickerProps) {
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  return (
    <View style={styles.wrap}>
      <ScrollView
        {...scrollWebProps}
        style={[styles.scroll, scrollWebProps.style]}
        showsVerticalScrollIndicator={false}
      >
        {COMPOSE_EMOJI_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.grid}>
              {group.emojis.map((emoji) => (
                <Pressable
                  key={`${group.title}-${emoji}`}
                  style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
                  onPress={() => onPick(emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={emoji}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  group: {
    marginBottom: 10,
  },
  groupTitle: {
    color: SOCIAL.handle,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cellPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emoji: {
    fontSize: 22,
  },
});
