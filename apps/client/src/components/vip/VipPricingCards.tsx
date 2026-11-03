import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { COLORS } from '../../theme/colors';
import type { VipPlanItem } from '../../types/api';
import {
  formatPrice,
  monthlyEquivalent,
  monthlyIntroOriginalCents,
  yearlyOriginalCents,
  type VipTier,
} from '../../utils/vipPlans';
import {
  PREMIUM_TRIAL_LIST_PRICE_CENTS,
  trialChargeCents,
} from '../../utils/vipTrial';
import { VipCountdown } from './VipCountdown';

const RED_BUTTON = require('../../../assets/images/ui/mode-select/pc-red_button.png');
const RED_BUTTON_ASPECT = 990 / 175;
export const VIP_CARD_MIN_WIDTH = 200;
const CARD_GAP = 14;

function gridColumnCount(contentWidth: number): number {
  const twoColMin = 2 * VIP_CARD_MIN_WIDTH + CARD_GAP;
  const threeColMin = 3 * VIP_CARD_MIN_WIDTH + 2 * CARD_GAP;
  if (contentWidth < twoColMin) return 1;
  return contentWidth >= threeColMin ? 3 : 2;
}

function cellWidthFor(contentWidth: number, columns: number): number {
  if (columns === 1) return contentWidth;
  return Math.max(
    VIP_CARD_MIN_WIDTH,
    Math.floor((contentWidth - CARD_GAP * (columns - 1)) / columns),
  );
}

function gridTemplateColumns(columns: number): string {
  return `repeat(${columns}, minmax(${VIP_CARD_MIN_WIDTH}px, 1fr))`;
}

