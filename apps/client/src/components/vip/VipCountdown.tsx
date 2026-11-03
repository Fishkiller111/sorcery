import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

type VipCountdownProps = {
  compact?: boolean;
};

function CountdownClockIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="13" r="7.5" stroke={color} strokeWidth="1.6" fill="none" />
      <Path d="M12 13V9.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M12 13l2.8 1.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M9 3.5h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M10 3.5V5.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M14 3.5V5.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

export function VipCountdown({ compact = false }: VipCountdownProps) {
  const { t } = useI18n();
  const [remaining, setRemaining] = useState(secondsUntilMidnight);

  useEffect(() => {
    const id = setInterval(() => setRemaining(secondsUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  const unitSize = compact ? 36 : 44;
  const digitSize = compact ? 16 : 20;
  const iconSize = compact ? 11 : 12;

  return (
    <View style={styles.root}>
      <View style={styles.labelRow}>
        <CountdownClockIcon size={iconSize} color={COLORS.agents.paleGoldMuted} />
        <Text style={[styles.label, compact && styles.labelCompact]}>{t('vip.shop.countdownLabel')}</Text>
      </View>      <View style={styles.row}>
        {[
          { value: pad(h), unit: t('vip.shop.countdownHour') },
          { value: pad(m), unit: t('vip.shop.countdownMin') },
          { value: pad(s), unit: t('vip.shop.countdownSec') },
        ].map((part, i) => (
          <React.Fragment key={part.unit}>
            {i > 0 ? <Text style={[styles.colon, { fontSize: digitSize }]}>:</Text> : null}
            <View style={styles.unitBlock}>
              <View style={[styles.digitBox, { width: unitSize, height: unitSize }]}>
                <Text style={[styles.digit, { fontSize: digitSize, lineHeight: digitSize + 2 }]}>
                  {part.value}
                </Text>
              </View>
              <Text style={styles.unitLabel}>{part.unit}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: Typo(    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono',
  ),  labelCompact: {
    fontSize: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  unitBlock: {
    alignItems: 'center',
    gap: 4,
  },
  digitBox: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontWeight: '700',
      letterSpacing: 1,
    },
    'mono',
  ),
  colon: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontWeight: '700',
      marginTop: 8,
    },
    'mono',
  ),
  unitLabel: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 9,
      letterSpacing: 0.5,
    },
    'mono',
  ),});
