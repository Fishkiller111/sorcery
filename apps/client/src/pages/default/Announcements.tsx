import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { safeGoBack } from '../../utils/safeGoBack';
import { formatApiError } from '../../utils/apiError';
import { notifyError } from '../../utils/notify';
import { fetchActiveAnnouncements, ANNOUNCEMENT_PLACEMENT_PROFILE } from '../../api/announcements';
import {
  countUnreadAnnouncements,
  pruneReadAnnouncementIds,
} from '../../utils/announcementReadStorage';
import { useAnnouncementUnreadStore } from '../../stores/announcementUnreadStore';
import { useInboxUnreadStore } from '../../stores/inboxUnreadStore';
import {
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
} from '../../api/mediaSubmissions';
import { MediaSubmissionReviewModal } from '../../components/media/MediaSubmissionReviewModal';
import type { AnnouncementItem, UserNotificationItem } from '../../types/api';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { resolveStaticUrl } from '../../constants/config';

function formatAnnouncementDate(ts?: number, lang?: string): string {
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

export function DefaultAnnouncements() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const setUnreadCount = useAnnouncementUnreadStore((s) => s.setUnreadCount);
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'system' | 'inbox'>('system');
  const [inbox, setInbox] = useState<UserNotificationItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const refreshInboxUnread = useInboxUnreadStore((s) => s.refreshInboxUnread);
  const inboxUnread = useInboxUnreadStore((s) => s.inboxUnread);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewVisible, setReviewVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchActiveAnnouncements(lang, ANNOUNCEMENT_PLACEMENT_PROFILE);
      const list = resp.items ?? [];
      setItems(list);
      const pruned = await pruneReadAnnouncementIds(list.map((item) => item.id));
      setReadIds(pruned);
      setUnreadCount(countUnreadAnnouncements(list, pruned));
    } catch (err) {
      notifyError(t('system.error'), formatApiError(t, err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [lang, t, setUnreadCount]);

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    try {
      const resp = await listUserNotifications({ page: 1, limit: 50 });
      setInbox(resp.items ?? []);
      await refreshInboxUnread();
    } catch (err) {
      notifyError(t('system.error'), formatApiError(t, err));
      setInbox([]);
    } finally {
      setInboxLoading(false);
    }
  }, [t, refreshInboxUnread]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void loadInbox();
    }, [load, loadInbox]),
  );

  const unreadCount = useMemo(() => countUnreadAnnouncements(items, readIds), [items, readIds]);

  return (
    <DefaultShell>
      <View style={[styles.page, pageContentPadding]}>
        <View style={styles.header}>
          <DefaultBackButton
            onPress={() => safeGoBack('/profile', router)}
            accessibilityLabel={t('vip.shop.back')}
          />
          <Text style={styles.title} numberOfLines={1}>
            {t('announcement.listTitle')}
          </Text>
          <View style={styles.headerRight}>
            {unreadCount > 0 ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : (
              <View style={styles.headerRightPlaceholder} />
            )}
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('system')}
            style={[styles.tab, tab === 'system' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'system' && styles.tabTextActive]}>
              {t('creationCenter.notifTabSystem')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('inbox')}
            style={[styles.tab, tab === 'inbox' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'inbox' && styles.tabTextActive]}>
              {t('creationCenter.notifTabInbox')}
              {inboxUnread > 0 ? ` (${inboxUnread > 99 ? '99+' : inboxUnread})` : ''}
            </Text>
          </Pressable>
        </View>

        {tab === 'system' ? (
          loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={TOKENS.colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{t('announcement.empty')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const unread = !readIds.has(item.id);
              const dateLabel = formatAnnouncementDate(item.created_at, lang);
              const thumb = resolveStaticUrl(item.image_url?.trim()) || '';
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/announcements/${encodeURIComponent(item.id)}`)}
                  style={({ pressed }) => [
                    styles.row,
                    unread && styles.rowUnread,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
                  ) : null}
                  <View style={styles.rowMain}>
                    <View style={styles.titleRow}>
                      {unread ? <View style={styles.unreadDot} /> : null}
                      <Text
                        style={[styles.rowTitle, unread && styles.rowTitleUnread]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <Text style={styles.rowPreview} numberOfLines={2}>
                      {item.body}
                    </Text>
                    {dateLabel ? <Text style={styles.rowDate}>{dateLabel}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )
        ) : null}

        {tab === 'inbox' ? (
          inboxLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={TOKENS.colors.accent} />
            </View>
          ) : inbox.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('creationCenter.notifEmpty')}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              <Pressable
                onPress={async () => {
                  try {
                    await markAllUserNotificationsRead();
                    await loadInbox();
                  } catch (err) {
                    notifyError(t('system.error'), formatApiError(t, err));
                  }
                }}
                style={styles.markAllBtn}
              >
                <Text style={styles.markAllText}>{t('creationCenter.notifMarkAllRead')}</Text>
              </Pressable>
              {inbox.map((n) => {
                const unread = !n.read;
                const submissionId =
                  typeof n.payload?.submission_id === 'string' ? n.payload.submission_id : '';
                const canReview = n.type === 'media_submission_pending' && !!submissionId;
                return (
                  <Pressable
                    key={n.notification_id}
                    onPress={async () => {
                      try {
                        if (unread) {
                          await markUserNotificationRead(n.notification_id);
                          await refreshInboxUnread();
                          setInbox((prev) =>
                            prev.map((x) =>
                              x.notification_id === n.notification_id ? { ...x, read: true } : x,
                            ),
                          );
                        }
                      } catch {
                        // ignore
                      }
                      if (canReview) {
                        setReviewId(submissionId);
                        setReviewVisible(true);
                      }
                    }}
                    style={[styles.row, unread && styles.rowUnread]}
                  >
                    <View style={styles.rowMain}>
                      <View style={styles.titleRow}>
                        {unread ? <View style={styles.unreadDot} /> : null}
                        <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]} numberOfLines={2}>
                          {n.title}
                        </Text>
                      </View>
                      <Text style={styles.rowPreview} numberOfLines={3}>
                        {n.body}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )
        ) : null}

        <MediaSubmissionReviewModal
          visible={reviewVisible}
          submissionId={reviewId}
          onClose={() => {
            setReviewVisible(false);
            setReviewId(null);
          }}
          onDone={() => {
            void loadInbox();
          }}
        />
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    minHeight: 40,
  },
  title: Typo(
    {
      flex: 1,
      color: TOKENS.colors.text,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    'display',
  ),
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  tabActive: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: TOKENS.colors.text,
  },
  markAllBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    color: TOKENS.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  headerRightPlaceholder: {
    width: 40,
    height: 40,
  },
  headerBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: TOKENS.radius.pill,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: Typo(
    {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    'sans',
  ),
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: 24,
  },
  emptyText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
    'sans',
  ),
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        } as object)
      : {}),
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.cardBorderFaint,
    alignSelf: 'center',
  },
  rowUnread: {
    borderColor: 'rgba(186, 60, 71, 0.45)',
    backgroundColor: 'rgba(186, 60, 71, 0.08)',
  },
  rowPressed: {
    opacity: 0.88,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.accent,
    marginTop: 7,
    flexShrink: 0,
  },
  rowTitle: Typo(
    {
      flex: 1,
      color: TOKENS.colors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
    'sans',
  ),
  rowTitleUnread: {
    color: TOKENS.colors.text,
    fontWeight: '700',
  },
  rowPreview: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    'sans',
  ),
  rowDate: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    'sans',
  ),
});
