import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { DefaultPointsBalanceCard } from './components/DefaultPointsBalanceCard';
import { DefaultPointsCatalogRow } from './components/DefaultPointsCatalogRow';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { safeGoBack } from '../../utils/safeGoBack';
import { formatApiError } from '../../utils/apiError';
import {
  consumePoints,
  getPointsBalance,
  getPointsCatalog,
  getPointsUnlocks,
} from '../../api/points';
import type { PointsCatalogItem, PointsUnlockItem } from '../../types/api';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';

function categoryLabel(t: (k: string) => string, category: string): string {
  switch (category) {
    case 'story_item':
      return t('pointsShop.categoryStoryItem');
    case 'story_unlock':
      return t('pointsShop.categoryStoryUnlock');
    default:
      return t('pointsShop.categoryOther');
  }
}

type GlassPanelProps = {
  title: string;
  children: React.ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
};

function GlassPanel({ title, children, emptyText, isEmpty }: GlassPanelProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.panel}>
        {isEmpty && emptyText ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export default function DefaultPointsShop() {
  const router = useRouter();
  const { t } = useI18n();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const [balance, setBalance] = useState(0);
  const [catalog, setCatalog] = useState<PointsCatalogItem[]>([]);
  const [unlocks, setUnlocks] = useState<PointsUnlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [balanceResp, catalogResp, unlockResp] = await Promise.all([
        getPointsBalance(),
        getPointsCatalog(),
        getPointsUnlocks(),
      ]);
      setBalance(balanceResp.points);
      setCatalog(catalogResp.items);
      setUnlocks(unlockResp.items);
    } catch (e) {
      notifyError(formatApiError(t, e));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRedeem = async (item: PointsCatalogItem) => {
    if (item.owned) {
      notifyWarning(t('pointsShop.alreadyOwned'));
      return;
    }
    if (balance < item.cost_points) {
      notifyWarning(t('pointsShop.insufficient'));
      return;
    }
    setRedeeming(item.id);
    try {
      const resp = await consumePoints({ catalog_id: item.id });
      setBalance(resp.balance_after);
      notifySuccess(resp.already_owned ? t('pointsShop.alreadyOwned') : t('pointsShop.redeemed'));
      await load();
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <DefaultShell scrollable>
      <View style={[styles.content, isDesktop ? styles.contentDesktop : styles.contentMobile, pageContentPadding]}>
        <DefaultBackButton onPress={() => safeGoBack('/profile')} accessibilityLabel={t('pointsShop.back')} />

        <View style={styles.header}>
          <Text style={styles.title}>{t('pointsShop.title')}</Text>
          <Text style={styles.subtitle}>{t('pointsShop.subtitle')}</Text>
          <Pressable
            onPress={() => router.push('/referral')}
            style={({ pressed }) => [styles.inviteLink, pressed && styles.inviteLinkPressed]}
            accessibilityRole="link"
          >
            <Text style={styles.inviteLinkText}>{t('pointsShop.inviteLink')}</Text>
            <Ionicons name="chevron-forward" size={14} color={TOKENS.colors.accent} />
          </Pressable>
        </View>

        <DefaultPointsBalanceCard
          balance={balance}
          label={t('pointsShop.balance')}
          ptsLabel={t('pointsShop.ptsLabel')}
          soulCoin
        />

        <View style={styles.notice}>
          <Text style={styles.noticeBadge}>{t('pointsShop.notWithdrawableBadge')}</Text>
          <Text style={styles.noticeText}>{t('pointsShop.purchasedNotWithdrawable')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={TOKENS.colors.accent} style={styles.loader} />
        ) : loadFailed ? (
          <View style={styles.errorBox}>
            <Pressable
              onPress={() => void load()}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
            >
              <Text style={styles.retryText}>{t('referral.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <GlassPanel
              title={t('pointsShop.title')}
              isEmpty={catalog.length === 0}
              emptyText={t('pointsShop.empty')}
            >
              {catalog.map((item, index) => (
                <DefaultPointsCatalogRow
                  key={item.id}
                  item={item}
                  categoryLabel={categoryLabel(t, item.category)}
                  pointsUnit={t('referral.pointsUnit')}
                  redeemLabel={t('pointsShop.redeem')}
                  ownedLabel={t('pointsShop.owned')}
                  redeeming={redeeming === item.id}
                  onRedeem={() => void onRedeem(item)}
                  isLast={index === catalog.length - 1}
                />
              ))}
            </GlassPanel>

            <GlassPanel
              title={t('pointsShop.myUnlocks')}
              isEmpty={unlocks.length === 0}
              emptyText={t('pointsShop.emptyUnlocks')}
            >
              {unlocks.map((row, index) => (
                <View
                  key={`${row.catalog_id}-${row.created_at}`}
                  style={[styles.unlockRow, index < unlocks.length - 1 && styles.unlockRowBorder]}
                >
                  <Text style={styles.unlockName}>{row.name}</Text>
                  <Text style={styles.unlockMeta}>{categoryLabel(t, row.category)}</Text>
                </View>
              ))}
            </GlassPanel>
          </>
        )}

        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={14} color={TOKENS.colors.textMuted} />
          <Text style={styles.footerHint}>{t('pointsShop.footerHint')}</Text>
        </View>
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: 24,
  },
  contentDesktop: {
    paddingTop: 24,
    paddingHorizontal: 40,
    maxWidth: 720,
    alignSelf: 'center',
    paddingBottom: 48,
  },
  contentMobile: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    gap: 10,
    marginTop: 4,
  },
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '600',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    'serif',
  ),
  subtitle: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      maxWidth: 480,
    },
    'sans',
  ),
  inviteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as object)
      : {}),
  },
  inviteLinkPressed: {
    opacity: 0.8,
  },
  inviteLinkText: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    'sans',
  ),
  notice: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
  },
  noticeBadge: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  noticeText: Typo(
    {
      flex: 1,
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    'sans',
  ),
  loader: {
    marginVertical: 32,
  },
  errorBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
  },
  retryBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  retryText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    'mono',
  ),
  section: {
    width: '100%',
    gap: 12,
  },
  sectionTitle: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  panel: {
    width: '100%',
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as object)
      : {}),
  },
  emptyWrap: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
    'sans',
  ),
  unlockRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 3,
  },
  unlockRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  unlockName: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    'sans',
  ),
  unlockMeta: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      letterSpacing: 0.3,
    },
    'mono',
  ),
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.lineFaint,
  },
  footerHint: Typo(
    {
      flex: 1,
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    'sans',
  ),
});
