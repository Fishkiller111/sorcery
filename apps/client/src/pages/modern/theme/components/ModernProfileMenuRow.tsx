import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HOME_IMAGES } from '../images';
import { typo } from '../typography';
import { TOKENS } from '../tokens';

type ModernProfileMenuRowProps = {
  title: string;
  description?: string;
  onPress: () => void;
  showDivider?: boolean;
};

export function ModernProfileMenuRow({
  title,
  description,
  onPress,
  showDivider = true,
}: ModernProfileMenuRowProps) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={TOKENS.modePage.textSubtle} />
      </Pressable>
      {showDivider ? (
        <Image source={HOME_IMAGES.dividerBar} style={styles.divider} resizeMode="stretch" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  pressed: {
    opacity: 0.9,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: typo(
    {
      color: TOKENS.modePage.text,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    'display',
  ),
  description: typo(
    {
      color: TOKENS.modePage.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    'sans',
  ),
  divider: {
    width: '100%',
    height: 6,
    opacity: 0.85,
  },
});
