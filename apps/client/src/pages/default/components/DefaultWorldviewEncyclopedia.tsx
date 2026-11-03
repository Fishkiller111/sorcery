import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { resolveStaticUrl } from '../../../constants/config';
import { getWorldview } from '../../../api/worldviews';
import { notifyError } from '../../../utils/notify';
import { formatApiError } from '../../../utils/apiError';
import { WorldviewAspectImage } from '../../../components/free-chat/WorldviewAspectImage';
import type { WorldviewDetailResp, WorldviewSupplementItem } from '../../../types/api';
import { TOKENS } from '../theme/tokens';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { themedScrollViewProps } from '../../../theme/webScrollbar';

type SectionId = string;

interface NavItem {
  id: SectionId;
  label: string;
  supplement?: WorldviewSupplementItem;
}

type DefaultWorldviewEncyclopediaProps = {
  worldviewId: string;
  onBack: () => void;
};

function BodyText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) {
    return <Text style={styles.body}>{text}</Text>;
  }
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <Text key={index} style={[styles.body, index > 0 && styles.bodyParagraph]}>
          {paragraph.trim()}
        </Text>
      ))}
    </>
  );
}

function SupplementContent({ supplement }: { supplement: WorldviewSupplementItem }) {
  return (
    <>
      {supplement.image ? (
        <WorldviewAspectImage
          uri={supplement.image}
          defaultAspect="4:3"
          style={styles.contentImage}
        />
      ) : null}
      <Text style={styles.contentTitle}>{supplement.title}</Text>
      {supplement.summary ? (
        <Text style={styles.contentSummary}>{supplement.summary}</Text>
      ) : null}
      {supplement.content ? <BodyText text={supplement.content} /> : null}
    </>
  );
}

