import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';
import type { VipPlanItem } from '../../../types/api';
import {
  formatPrice,
  monthlyEquivalent,
  monthlyIntroOriginalCents,
  yearlyOriginalCents,
  type VipTier,
} from '../../../utils/vipPlans';
import {
  PREMIUM_TRIAL_LIST_PRICE_CENTS,
  trialChargeCents,
} from '../../../utils/vipTrial';
import { DefaultAuthPrimaryButton } from './DefaultAuthPrimaryButton';

const PRICE_GOLD = '#D4AF37';
const CARD_GAP = 16;

type DefaultVipPricingCardsProps = {
  tier: VipTier;
  monthlyPlan?: VipPlanItem;
  yearlyPlan?: VipPlanItem;
  trialPlan?: VipPlanItem;
  trialPurchaseEnabled?: boolean;
  checkingOut: string | null;
  onSubscribe: (planId: string) => void;
  isDesktop: boolean;
  /** When false, hide Subscribe CTA. */
  purchaseEnabled?: boolean;
};

type PricingCardProps = {
  title: string;
  priceCents: number;
  currency: string;
  /** Period next to the primary billed amount (e.g. / mo, / year). */
  periodLabel: string;
  /** Secondary line under billed amount (e.g. about $X/mo). Must stay visually subordinate. */
  secondaryLabel?: string;
  originalCents?: number;
  badge?: string;
  highlighted?: boolean;
  planId?: string;
  checkingOut: string | null;
  onSubscribe: (planId: string) => void;
  purchaseEnabled?: boolean;
  subscribeLabel?: string;
};

function isPlanBusy(planId: string | undefined, checkingOut: string | null): boolean {
  if (!planId || !checkingOut) return false;
  return (
    checkingOut === planId ||
    checkingOut === `${planId}:stripe` ||
    checkingOut === `${planId}:nowpayments` ||
    checkingOut === `${planId}:apple`
  );
}

