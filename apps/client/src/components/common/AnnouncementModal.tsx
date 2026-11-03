import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchActiveAnnouncements, ANNOUNCEMENT_PLACEMENT_HOME } from '../../api/announcements';
import { useI18n } from '../../i18n/I18nContext';
import { SocialLinks } from './SocialLinks';
import { DismissTodayCheckbox } from './DismissTodayCheckbox';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { useTheme } from '../../theme/system/ThemeContext';
import { TOKENS } from '../../pages/default/theme/tokens';
import { Typo } from '../../theme/typography';
import { listDismissedTodayIds, saveDismissTodayIds } from '../../utils/dismissTodayStorage';
import { resolveStaticUrl } from '../../constants/config';
import { notifyError } from '../../utils/notify';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import type { AnnouncementItem } from '../../types/api';

const DISMISS_TODAY_KEY = '@soulthread_announcement_dismiss_today';
const SOVIET_LABEL = '#8a8278';
const SOVIET_TEXT = '#d1cec7';

function sortAnnouncements(items: AnnouncementItem[]): AnnouncementItem[] {
  return [...items].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return (b.created_at ?? 0) - (a.created_at ?? 0);
  });
}

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

type AnnouncementModalProps = {
  onComplete?: () => void;
};

export function AnnouncementModal({ onComplete }: AnnouncementModalProps) {
  const { lang, t, tp } = useI18n();
  const { themeId } = useTheme();
  const isDefaultTheme = themeId === 'default';
  const [queue, setQueue] = useState<AnnouncementItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissToday, setDismissToday] = useState(false);
  const checkedRef = useRef(false);

  const { width: windowWidth } = useWindowDimensions();
  const current = queue[index] ?? null;
  const canPage = queue.length > 1;
  const cardWidth = Math.min(Math.round(windowWidth * 0.92), 560);
  const posterWidth = Math.min(168, Math.round((cardWidth - 56) * 0.38));
  const posterHeight = Math.round(posterWidth * (16 / 9));
  const scrollWebProps = useMemo(() => themedScrollViewProps(isDefaultTheme ? 'default' : 'soviet'), [isDefaultTheme]);

  const completeFlow = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchActiveAnnouncements(lang, ANNOUNCEMENT_PLACEMENT_HOME),
      listDismissedTodayIds(DISMISS_TODAY_KEY),
    ])
      .then(([resp, dismissedIds]) => {
        if (cancelled) return;
        const dismissed = new Set(dismissedIds);
        const next = sortAnnouncements(resp.items ?? []).filter((item) => !dismissed.has(item.id));
        setQueue(next);
        setIndex(0);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const tryShow = useCallback(() => {
    if (!loaded) return;
    if (!current) {
      setVisible(false);
      completeFlow();
      return;
    }
    setDismissToday(false);
    setVisible(true);
  }, [loaded, current, completeFlow]);

  useFocusEffect(
    useCallback(() => {
      checkedRef.current = false;
      tryShow();
      checkedRef.current = true;
    }, [tryShow]),
  );

  useEffect(() => {
    if (checkedRef.current) {
      tryShow();
    }
  }, [loaded, current, tryShow]);

  const goBy = useCallback(
    (delta: number) => {
      if (queue.length < 2) return;
      setIndex((prev) => (prev + delta + queue.length) % queue.length);
    },
    [queue.length],
  );

  const handleConfirm = useCallback(async () => {
    if (dismissToday && queue.length) {
      await saveDismissTodayIds(
        DISMISS_TODAY_KEY,
        queue.map((item) => item.id),
      );
    }
    setVisible(false);
    setDismissToday(false);
    completeFlow();
  }, [dismissToday, queue, completeFlow]);

  const openLink = useCallback(() => {
    const url = current?.link_url?.trim();
    if (!url) return;
    void Linking.openURL(url).catch(() => {
      notifyError(t('system.error'), t('announcement.openLinkFailed'));
    });
  }, [current?.link_url, t]);

  if (!loaded) return null;
  if (!current) return null;

  const imageUrl = resolveStaticUrl(current.image_url?.trim()) || '';
  const linkUrl = current.link_url?.trim() || '';
  const dateLabel = formatAnnouncementDate(current.created_at, lang);
  const pagerColor = isDefaultTheme ? TOKENS.colors.textSecondary : SOVIET_LABEL;
  const titleColor = isDefaultTheme ? TOKENS.colors.text : SOVIET_TEXT;
  const bodyColor = isDefaultTheme ? TOKENS.colors.textSecondary : SOVIET_TEXT;
  const mutedColor = isDefaultTheme ? TOKENS.colors.textMuted : SOVIET_LABEL;
  const accent = isDefaultTheme ? TOKENS.colors.accent : '#c43e3e';
  const bodyHeight = imageUrl ? posterHeight : Math.max(posterHeight - 40, 200);

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      title={current.title}
      hideTitle
      subtitleTone="body"
      cardWidth={cardWidth}
      bodyMaxHeight={bodyHeight}
      bodyMinHeight={bodyHeight}
      confirmBtnWidthRatio={CONFIRM_BTN_WIDTH_RATIO}
      hideCancel
      dismissOnBackdrop={false}
      confirmLabel={t('announcement.confirm')}
      onCancel={() => {
        void handleConfirm();
      }}
      onConfirm={() => {
        void handleConfirm();
      }}
      bodyContent={
        <View style={[styles.mediaRow, !imageUrl && styles.mediaRowTextOnly]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.poster, { width: posterWidth, height: posterHeight }]}
              resizeMode="cover"
            />
          ) : null}
          <ScrollView
            {...scrollWebProps}
            style={[styles.textCol, { maxHeight: bodyHeight }]}
            contentContainerStyle={styles.textColContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <Text style={[styles.itemTitle, { color: titleColor }]}>{current.title}</Text>
            {dateLabel ? <Text style={[styles.date, { color: mutedColor }]}>{dateLabel}</Text> : null}
            {current.body ? <Text style={[styles.bodyText, { color: bodyColor }]}>{current.body}</Text> : null}
            {linkUrl ? (
              <Pressable
                onPress={openLink}
                style={({ pressed }) => [
                  styles.linkBtn,
                  isDefaultTheme ? styles.linkBtnDefault : { borderColor: accent },
                  pressed && styles.linkBtnPressed,
                ]}
                accessibilityRole="link"
              >
                <Text
                  style={[
                    styles.linkBtnText,
                    { color: isDefaultTheme ? '#fff' : accent },
                  ]}
                >
                  {t('announcement.openLink')}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      }
      footerExtra={
        <View style={styles.footerExtra}>
          {canPage ? (
            <View style={styles.pager}>
              <Pressable
                onPress={() => goBy(-1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('announcement.prev')}
                style={({ pressed }) => [styles.pagerBtn, pressed && styles.pagerBtnPressed]}
              >
                <Ionicons name="chevron-back" size={18} color={pagerColor} />
                <Text style={[styles.pagerBtnText, { color: pagerColor }]}>{t('announcement.prev')}</Text>
              </Pressable>
              <Text style={[styles.pagerCount, { color: pagerColor }]}>
                {tp('announcement.pager', { current: index + 1, total: queue.length })}
              </Text>
              <Pressable
                onPress={() => goBy(1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('announcement.next')}
                style={({ pressed }) => [styles.pagerBtn, pressed && styles.pagerBtnPressed]}
              >
                <Text style={[styles.pagerBtnText, { color: pagerColor }]}>{t('announcement.next')}</Text>
                <Ionicons name="chevron-forward" size={18} color={pagerColor} />
              </Pressable>
            </View>
          ) : null}
          <DismissTodayCheckbox
            label={t('announcement.dismissToday')}
            checked={dismissToday}
            onToggle={() => setDismissToday((v) => !v)}
            variant={isDefaultTheme ? 'default' : 'soviet'}
          />
          <SocialLinks
            style={styles.socialLinks}
            color={isDefaultTheme ? TOKENS.colors.textMuted : undefined}
          />
        </View>
      }
    />
  );
}

const CONFIRM_BTN_WIDTH_RATIO = 0.72;

const styles = StyleSheet.create({
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  mediaRowTextOnly: {
    flexDirection: 'column',
  },
  poster: {
    borderRadius: TOKENS.radius.card,
    backgroundColor: TOKENS.colors.cardBorderFaint,
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  textColContent: {
    gap: 8,
    paddingBottom: 4,
  },
  itemTitle: Typo(
    {
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 24,
    },
    'display',
  ),
  date: Typo(
    {
      fontSize: 12,
    },
    'sans',
  ),
  bodyText: Typo(
    {
      fontSize: 14,
      lineHeight: 22,
    },
    'sans',
  ),
  linkBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: TOKENS.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  linkBtnDefault: {
    borderWidth: 0,
    backgroundColor: TOKENS.colors.accent,
  },
  linkBtnPressed: {
    opacity: 0.72,
  },
  linkBtnText: Typo(
    {
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
  footerExtra: {
    gap: 10,
    alignItems: 'center',
  },
  pager: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
    paddingHorizontal: 4,
  },
  pagerBtnPressed: {
    opacity: 0.65,
  },
  pagerBtnText: Typo(
    {
      fontSize: 13,
    },
    'sans',
  ),
  pagerCount: Typo(
    {
      fontSize: 13,
      fontVariant: ['tabular-nums'],
    },
    'sans',
  ),
  socialLinks: {
    marginTop: 2,
  },
});
