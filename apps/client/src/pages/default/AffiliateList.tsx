import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { DefaultPointsBalanceCard } from './components/DefaultPointsBalanceCard';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { safeGoBack } from '../../utils/safeGoBack';
import { formatApiError } from '../../utils/apiError';
import { notifyError } from '../../utils/notify';
import { getAffiliateMe, listAffiliateInvitees } from '../../api/affiliate';
import type { AffiliateInviteeItem } from '../../types/api';
import type { Lang } from '../../i18n/types';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { themedScrollViewProps } from '../../theme/webScrollbar';

function formatAffiliateDate(ts?: number, lang?: string): string {
  if (!ts) return '';
  try {
    return new Date(ts * 1000).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function inviteeInitial(nickname: string, emailMasked: string): string {
  const name = nickname.trim();
  if (name && name !== '—') {
    return name.slice(0, 1).toUpperCase();
  }
  const email = emailMasked.trim();
  if (email) return email.slice(0, 1).toUpperCase();
  return '?';
}

export function DefaultAffiliateList() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const isDesktop = useIsDesktop();
  const { width: windowWidth } = useWindowDimensions();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const [items, setItems] = useState<AffiliateInviteeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const me = await getAffiliateMe();
      if (!me.is_partner) {
        setForbidden(true);
        setItems([]);
        setTotal(0);
        setPage(1);
        return;
      }
      const list = await listAffiliateInvitees(1, 20);
      setItems(list.items ?? []);
      setTotal(list.total ?? 0);
      setPage(1);
    } catch (err) {
      notifyError(t('system.error'), formatApiError(t, err));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const list = await listAffiliateInvitees(nextPage, 20);
      setItems((prev) => [...prev, ...(list.items ?? [])]);
      setTotal(list.total ?? total);
      setPage(nextPage);
    } catch (err) {
      notifyError(t('system.error'), formatApiError(t, err));
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, loadingMore, page, t, total]);

  const styles = useMemo(() => createStyles(lang, isDesktop), [lang, isDesktop]);
  const stackMeta = windowWidth < 420;

  return (
    <DefaultShell>
      <View style={[styles.page, pageContentPadding]}>
        <View style={styles.header}>
          <DefaultBackButton
            onPress={() => safeGoBack('/profile', router)}
            accessibilityLabel={t('referral.back')}
          />
          <Text style={styles.title} numberOfLines={1}>
            {t('affiliate.listTitle')}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={TOKENS.colors.accent} />
          </View>
        ) : forbidden ? (
          <View style={styles.centered}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="lock-closed-outline" size={28} color={TOKENS.colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>{t('affiliate.loadFailed')}</Text>
          </View>
        ) : (
          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebProps.style]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <DefaultPointsBalanceCard
              balance={total}
              label={t('affiliate.listSubtitle')}
              ptsLabel={t('affiliate.countUnit')}
            />

            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="people-outline" size={28} color={TOKENS.colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>{t('affiliate.empty')}</Text>
                <Text style={styles.emptyHint}>{t('affiliate.listSubtitle')}</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {items.map((item, idx) => {
                  const nickname = item.nickname?.trim() || '—';
                  const joined = formatAffiliateDate(item.registered_at, lang);
                  const bound = formatAffiliateDate(item.bound_at, lang);
                  return (
                    <View
                      key={`${item.invitee_email_masked}-${item.bound_at}-${idx}`}
                      style={styles.row}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {inviteeInitial(nickname, item.invitee_email_masked)}
                        </Text>
                      </View>
                      <View style={styles.rowMain}>
                        <Text style={styles.nickname} numberOfLines={1}>
                          {nickname}
                        </Text>
                        <Text style={styles.email} numberOfLines={1}>
                          {item.invitee_email_masked}
                        </Text>
                        <View style={[styles.metaRow, stackMeta && styles.metaRowStack]}>
                          {joined ? (
                            <View style={styles.metaChip}>
                              <Ionicons
                                name="calendar-outline"
                                size={12}
                                color={TOKENS.colors.textMuted}
                              />
                              <Text style={styles.metaText} numberOfLines={1}>
                                {t('affiliate.registeredAt')} {joined}
                              </Text>
                            </View>
                          ) : null}
                          {bound ? (
                            <View style={styles.metaChip}>
                              <Ionicons
                                name="link-outline"
                                size={12}
                                color={TOKENS.colors.textMuted}
                              />
                              <Text style={styles.metaText} numberOfLines={1}>
                                {t('affiliate.boundAt')} {bound}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {items.length > 0 && items.length < total ? (
              <Pressable
                onPress={() => void handleLoadMore()}
                disabled={loadingMore}
                style={({ pressed }) => [
                  styles.loadMore,
                  pressed && styles.loadMorePressed,
                  loadingMore && styles.loadMoreDisabled,
                ]}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={TOKENS.colors.accent} />
                ) : (
                  <Text style={styles.loadMoreText}>{t('affiliate.loadMore')}</Text>
                )}
              </Pressable>
            ) : null}
          </ScrollView>
        )}
      </View>
    </DefaultShell>
  );
}

function createStyles(lang: Lang, isDesktop: boolean) {
  return StyleSheet.create({
    page: {
      flex: 1,
      width: '100%',
      maxWidth: isDesktop ? 720 : undefined,
      alignSelf: 'center',
      paddingHorizontal: isDesktop ? 24 : 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: isDesktop ? 20 : 14,
      minHeight: 40,
    },
    title: Typo(
      {
        flex: 1,
        color: TOKENS.colors.text,
        fontSize: isDesktop ? 22 : 18,
        fontWeight: '700',
        letterSpacing: 0.4,
      },
      'display',
      lang,
    ),
    headerRightPlaceholder: {
      width: 40,
      height: 40,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 240,
      paddingHorizontal: 24,
      gap: 14,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: isDesktop ? 48 : 36,
      gap: isDesktop ? 16 : 12,
    },
    list: {
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderRadius: TOKENS.radius.card,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: TOKENS.colors.card,
      paddingHorizontal: isDesktop ? 16 : 14,
      paddingVertical: isDesktop ? 16 : 14,
      ...(Platform.OS === 'web'
        ? ({
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          } as object)
        : {}),
    },
    avatar: {
      width: isDesktop ? 44 : 40,
      height: isDesktop ? 44 : 40,
      borderRadius: isDesktop ? 22 : 20,
      borderWidth: 1,
      borderColor: TOKENS.colors.inviteBannerBorder,
      backgroundColor: 'rgba(186, 60, 71, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: Typo(
      {
        color: TOKENS.colors.accent,
        fontSize: 16,
        fontWeight: '700',
      },
      'sans',
      lang,
    ),
    rowMain: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    nickname: Typo(
      {
        color: TOKENS.colors.text,
        fontSize: isDesktop ? 16 : 15,
        fontWeight: '600',
        lineHeight: 22,
      },
      'sans',
      lang,
    ),
    email: Typo(
      {
        color: TOKENS.colors.textMuted,
        fontSize: 12,
        lineHeight: 18,
      },
      'mono',
      lang,
    ),
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    metaRowStack: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 6,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      maxWidth: '100%',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: TOKENS.radius.pill,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
    },
    metaText: Typo(
      {
        color: TOKENS.colors.textMuted,
        fontSize: 11,
        flexShrink: 1,
      },
      'sans',
      lang,
    ),
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: isDesktop ? 48 : 36,
      paddingHorizontal: 20,
      borderRadius: TOKENS.radius.cardLg,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: TOKENS.colors.card,
      ...(Platform.OS === 'web'
        ? ({
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          } as object)
        : {}),
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: TOKENS.colors.inviteBannerBorder,
      backgroundColor: 'rgba(186, 60, 71, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: Typo(
      {
        color: TOKENS.colors.text,
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
      },
      'sans',
      lang,
    ),
    emptyHint: Typo(
      {
        color: TOKENS.colors.textMuted,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
        maxWidth: 280,
      },
      'sans',
      lang,
    ),
    loadMore: {
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      minWidth: 140,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: TOKENS.radius.button,
      borderWidth: 1,
      borderColor: TOKENS.colors.inviteBannerBorder,
      backgroundColor: TOKENS.colors.inviteBanner,
    },
    loadMorePressed: {
      opacity: 0.85,
    },
    loadMoreDisabled: {
      opacity: 0.7,
    },
    loadMoreText: Typo(
      {
        color: TOKENS.colors.accent,
        fontSize: 13,
        fontWeight: '600',
      },
      'sans',
      lang,
    ),
  });
}
