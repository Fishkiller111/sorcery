import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, Line, Marker, Path } from 'react-native-svg';
import { resolveStaticUrl } from '../../../constants/config';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import type { WorldLevelStatus } from '../../../types/world';
import { TOKENS } from '../theme/tokens';

type Props = {
  levels: WorldLevelStatus[];
  mapImage?: string;
  onPressLevel: (level: WorldLevelStatus) => void;
};

function clampPct(n: number | undefined, fallback: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback;
  return Math.min(96, Math.max(2, n));
}

export function WorldLevelMap({ levels, mapImage, onPressLevel }: Props) {
  const { width } = useWindowDimensions();
  const { t, lang } = useI18n();
  const mapW = Math.min(width - 32, 720);
  const mapH = (mapW * 9) / 16;
  const uri = mapImage ? resolveStaticUrl(mapImage) : null;

  const byCode = useMemo(() => {
    const m = new Map<string, WorldLevelStatus>();
    for (const lv of levels) m.set(lv.code, lv);
    return m;
  }, [levels]);

  const edges = useMemo(() => {
    const out: { from: WorldLevelStatus; to: WorldLevelStatus }[] = [];
    for (const lv of levels) {
      for (const fromCode of lv.unlock_from ?? []) {
        const from = byCode.get(fromCode);
        if (from) out.push({ from, to: lv });
      }
    }
    return out;
  }, [byCode, levels]);

  const pathOrder = useMemo(() => {
    const order = new Map<string, number>();
    const start = levels.find((l) => l.is_start);
    if (!start) return order;
    const q = [start.code];
    order.set(start.code, 1);
    let step = 1;
    while (q.length) {
      const cur = q.shift()!;
      const children = levels.filter((l) => (l.unlock_from ?? []).includes(cur));
      for (const ch of children) {
        if (order.has(ch.code)) continue;
        step += 1;
        order.set(ch.code, step);
        q.push(ch.code);
      }
    }
    return order;
  }, [levels]);

  const pos = (lv: WorldLevelStatus, index: number) => {
    const fallbackX = 18 + (index % 4) * 20;
    const fallbackY = 28 + Math.floor(index / 4) * 28;
    return {
      x: clampPct(lv.map_x, fallbackX),
      y: clampPct(lv.map_y, fallbackY),
    };
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.board, { width: mapW, height: mapH }]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.boardFallback]}>
            <Text style={Typo(styles.fallbackText, 'sans', lang)}>{t('worldPlay.mapNoImage')}</Text>
          </View>
        )}

        <Svg width={mapW} height={mapH} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Marker id="worldMapArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <Path d="M0,0 L6,3 L0,6 Z" fill="#f5e6c8" />
            </Marker>
          </Defs>
          {edges.map((edge, i) => {
            const a = pos(edge.from, levels.indexOf(edge.from));
            const b = pos(edge.to, levels.indexOf(edge.to));
            return (
              <Line
                key={`${edge.from.code}-${edge.to.code}-${i}`}
                x1={`${a.x}%`}
                y1={`${a.y}%`}
                x2={`${b.x}%`}
                y2={`${b.y}%`}
                stroke="#f5e6c8"
                strokeWidth={2}
                strokeDasharray="5 4"
                markerEnd="url(#worldMapArrow)"
              />
            );
          })}
        </Svg>

        {levels.map((lv, index) => {
          const p = pos(lv, index);
          const step = pathOrder.get(lv.code);
          return (
            <Pressable
              key={lv.code}
              onPress={() => onPressLevel(lv)}
              style={[
                styles.pin,
                {
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                },
                !lv.unlocked && styles.pinLocked,
                lv.cleared && styles.pinCleared,
                lv.is_start && styles.pinStart,
              ]}
            >
              {step ? (
                <View style={styles.stepBadge}>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ) : null}
              <Text style={Typo(styles.pinTitle, 'sans', lang)} numberOfLines={2}>
                {lv.unlocked ? lv.title || lv.code : '???'}
              </Text>
              {lv.is_start ? (
                <Text style={Typo(styles.pinStartLabel, 'sans', lang)}>{t('worldPlay.start')}</Text>
              ) : null}
            </Pressable>
          );
        })}

        {!levels.length ? (
          <View style={styles.emptyOverlay}>
            <Text style={Typo(styles.fallbackText, 'sans', lang)}>{t('worldPlay.noLevels')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={Typo(styles.hint, 'sans', lang)}>{t('worldPlay.mapHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  board: {
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f1c18',
    borderWidth: 1,
    borderColor: 'rgba(245,230,200,0.18)',
  },
  boardFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#13241f',
  },
  fallbackText: Typo({ color: 'rgba(245,230,200,0.55)', fontSize: 13 }, 'sans'),
  pin: {
    position: 'absolute',
    width: 56,
    height: 56,
    marginLeft: -28,
    marginTop: -28,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(110, 231, 183, 0.7)',
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pinStart: { borderColor: '#fbbf24' },
  pinCleared: { borderColor: '#34d399' },
  pinLocked: { opacity: 0.55, borderColor: 'rgba(163,163,163,0.5)' },
  pinTitle: Typo({ color: '#ecfdf5', fontSize: 10, fontWeight: '700', textAlign: 'center' }, 'sans'),
  pinStartLabel: Typo({ color: '#fde68a', fontSize: 9, marginTop: 1 }, 'sans'),
  stepBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: '#451a03', fontSize: 9, fontWeight: '800' },
  emptyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, lineHeight: 17 }, 'sans'),
});
