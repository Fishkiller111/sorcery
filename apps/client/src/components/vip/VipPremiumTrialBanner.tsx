import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { COLORS } from '../../theme/colors';
import type { VipPlanItem } from '../../types/api';
import { formatPrice } from '../../utils/vipPlans';
import {
  PREMIUM_TRIAL_LIST_PRICE_CENTS,
  trialChargeCents,
} from '../../utils/vipTrial';

type VipPremiumTrialBannerProps = {
  plan?: VipPlanItem;
  checkingOut: string | null;
  onCheckout: (planId: string) => void;
  purchaseEnabled?: boolean;
  /** default theme uses gold accent; soviet/default pages pass their button separately */
  renderCta?: (opts: { label: string; busy: boolean; onPress: () => void; disabled: boolean }) => React.ReactNode;
};

export function VipPremiumTrialBanner({
  plan,
  checkingOut,
  onCheckout,
  purchaseEnabled = true,
  renderCta,
}: VipPremiumTrialBannerProps) {
  const { t } = useI18n();
  if (!plan) return null;

  const charge = trialChargeCents(plan);
  const busy = checkingOut === plan.id || checkingOut === `${plan.id}:stripe`;
  const disabled = !purchaseEnabled || busy;

  const ctaLabel = t('vip.shop.trialCta');
  const onPress = () => onCheckout(plan.id);

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>{t('vip.shop.trialBadge')}</Text>
      </View>
      <Text style={styles.title}>{t('vip.shop.trialTitle')}</Text>
      <Text style={styles.subtitle}>{t('vip.shop.trialSubtitle')}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceNow}>{formatPrice(charge, plan.currency)}</Text>
        <Text style={styles.pricePeriod}>{t('vip.shop.trialPeriod')}</Text>
        <Text style={styles.priceWas}>
          {formatPrice(PREMIUM_TRIAL_LIST_PRICE_CENTS, plan.currency)}
        </Text>
      </View>
      {renderCta ? (
        renderCta({ label: ctaLabel, busy, onPress, disabled })
      ) : (
        <Pressable
          style={[styles.cta, disabled && styles.ctaDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled, busy }}
          disabled={disabled}
          onPress={onPress}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
    gap: 8,
  },
  badgeRow: {
    alignItems: 'flex-start',
  },
  badge: Typo(
    {
      color: '#FF4D4F',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    'sans',
  ),
  title: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    'serif',
  ),
  subtitle: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    'sans',
  ),
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  priceNow: Typo(
    {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '800',
    },
    'sans',
  ),
  pricePeriod: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 14,
    },
    'sans',
  ),
  priceWas: Typo(
    {
      color: 'rgba(255,255,255,0.45)',
      fontSize: 15,
      textDecorationLine: 'line-through',
    },
    'sans',
  ),
  cta: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#9e1b1b',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: Typo(
    {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    'sans',
  ),
});
