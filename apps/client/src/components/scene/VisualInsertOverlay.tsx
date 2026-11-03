import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { resolveImage } from '../../utils/assets';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import type { ActiveVisualInsert } from '../../hooks/useStoryScenePresentation';

interface Props {
  insert: ActiveVisualInsert | null;
  onDismiss: () => void;
  showProgress?: boolean;
}

export function VisualInsertOverlay({ insert, onDismiss, showProgress }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<ActiveVisualInsert | null>(null);

  useEffect(() => {
    if (insert) {
      setCurrent(insert);
      setVisible(true);
      return;
    }
    setVisible(false);
    const timer = setTimeout(() => setCurrent(null), 450);
    return () => clearTimeout(timer);
  }, [insert?.id, insert?.image]);

  useEffect(() => {
    if (!visible || !insert) return;
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Tab' || event.key === 'Shift') return;
      event.preventDefault();
      onDismiss();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, insert?.id, onDismiss]);

  if (!current || !visible) return null;

  const source = resolveImage(current.image);
  if (!source) return null;

  return (
    <Pressable style={styles.wrap} onPress={onDismiss} accessibilityRole="button">
      <Animated.View
        entering={FadeIn.duration(current.fadeInMs)}
        exiting={FadeOut.duration(current.fadeOutMs)}
        style={styles.frame}
      >
        <Image source={source} style={styles.image} contentFit="cover" />
        <View style={styles.vignette} />
      </Animated.View>
      <View style={styles.hint} pointerEvents="none">
        {showProgress ? (
          <View style={styles.progressPill}>
            <Text style={styles.progressText}>{t('scene.turnProgress')}</Text>
            <Text style={styles.progressDots}>···</Text>
          </View>
        ) : null}
        <Text style={styles.hintText}>{t('storyHome.parallelTapAdvance')}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  frame: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  vignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  hint: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 10,
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 11, 15, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 181, 0.35)',
  },
  progressText: Typo(
    {
      color: 'rgba(243, 239, 230, 0.9)',
      fontSize: 13,
    },
    'sans',
  ),
  progressDots: Typo(
    {
      color: '#c9a227',
      fontSize: 13,
      letterSpacing: 1,
    },
    'sans',
  ),
  hintText: Typo(
    {
      color: 'rgba(243, 239, 230, 0.78)',
      fontSize: 13,
      textAlign: 'center',
    },
    'sans',
  ),
});