export function DefaultWorldviewEncyclopedia({ worldviewId, onBack }: DefaultWorldviewEncyclopediaProps) {
  const { t, tp, lang } = useI18n();
  const { width, height } = useWindowDimensions();
  const isDesktop = useIsDesktop();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const [detail, setDetail] = useState<WorldviewDetailResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeId, setActiveId] = useState<SectionId>('');

  const sidebarWidth = width >= 1024 ? 320 : 280;
  const supplementsPanelHeight = Math.max(560, Math.min(780, Math.round(height * 0.68)));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    setDetail(null);

    getWorldview(worldviewId)
      .then((resp) => {
        if (cancelled) return;
        setDetail(resp);
        if (resp.supplements?.length > 0) {
          setActiveId(resp.supplements[0].id);
        } else {
          setActiveId('');
        }
      })
      .catch((err) => {
        console.error('Failed to load worldview detail:', err);
        if (!cancelled) {
          notifyError(t('freeChat.error'), formatApiError(t, err));
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [worldviewId, lang, t]);

  const navItems = useMemo<NavItem[]>(() => {
    if (!detail) return [];
    return (detail.supplements ?? []).map((supplement) => ({
      id: supplement.id,
      label: supplement.title,
      supplement,
    }));
  }, [detail]);

  const activeNav = navItems.find((item) => item.id === activeId) ?? navItems[0] ?? null;

  const coverUrl = detail?.cover_image;
  const roleCount = detail?.role_count ?? 0;

  const hasIntro = Boolean(
    detail?.summary?.trim() || detail?.background?.trim() || detail?.timeline?.trim(),
  );
  const showSupplements = !loading && !loadFailed && navItems.length > 0;

  return (
    <ScrollView
      {...scrollWebProps}
      style={[styles.root, scrollWebProps.style]}
      contentContainerStyle={styles.rootContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={TOKENS.colors.text} />
        </Pressable>
        {roleCount > 0 ? (
          <View style={styles.roleBadge}>
            <Ionicons name="people-outline" size={12} color={TOKENS.colors.text} />
            <Text style={styles.roleBadgeText}>
              {tp('freeChat.worldviewRoleCountShort', { count: roleCount })}
            </Text>
          </View>
        ) : null}
      </View>

      {coverUrl ? (
        <View style={styles.coverFrame}>
          <Image
            source={{ uri: resolveStaticUrl(coverUrl) }}
            style={styles.coverImage}
            contentFit="cover"
            contentPosition="top"
          />
        </View>
      ) : null}

      {!loading && detail ? (
        <View style={styles.intro}>
          <Text style={styles.title}>{detail.name}</Text>
          {detail.summary ? (
            <Text style={styles.summary}>{detail.summary}</Text>
          ) : null}
          {detail.background?.trim() ? (
            <View style={styles.introBody}>
              <Text style={styles.introLabel}>{t('freeChat.worldviewOverview')}</Text>
              <BodyText text={detail.background} />
            </View>
          ) : null}
          {detail.timeline?.trim() ? (
            <View style={styles.introBody}>
              <Text style={styles.introLabel}>{t('freeChat.worldviewTimeline')}</Text>
              <BodyText text={detail.timeline} />
            </View>
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TOKENS.colors.accent} />
        </View>
      ) : loadFailed ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('freeChat.worldviewNoContent')}</Text>
        </View>
      ) : !showSupplements && !hasIntro ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('freeChat.worldviewNoContent')}</Text>
        </View>
      ) : showSupplements ? (
        <View style={styles.supplementsSection}>
          <Text style={styles.supplementsHeading}>{t('freeChat.worldviewSupplements')}</Text>
          <View
            style={[
              styles.bodyRow,
              isDesktop ? { height: supplementsPanelHeight } : styles.bodyRowMobile,
            ]}
          >
            <View
              style={[
                styles.sidebar,
                isDesktop
                  ? { width: sidebarWidth, maxHeight: supplementsPanelHeight }
                  : styles.sidebarMobile,
              ]}
            >
              <ScrollView
                horizontal={!isDesktop}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.sidebarContent,
                  !isDesktop && styles.sidebarContentMobile,
                ]}
                nestedScrollEnabled
              >
                {navItems.map((item) => {
                  const selected = item.id === activeNav?.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.navItem,
                        !isDesktop && styles.navItemMobile,
                        selected && styles.navItemActive,
                        !isDesktop && selected && styles.navItemActiveMobile,
                      ]}
                      onPress={() => setActiveId(item.id)}
                    >
                      {isDesktop ? (
                        <>
                          <View style={[styles.navIndicator, selected && styles.navIndicatorActive]} />
                          <Text
                            style={[styles.navLabel, selected && styles.navLabelActive]}
                            numberOfLines={5}
                          >
                            {item.label}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.navLabel,
                              styles.navLabelMobile,
                              selected && styles.navLabelActive,
                            ]}
                            numberOfLines={2}
                          >
                            {item.label}
                          </Text>
                          <View
                            style={[styles.navIndicatorMobile, selected && styles.navIndicatorActive]}
                          />
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.contentPane, !isDesktop && styles.contentPaneMobile]}>
              {isDesktop ? (
                <ScrollView
                  {...scrollWebProps}
                  style={[styles.contentScroll, scrollWebProps.style]}
                  contentContainerStyle={styles.contentScrollInner}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {activeNav?.supplement ? (
                    <SupplementContent supplement={activeNav.supplement} />
                  ) : null}
                </ScrollView>
              ) : activeNav?.supplement ? (
                <View style={styles.contentScrollInnerMobile}>
                  <SupplementContent supplement={activeNav.supplement} />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootContent: {
    paddingHorizontal: TOKENS.layout.contentPadding,
    paddingTop: 24,
    paddingBottom: 32,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(8, 9, 13, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        } as object)
      : {}),
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: TOKENS.radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
  },
  roleBadgeText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 11,
      fontWeight: '600',
    },
    'sans',
  ),
  coverFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: TOKENS.radius.cardLg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.bgElevated,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  intro: {
    marginBottom: 20,
    gap: 8,
  },
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
    },
    'serif',
  ),
  summary: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    'sans',
  ),
  introBody: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.cardBorderFaint,
    gap: 8,
  },
  introLabel: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    'serif',
  ),
  centered: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
    'sans',
  ),
  supplementsSection: {
    marginTop: 8,
    gap: 16,
  },
  supplementsHeading: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 2.4,
      textTransform: 'uppercase',
      fontWeight: '600',
    },
    'sans',
  ),
  bodyRow: {
    flexDirection: 'row',
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.cardSolid,
    overflow: 'hidden',
  },
  bodyRowMobile: {
    flexDirection: 'column',
  },
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(8, 9, 13, 0.45)',
  },
  sidebarMobile: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.cardBorderFaint,
  },
  sidebarContent: {
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  sidebarContentMobile: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.cardBorderFaint,
  },
  navItemMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: 148,
    flexShrink: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
    gap: 8,
  },
  navItemActive: {
    backgroundColor: 'rgba(186, 60, 71, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(186, 60, 71, 0.32)',
    borderBottomColor: 'rgba(186, 60, 71, 0.32)',
  },
  navItemActiveMobile: {
    borderBottomWidth: 0,
  },
  navIndicator: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 3,
  },
  navIndicatorActive: {
    backgroundColor: TOKENS.colors.accent,
  },
  navIndicatorMobile: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  navLabel: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
      flex: 1,
    },
    'sans',
  ),
  navLabelActive: {
    color: TOKENS.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  navLabelMobile: {
    flex: 0,
  },
  contentPane: {
    flex: 1,
    minWidth: 0,
  },
  contentPaneMobile: {
    flex: 0,
    width: '100%',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 36,
  },
  contentScrollInnerMobile: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  contentImage: {
    borderRadius: TOKENS.radius.card,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    overflow: 'hidden',
  },
  contentTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      marginBottom: 12,
    },
    'serif',
  ),
  contentSummary: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 16,
    },
    'sans',
  ),
  body: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 16,
      lineHeight: 28,
    },
    'sans',
  ),
  bodyParagraph: {
    marginTop: 18,
  },
});