type VipPricingCardsProps = {
  tier: VipTier;
  monthlyPlan?: VipPlanItem;
  yearlyPlan?: VipPlanItem;
  /** PREMIUM 7-day trial welfare SKU — shown as first card when tier is premium. */
  trialPlan?: VipPlanItem;
  /** Card checkout only (Stripe); trial is hidden when false. */
  trialPurchaseEnabled?: boolean;
  contentWidth: number;
  checkingOut: string | null;
  onSubscribe: (planId: string) => void;
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
  const [layoutWidth, setLayoutWidth] = useState(VIP_CARD_MIN_WIDTH);
  const busy = isPlanBusy(planId, checkingOut);
  const btnHeight = Math.round((layoutWidth - 32) / RED_BUTTON_ASPECT);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setLayoutWidth(w);
  }, []);

  return (
    <View
      style={[styles.cardOuter, { opacity: planId ? 1 : 0.55 }]}
      onLayout={onLayout}
    >
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <View
        style={[
          styles.cardWrap,
          {
            borderColor: highlighted ? 'rgba(196,30,58,0.45)' : 'rgba(232,213,181,0.18)',
          },
        ]}
      >
        <View style={styles.cardInner}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.priceBlock}>
            <View style={styles.priceRow}>
              <Text style={styles.priceMain}>{formatPrice(priceCents, currency)}</Text>
              <Text style={styles.pricePer}>{periodLabel}</Text>
            </View>
            {secondaryLabel || originalCents ? (
              <View style={styles.priceMeta}>
                {secondaryLabel ? <Text style={styles.secondaryText}>{secondaryLabel}</Text> : null}
                {originalCents ? (
                  <Text style={styles.originalPrice}>{formatPrice(originalCents, currency)}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {purchaseEnabled ? (
          <TouchableOpacity
            style={[styles.btnWrap, { height: btnHeight }]}
            onPress={() => planId && onSubscribe(planId)}
            disabled={!planId || checkingOut !== null}
            activeOpacity={0.85}
          >
            <ImageBackground
              source={RED_BUTTON}
              style={[styles.btnBg, { height: btnHeight }]}
              resizeMode="stretch"
            >
              {busy ? (
                <ActivityIndicator color="#f0ece4" />
              ) : (
                <Text style={styles.btnText}>{subscribeLabel ?? t('vip.shop.subscribeNow')}</Text>
              )}
            </ImageBackground>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function VipPricingCards({
  tier,
  monthlyPlan,
  yearlyPlan,
  trialPlan,
  trialPurchaseEnabled = false,
  contentWidth,
  checkingOut,
  onSubscribe,
  purchaseEnabled = true,
}: VipPricingCardsProps) {
  const { t, tp } = useI18n();

  const showTrialCard = tier === 'premium' && Boolean(trialPlan);

  const columns = useMemo(() => {
    if (showTrialCard) {
      const twoColMin = 2 * VIP_CARD_MIN_WIDTH + CARD_GAP;
      const threeColMin = 3 * VIP_CARD_MIN_WIDTH + 2 * CARD_GAP;
      if (contentWidth < VIP_CARD_MIN_WIDTH) return 1;
      if (contentWidth < twoColMin) return 1;
      return contentWidth >= threeColMin ? 3 : 2;
    }
    return gridColumnCount(contentWidth);
  }, [contentWidth, showTrialCard]);
  const threeCol = columns === 3;
  const singleCol = columns === 1;
  const fallbackCellWidth = useMemo(
    () => cellWidthFor(contentWidth, columns),
    [contentWidth, columns],
  );

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

  const gridStyle = useMemo(() => {
    const webGrid =
      Platform.OS === 'web'
        ? ({
            display: 'grid',
            gridTemplateColumns: gridTemplateColumns(columns),
            gap: CARD_GAP,
          } as object)
        : null;

    const nativeGrid = Platform.OS !== 'web'
      ? {
          flexDirection: (singleCol ? 'column' : 'row') as 'column' | 'row',
          ...(singleCol ? {} : { flexWrap: 'wrap' as const }),
          gap: CARD_GAP,
        }
      : null;

    return [styles.grid, webGrid, nativeGrid, { width: contentWidth }];
  }, [columns, contentWidth, singleCol]);

  const countdownStyle = useMemo(() => {
    if (showTrialCard) {
      return [styles.countdownBelow];
    }

    const webSpan =
      Platform.OS === 'web' && !threeCol
        ? ({
            gridColumn: '1 / -1',
            justifySelf: 'center',
          } as object)
        : null;

    const nativeFullRow =
      Platform.OS !== 'web' && !threeCol
        ? { width: '100%' as const, alignItems: 'center' as const }
        : null;

    const nativeCell =
      Platform.OS !== 'web' && threeCol
        ? { width: fallbackCellWidth, minWidth: VIP_CARD_MIN_WIDTH }
        : null;

    return [styles.countdownCell, webSpan, nativeFullRow, nativeCell];
  }, [showTrialCard, threeCol, fallbackCellWidth]);

  const cardCellStyle = useMemo(() => {
    if (Platform.OS === 'web') {
      return { minWidth: VIP_CARD_MIN_WIDTH, height: '100%' as const };
    }
    if (singleCol) {
      return { width: '100%' as const };
    }
    return { width: fallbackCellWidth, minWidth: VIP_CARD_MIN_WIDTH };
  }, [singleCol, fallbackCellWidth]);

  return (
    <View style={[styles.root, { width: contentWidth }]}>
      <View style={gridStyle}>
        {showTrialCard && trialPlan ? (
          <View style={cardCellStyle}>
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
        <View style={cardCellStyle}>
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
        <View style={cardCellStyle}>
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
      <View style={countdownStyle}>
        <VipCountdown compact={showTrialCard ? false : !threeCol} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
  },
  grid: {
    width: '100%',
    alignItems: 'flex-start',
  },
  countdownCell: {
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownBelow: {
    width: '100%',
    paddingTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOuter: {
    position: 'relative',
    width: '100%',
    minWidth: VIP_CARD_MIN_WIDTH,
  },
  cardWrap: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 10,
    zIndex: 3,
    backgroundColor: COLORS.accent.redDark,
    borderWidth: 1,
    borderColor: 'rgba(196,30,58,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  badgeText: Typo(
    {
      color: '#f0ece4',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    'mono',
  ),
  cardInner: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
  },
  cardTitle: Typo(
    {
      color: 'rgba(168,168,168,0.92)',
      fontSize: 13,
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    'sans',
  ),
  priceBlock: {
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  priceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceMain: Typo(
    {
      color: '#f0ece4',
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    'display',
  ),
  pricePer: Typo(
    {
      color: 'rgba(168,168,168,0.9)',
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
  secondaryText: Typo(
    {
      color: 'rgba(113,113,122,0.95)',
      fontSize: 11,
      letterSpacing: 0.2,
    },
    'sans',
  ),
  originalPrice: Typo(
    {
      color: 'rgba(113,113,122,0.75)',
      fontSize: 11,
      textDecorationLine: 'line-through',
    },
    'mono',
  ),
  btnWrap: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  btnBg: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: Typo(
    {
      color: '#f0ece4',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    'display',
  ),
});