function PricingCard({
  title,
  priceCents,
  currency,
  periodLabel,
  secondaryLabel,
  originalCents,
  badge,
  highlighted,
  planId,
  checkingOut,
  onSubscribe,
  purchaseEnabled = true,
  subscribeLabel,
}: PricingCardProps) {
  const { t } = useI18n();
  const busy = isPlanBusy(planId, checkingOut);

  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted, !planId && styles.cardDisabled]}>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.priceBlock}>
        <View style={styles.priceRow}>
          <Text style={styles.priceMain}>{formatPrice(priceCents, currency)}</Text>
          <Text style={styles.pricePer}>{periodLabel}</Text>
        </View>
        {secondaryLabel || originalCents ? (
          <View style={styles.metaRow}>
            {secondaryLabel ? <Text style={styles.secondaryText}>{secondaryLabel}</Text> : null}
            {originalCents ? (
              <Text style={styles.originalPrice}>{formatPrice(originalCents, currency)}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {purchaseEnabled ? (
        <DefaultAuthPrimaryButton
          label={subscribeLabel ?? t('vip.shop.subscribeNow')}
          onPress={() => planId && onSubscribe(planId)}
          disabled={!planId || checkingOut !== null}
          loading={busy}
          style={styles.cta}
        />
      ) : null}
    </View>
  );
}

export function DefaultVipPricingCards({
  tier,
  monthlyPlan,
  yearlyPlan,
  trialPlan,
  trialPurchaseEnabled = false,
  checkingOut,
  onSubscribe,
  isDesktop,
  purchaseEnabled = true,
}: DefaultVipPricingCardsProps) {
  const { t, tp } = useI18n();

  const showTrialCard = tier === 'premium' && Boolean(trialPlan);

  const pricing = useMemo(() => {
    const yearlyMonthly = yearlyPlan ? monthlyEquivalent(yearlyPlan) : 0;
    const yearlyOriginal = yearlyOriginalCents(monthlyPlan);
    const monthlyOriginal = monthlyIntroOriginalCents(tier);
    return { yearlyOriginal, yearlyMonthly, monthlyOriginal };
  }, [monthlyPlan, yearlyPlan, tier]);

  const monthlyIntro =
    monthlyPlan && pricing.monthlyOriginal && pricing.monthlyOriginal > monthlyPlan.price_cents
      ? {
          badge: t('vip.shop.monthlyIntroBadge'),
          hint: t('vip.shop.monthlyIntroHint'),
          originalCents: pricing.monthlyOriginal,
        }
      : undefined;
  const yearlyBadge = yearlyPlan ? t('vip.shop.yearlyDiscountBadge') : undefined;
  const yearlyApproxMonthly =
    yearlyPlan && pricing.yearlyMonthly > 0
      ? tp('vip.shop.approxPerMonth', {
          price: formatPrice(pricing.yearlyMonthly, yearlyPlan.currency),
        })
      : undefined;

  return (
    <View style={[styles.grid, !isDesktop && styles.gridMobile]}>
      {showTrialCard && trialPlan ? (
        <View style={styles.cardCell}>
          <PricingCard
            title={t('vip.shop.weeklyPlan')}
            priceCents={trialChargeCents(trialPlan)}
            currency={trialPlan.currency}
            periodLabel={t('vip.shop.trialPeriod')}
            secondaryLabel={t('vip.shop.trialSubtitle')}
            originalCents={PREMIUM_TRIAL_LIST_PRICE_CENTS}
            badge={t('vip.shop.trialBadge')}
            highlighted
            planId={trialPlan.id}
            checkingOut={checkingOut}
            onSubscribe={onSubscribe}
            purchaseEnabled={trialPurchaseEnabled}
            subscribeLabel={t('vip.shop.trialCta')}
          />
        </View>
      ) : null}
      <View style={styles.cardCell}>
        <PricingCard
          title={t('vip.shop.monthlyPlan')}
          priceCents={monthlyPlan?.price_cents ?? 0}
          currency={monthlyPlan?.currency ?? 'USD'}
          periodLabel={t('vip.shop.perMonthShort')}
          secondaryLabel={monthlyIntro?.hint}
          originalCents={monthlyIntro?.originalCents}
          badge={monthlyIntro?.badge}
          planId={monthlyPlan?.id}
          checkingOut={checkingOut}
          onSubscribe={onSubscribe}
          purchaseEnabled={purchaseEnabled}
        />
      </View>
      <View style={styles.cardCell}>
        <PricingCard
          title={t('vip.shop.yearlyPlan')}
          priceCents={yearlyPlan?.price_cents ?? 0}
          currency={yearlyPlan?.currency ?? 'USD'}
          periodLabel={t('vip.shop.perYearShort')}
          secondaryLabel={yearlyApproxMonthly}
          originalCents={pricing.yearlyOriginal}
          badge={yearlyBadge}
          highlighted
          planId={yearlyPlan?.id}
          checkingOut={checkingOut}
          onSubscribe={onSubscribe}
          purchaseEnabled={purchaseEnabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: 28,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  cardCell: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    flex: 1,
    minHeight: 220,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 40px rgba(0,0,0,0.35)' } as object) : null),
  },
  cardHighlighted: {
    borderColor: 'rgba(212,175,55,0.45)',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  badge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  badgeText: Typo(
    {
      color: PRICE_GOLD,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    'sans',
  ),
  cardTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    'serif',
  ),
  priceBlock: {
    marginBottom: 12,
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  priceMain: Typo(
    {
      color: PRICE_GOLD,
      fontSize: 36,
      lineHeight: 42,
      fontWeight: '700',
    },
    'display',
  ),
  pricePer: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  secondaryText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
    },
    'sans',
  ),
  originalPrice: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      textDecorationLine: 'line-through',
    },
    'sans',
  ),
  cta: {
    marginTop: 'auto' as unknown as number,
  },
});
