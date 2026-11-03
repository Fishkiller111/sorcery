import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
  type GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { AGE_MAX, clampAge } from '../../../../components/create-agent/age';

const TRACK = '#3A3A48';
const FILL = ['#5A5A78', '#C45A78', '#E84B6A'] as const;
const DIAMOND = '#E84B6A';
const DIAMOND_SIZE = 8;

type DefaultCreateAgentAgeFieldProps = {
  value: number;
  onChange: (age: number) => void;
};

/**
 * Age control — BondProgressBar look (pill + blue→pink fill + diamond) with drag + numeric input.
 */
export function DefaultCreateAgentAgeField({ value, onChange }: DefaultCreateAgentAgeFieldProps) {
  const age = clampAge(value);
  const [trackW, setTrackW] = useState(0);
  const [draftText, setDraftText] = useState(String(age));
  const trackWRef = useRef(0);
  const trackPageX = useRef(0);
  const trackRef = useRef<View>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const progress = AGE_MAX > 0 ? age / AGE_MAX : 0;

  const applyFromPageX = useCallback((pageX: number) => {
    const w = trackWRef.current;
    if (w <= 0) return;
    const ratio = Math.max(0, Math.min(1, (pageX - trackPageX.current) / w));
    onChangeRef.current(clampAge(ratio * AGE_MAX));
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          trackRef.current?.measureInWindow((x) => {
            trackPageX.current = x;
            applyFromPageX(e.nativeEvent.pageX);
          });
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          applyFromPageX(e.nativeEvent.pageX);
        },
      }),
    [applyFromPageX],
  );

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWRef.current = w;
    setTrackW(w);
  };

  const fillWidth = trackW > 0 ? Math.max(progress > 0 ? 10 : 0, trackW * progress) : 0;
  const diamondLeft =
    trackW > 0
      ? Math.max(0, Math.min(trackW - DIAMOND_SIZE, fillWidth - DIAMOND_SIZE / 2))
      : 0;

  useEffect(() => {
    setDraftText(String(age));
  }, [age]);

  const commitText = () => {
    const parsed = Number.parseInt(draftText.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(parsed)) {
      setDraftText(String(age));
      return;
    }
    const next = clampAge(parsed);
    onChange(next);
    setDraftText(String(next));
  };

  return (
    <View style={styles.row}>
      <View style={styles.sliderCol}>
        <View style={styles.diamondRail} pointerEvents="none">
          {trackW > 0 && progress > 0 ? (
            <View style={[styles.diamond, { left: diamondLeft }]} />
          ) : null}
        </View>
        <View
          ref={trackRef}
          style={styles.track}
          onLayout={onTrackLayout}
          {...pan.panHandlers}
        >
          {fillWidth > 0 ? (
            <LinearGradient
              colors={[...FILL]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.fill, { width: fillWidth }]}
              pointerEvents="none"
            />
          ) : null}
        </View>
      </View>
      <TextInput
        style={styles.input}
        value={draftText}
        onChangeText={(text) => setDraftText(text.replace(/[^\d]/g, '').slice(0, 3))}
        onBlur={commitText}
        onSubmitEditing={commitText}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={3}
        selectTextOnFocus
        accessibilityLabel="Age"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  sliderCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
  },
  diamondRail: {
    height: DIAMOND_SIZE + 2,
    marginBottom: 4,
    position: 'relative',
  },
  diamond: {
    position: 'absolute',
    top: 0,
    width: DIAMOND_SIZE,
    height: DIAMOND_SIZE,
    backgroundColor: DIAMOND,
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: TRACK,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.35)',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  input: Typo(
    {
      width: 56,
      height: 40,
      borderRadius: TOKENS.radius.input,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: TOKENS.colors.inputBg,
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
    'sans',
  ),
});
