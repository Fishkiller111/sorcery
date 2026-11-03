import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShellLayout } from '../../src/components/shell/ShellLayout';
import { PageBackground } from '../../src/components/ui/PageBackground';
import { DividerStar } from '../../src/components/ui/DividerStar';
import { useI18n } from '../../src/i18n/I18nContext';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import { COLORS } from '../../src/theme/colors';
import { Typo } from '../../src/theme/typography';
import { verifyVipCheckout } from '../../src/api/vip';
import { useVipStore } from '../../src/stores/vipStore';
import { useMobilePageContentPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15;
const RED_BUTTON = require('../../assets/images/ui/mode-select/pc-red_button.png');
const RED_BUTTON_ASPECT = 990 / 175;
const CARD_MAX_WIDTH = 420;

export default function VipSuccess() {
  const router = useRouter();
  const { t } = useI18n();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const { width: windowWidth } = useWindowDimensions();
  const { order_id: orderIdParam } = useLocalSearchParams<{ order_id?: string }>();
  const fetchVip = useVipStore((s) => s.fetchVip);
  const vip = useVipStore((s) => s.vip);
  const loading = useVipStore((s) => s.loading);

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const cardWidth = useMemo(() => {
    const horizontalPad = isDesktop ? 48 : 32;
    return Math.min(CARD_MAX_WIDTH, Math.max(280, windowWidth - horizontalPad * 2));
  }, [isDesktop, windowWidth]);

  const btnHeight = Math.round((cardWidth - 48) / RED_BUTTON_ASPECT);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = async (vipFromVerify?: typeof vip) => {
      if (cancelled) return;
      if (!vipFromVerify) {
        await fetchVip();
      }
      setVerifying(false);
    };

    const poll = async (attempt: number) => {
      if (cancelled) return;

      if (orderIdParam) {
        try {
          const resp = await verifyVipCheckout(String(orderIdParam));
          if (resp.status === 'paid') {
            if (resp.vip) {
              useVipStore.setState({ vip: resp.vip, loading: false });
              await finish(resp.vip);
            } else {
              await finish();
            }
            return;
          }
        } catch {
          if (!cancelled) {
            setVerifyError(t('vip.success.verifyPending'));
          }
        }
      } else if (attempt === 0) {
        await fetchVip();
        await finish();
        return;
      }

      if (attempt + 1 >= MAX_POLLS) {
        await finish();
        return;
      }
      timer = setTimeout(() => void poll(attempt + 1), POLL_INTERVAL_MS);
    };

    void poll(0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderIdParam, fetchVip, t]);

  const showSpinner = verifying || (loading && !vip);
  const activePlan = vip?.is_active ? vip.plan_name : null;

  return (
    <ShellLayout scrollable={false} showLangToggle={false}>
      <PageBackground variant="settings" />
      <LinearGradient
        colors={['#12141a', '#0a0b0f', '#050608']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.page, pageContentPadding]}>
        <View style={[styles.card, { width: cardWidth }]}>
          <View style={styles.heroBand}>
            {showSpinner ? (
              <ActivityIndicator size="small" color={COLORS.agents.paleGold} />
            ) : (
              <Ionicons name="checkmark-circle" size={36} color={COLORS.agents.brightGold} />
            )}
          </View>

          <View style={styles.cardBody}>
            {showSpinner ? (
              <Text style={styles.statusLabel}>{t('vip.success.verifying')}</Text>
            ) : (
              <>
                <View style={styles.titleRow}>
                  <DividerStar color={COLORS.soviet.embroideryLight} size={12} />
                  <Text style={styles.title}>{t('vip.success.title')}</Text>
                  <DividerStar color={COLORS.soviet.embroideryLight} size={12} />
                </View>
                <Text style={styles.body}>{t('vip.success.body')}</Text>

                {activePlan ? (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeLabel}>{t('vip.profile.active')}</Text>
                    <Text style={styles.planName}>{activePlan}</Text>
                  </View>
                ) : null}

                {verifyError ? <Text style={styles.hint}>{verifyError}</Text> : null}
              </>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnWrap, { height: btnHeight }]}
              onPress={() => router.replace('/profile')}
              disabled={showSpinner}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <ImageBackground
                source={RED_BUTTON}
                style={[styles.btnBg, { height: btnHeight, opacity: showSpinner ? 0.5 : 1 }]}
                resizeMode="stretch"
              >
                <Text style={styles.btnText}>{t('vip.success.toProfile')}</Text>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.link}
              onPress={() => router.replace('/')}
              disabled={showSpinner}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[styles.linkText, showSpinner && styles.linkDisabled]}>
                {t('vip.success.toHome')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ShellLayout>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  card: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: '#12141a',
  },
  heroBand: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5c1515',
  },
  cardBody: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 26,
      letterSpacing: 2,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'display',
  ),
  statusLabel: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 13,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'mono',
  ),
  body: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
    },
    'sans',
  ),
  planBadge: {
    alignSelf: 'center',
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    gap: 4,
  },
  planBadgeLabel: Typo(
    {
      color: COLORS.soviet.embroideryLight,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  planName: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 20,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    'display',
  ),
  hint: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 4,
      opacity: 0.85,
    },
    'sans',
  ),
  divider: {
    height: 1,
    backgroundColor: 'rgba(232,213,181,0.12)',
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  btnWrap: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
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
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  link: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  linkText: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 13,
      letterSpacing: 0.4,
    },
    'sans',
  ),
  linkDisabled: {
    opacity: 0.45,
  },
});
