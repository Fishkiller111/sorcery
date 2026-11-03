import React, { useMemo, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BondInfo } from '../../types/api';

const TRACK = '#3A3A48';
const FILL = ['#5A5A78', '#C45A78', '#E84B6A'] as const;
const DIAMOND = '#E84B6A';
const DIAMOND_SIZE = 8;
const COMPACT_DIAMOND = 6;

type BondProgressBarProps = {
  /** 0..1 fill ratio. */
  progress: number;
  style?: StyleProp<ViewStyle>;
  /** Tight track for sidebar / inline chrome. Diamond sits on the fill tip. */
  compact?: boolean;
};

/** Fallback fill when API has no bond_progress yet. */
export function bondProgressValue(bond?: BondInfo | null): number {
  if (typeof bond?.bond_progress === 'number' && Number.isFinite(bond.bond_progress)) {
    return Math.max(0, Math.min(1, bond.bond_progress));
  }
  switch (bond?.bond_state) {
    case 'bonded':
      return 0.9;
    case 'close':
      return 0.65;
    case 'warming':
      return 0.4;
    case 'distant':
    default:
      return bond ? 0.12 : 0;
  }
}

/**
 * Favorability bar — recessed pill track, blue→pink fill, diamond at the tip.
 * Visual only; no numeric labels.
 */
export function BondProgressBar({ progress, style, compact = false }: BondProgressBarProps) {
  const [trackW, setTrackW] = useState(0);
  const clamped = useMemo(() => {
    if (!Number.isFinite(progress)) return 0;
    return Math.max(0, Math.min(1, progress));
  }, [progress]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackW(e.nativeEvent.layout.width);
  };

  const diamond = compact ? COMPACT_DIAMOND : DIAMOND_SIZE;
  const minFill = compact ? 8 : 10;
  const fillWidth = trackW > 0 ? Math.max(clamped > 0 ? minFill : 0, trackW * clamped) : 0;
  const diamondLeft =
    trackW > 0
      ? Math.max(0, Math.min(trackW - diamond, fillWidth - diamond / 2))
      : 0;

  if (compact) {
    return (
      <View style={[styles.compactWrap, style]} onLayout={onTrackLayout}>
        <View style={styles.compactTrack}>
          {fillWidth > 0 ? (
            <LinearGradient
              colors={[...FILL]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.fill, { width: fillWidth }]}
            />
          ) : null}
        </View>
        {trackW > 0 && clamped > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.compactDiamond,
              { left: diamondLeft, width: diamond, height: diamond },
            ]}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.diamondRail} pointerEvents="none">
        {trackW > 0 && clamped > 0 ? (
          <View style={[styles.diamond, { left: diamondLeft }]} />
        ) : null}
      </View>
      <View style={styles.track} onLayout={onTrackLayout}>
        {fillWidth > 0 ? (
          <LinearGradient
            colors={[...FILL]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.fill, { width: fillWidth }]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingTop: 4,
  },
  compactWrap: {
    height: 12,
    justifyContent: 'center',
  },
  compactTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: TRACK,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  compactDiamond: {
    position: 'absolute',
    top: 3,
    backgroundColor: DIAMOND,
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
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
    borderColor: 'rgba(0,0,0,0.35)',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
