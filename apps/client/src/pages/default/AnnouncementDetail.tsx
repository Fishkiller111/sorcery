import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Linking,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { safeGoBack } from '../../utils/safeGoBack';
import { formatApiError } from '../../utils/apiError';
import { notifyError } from '../../utils/notify';
import { fetchActiveAnnouncements, ANNOUNCEMENT_PLACEMENT_PROFILE } from '../../api/announcements';
import { markAnnouncementRead } from '../../utils/announcementReadStorage';
import { useAnnouncementUnreadStore } from '../../stores/announcementUnreadStore';
import type { AnnouncementItem } from '../../types/api';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { resolveStaticUrl } from '../../constants/config';
import { themedScrollViewProps } from '../../theme/webScrollbar';

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

export function DefaultAnnouncementDetail() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const announcementId = useMemo(() => {
    const value = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!value) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }, [rawId]);

  const { t, lang } = useI18n();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const refreshUnread = useAnnouncementUnreadStore((s) => s.refresh);
  const [item, setItem] = useState<AnnouncementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!announcementId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    try {
      const resp = await fetchActiveAnnouncements(lang, ANNOUNCEMENT_PLACEMENT_PROFILE);
      const found = (resp.items ?? []).find((row) => row.id === announcementId) ?? null;
      if (!found) {
        setItem(null);
        setNotFound(true);
        return;
      }
      setItem(found);
      await markAnnouncementRead(found.id);
      await refreshUnread(lang);
    } catch (err) {
      notifyError(t('system.error'), formatApiError(t, err));
      setItem(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [announcementId, lang, t, refreshUnread]);

  useEffect(() => {
    void load();
  }, [load]);

  const dateLabel = formatAnnouncementDate(item?.created_at, lang);
  const linkUrl = item?.link_url?.trim() ?? '';
  const imageUrl = resolveStaticUrl(item?.image_url?.trim()) || '';

  return (
    <DefaultShell scrollable={false}>
      <View style={[styles.page, pageContentPadding]}>
        <View style={styles.header}>
          <DefaultBackButton
            onPress={() => safeGoBack('/announcements', router)}
            accessibilityLabel={t('vip.shop.back')}
          />
          <Text style={styles.title} numberOfLines={1}>
            {t('announcement.detailTitle')}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={TOKENS.colors.accent} />
          </View>
        ) : notFound || !item ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{t('errors.announcementNotFound')}</Text>
          </View>
        ) : (
          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebProps.style]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={imageUrl ? styles.mediaRow : undefined}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.hero} resizeMode="cover" />
                ) : null}
                <View style={imageUrl ? styles.textCol : undefined}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {dateLabel ? <Text style={styles.date}>{dateLabel}</Text> : null}
                  <Text style={styles.body}>{item.body}</Text>
                </View>
              </View>
              {linkUrl ? (
                <Pressable
                  onPress={() => {
                    void Linking.openURL(linkUrl).catch(() => {
                      notifyError(t('system.error'), t('announcement.openLinkFailed'));
                    });
                  }}
                  style={({ pressed }) => [styles.linkBtn, pressed && styles.linkBtnPressed]}
                  accessibilityRole="link"
                >
                  <Text style={styles.linkBtnText}>{t('announcement.openLink')}</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        )}
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
    paddingBottom: 24,
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
  headerRightPlaceholder: {
    width: 40,
    height: 40,
  },
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        } as object)
      : {}),
  },
  hero: {
    width: 168,
    maxWidth: '38%',
    aspectRatio: 9 / 16,
    borderRadius: TOKENS.radius.card,
    backgroundColor: TOKENS.colors.cardBorderFaint,
    flexShrink: 0,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  itemTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 30,
    },
    'display',
  ),
  date: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
    },
    'sans',
  ),
  body: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 15,
      lineHeight: 24,
    },
    'sans',
  ),
  linkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  linkBtnPressed: {
    backgroundColor: TOKENS.colors.accentPressed,
  },
  linkBtnText: Typo(
    {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
});
