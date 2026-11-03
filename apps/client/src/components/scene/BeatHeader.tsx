import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BeatConfig } from '../../engine/types';
import { AGENTS } from '../../data/storyAgents';
import { useI18n } from '../../i18n/I18nContext';
import { resolveLocalized } from '../../i18n/utils';
import { resolveAgentName } from '../../utils/agentName';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

const DOSSIER_BG = require('../../../assets/images/ui/mode-select/header_dossier_bg.png');
const DOSSIER_SRC = { width: 968, height: 564 };
const DOSSIER_CAP = { left: 118, top: 42, right: 248, bottom: 22 };
const BEAT_HEADER_MAX_W = 220;

export function beatHeaderHeight(screenW: number): number {
  const cardW = Math.min(Math.round(screenW * 0.38), BEAT_HEADER_MAX_W);
  return Math.round(cardW * (DOSSIER_SRC.height / DOSSIER_SRC.width));
}

interface BeatHeaderProps {
  beat: BeatConfig;
}

export function BeatHeader({ beat }: BeatHeaderProps) {
  const { lang } = useI18n();
  const { width: screenW } = useWindowDimensions();
  const agent = AGENTS[beat.agent];
  const agentName = resolveAgentName(agent, lang);
  const location = resolveLocalized(beat.location, lang);
  const time = resolveLocalized(beat.time, lang);

  const scaled = useMemo(() => {
    const cardW = Math.min(Math.round(screenW * 0.38), BEAT_HEADER_MAX_W);
    const cardH = beatHeaderHeight(screenW);
    return {
      cardW,
      cardH,
      locationSize: Math.max(9, Math.round(cardH * 0.11)),
      metaSize: Math.max(8, Math.round(cardH * 0.09)),
      agentSize: Math.max(8, Math.round(cardH * 0.085)),
      padLeft: Math.round(cardW * 0.14),
      padRight: Math.round(cardW * 0.3),
      padTop: Math.round(cardH * 0.22),
      padBottom: Math.round(cardH * 0.14),
    };
  }, [screenW]);

  return (
    <Animated.View entering={FadeIn.delay(100).duration(500)} style={styles.root}>
      <ImageBackground
        source={DOSSIER_BG}
        style={[styles.card, { width: scaled.cardW, height: scaled.cardH }]}
        imageStyle={styles.cardImage}
        resizeMode="stretch"
        capInsets={DOSSIER_CAP}
      >
        <View
          style={[
            styles.content,
            {
              paddingLeft: scaled.padLeft,
              paddingRight: scaled.padRight,
              paddingTop: scaled.padTop,
              paddingBottom: scaled.padBottom,
            },
          ]}
        >
          <Text
            style={[
              styles.locationText,
              { fontSize: scaled.locationSize, lineHeight: scaled.locationSize * 1.25 },
            ]}
            numberOfLines={2}
          >
            {location.toUpperCase()}
          </Text>
          <Text
            style={[
              styles.timeText,
              { fontSize: scaled.metaSize, lineHeight: scaled.metaSize * 1.3, marginTop: scaled.metaSize * 0.35 },
            ]}
          >
            {time}
          </Text>
          <Text
            style={[
              styles.agentText,
              {
                fontSize: scaled.agentSize,
                lineHeight: scaled.agentSize * 1.3,
                marginTop: scaled.agentSize * 0.5,
                color: agent.color === '#9ca3af' ? COLORS.accent.redDark : agent.color,
              },
            ]}
            numberOfLines={1}
          >
            {agentName.toUpperCase()}
          </Text>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexShrink: 0,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 2,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  locationText: Typo(
    {
      color: '#2c2620',
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    'sans',
  ),
  timeText: Typo(
    {
      color: '#5c5348',
      letterSpacing: 0.6,
    },
    'mono',
  ),
  agentText: Typo(
    {
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    'mono',
  ),
});
