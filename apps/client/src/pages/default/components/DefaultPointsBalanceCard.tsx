import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';
import { DefaultSoulCoinIcon } from './DefaultSoulCoinIcon';

type DefaultPointsBalanceCardProps = {
  balance: number;
  label: string;
  ptsLabel: string;
  /** Soul 商城余额卡用币标；邀请页等仍用默认菱形 */
  soulCoin?: boolean;
};

export function DefaultPointsBalanceCard({
  balance,
  label,
  ptsLabel,
  soulCoin = false,
}: DefaultPointsBalanceCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{balance}</Text>
          <Text style={styles.pts}>{ptsLabel}</Text>
        </View>
      </View>
      <View style={[styles.iconWrap, soulCoin && styles.iconWrapCoin]}>
        {soulCoin ? (
          <DefaultSoulCoinIcon size={52} />
        ) : (
          <Ionicons name="diamond-outline" size={28} color={TOKENS.colors.accent} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as object)
      : {}),
  },
  inner: {
    flex: 1,
    gap: 6,
  },
  label: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  value: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 40,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    'display',
  ),
  pts: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 1,
    },
    'mono',
  ),
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconWrapCoin: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
