import type { Lang } from '../../i18n/types';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { resolveStaticUrl } from '../../constants/config';
import { getWorldview } from '../../api/worldviews';
import { notifyError } from '../../utils/notify';
import { formatApiError } from '../../utils/apiError';
import { WorldviewAspectImage } from './WorldviewAspectImage';
import type { WorldviewDetailResp, WorldviewSupplementItem } from '../../types/api';
import { useIsDesktop } from '../../hooks/useIsDesktop';

const ENC = {
  keyTone: '#0d0b0a',
  panelBg: '#161210',
  border: 'rgba(209, 204, 192, 0.22)',
  offWhite: '#d1ccc0',
  mutedRed: '#b85c4a',
  red900: '#8B1A1A',
  redBright: '#c41e3a',
  textMuted: '#8a8278',
  textBody: '#b8b3a8',
  navDivider: '#2a2624',
  navHighlight: '#3d1414',
  badgeBg: '#3d1414',
  badgeBorder: '#5a2828',
  badgeTan: '#b89b8e',
  backBtnBg: '#3d1414',
  backBtnBorder: '#5a2828',
  backBtnIcon: '#B89C8C',
} as const;

type SectionId = string;

interface NavItem {
  id: SectionId;
  label: string;
  supplement?: WorldviewSupplementItem;
}

interface WorldviewEncyclopediaProps {
  worldviewId: string;
  onBack: () => void;
}

function BodyText({ text }: { text: string }) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
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

function SupplementContent({
  supplement,
  styles,
}: {
  supplement: WorldviewSupplementItem;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <>
      {supplement.image ? (
        <WorldviewAspectImage
          uri={supplement.image}
          defaultAspect="4:3"
          style={styles.contentImage}
        />
      ) : null}
      <View style={styles.contentTitleRow}>
        <Text style={styles.contentTitleStar}>★</Text>
        <Text style={styles.contentTitle}>{supplement.title}</Text>
      </View>
      {supplement.summary ? (
        <Text style={styles.contentSummary}>{supplement.summary}</Text>
      ) : null}
      {supplement.content ? <BodyText text={supplement.content} /> : null}
    </>
  );
}

export function WorldviewEncyclopedia({
 worldviewId, onBack }: WorldviewEncyclopediaProps) {
  const { t, tp, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const { width, height } = useWindowDimensions();
  const isDesktop = useIsDesktop();
  const [detail, setDetail] = useState<WorldviewDetailResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeId, setActiveId] = useState<SectionId>('');

  const sidebarWidth = width >= 1024 ? 300 : 260;
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
  }, [worldviewId, lang]);

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
      style={styles.root}
      contentContainerStyle={styles.rootContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        {roleCount > 0 ? (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeStar}>★</Text>
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
          <Text style={styles.eyebrow}>{t('freeChat.worldviewEncyclopedia')}</Text>
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
          <ActivityIndicator size="large" color={COLORS.accent.gold} />
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
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.navItem,
                        !isDesktop && styles.navItemMobile,
                        selected && styles.navItemActive,
                        !isDesktop && selected && styles.navItemActiveMobile,
                      ]}
                      onPress={() => setActiveId(item.id)}
                      activeOpacity={0.75}
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
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.contentPane, !isDesktop && styles.contentPaneMobile]}>
              <Image
                source={require('../../../assets/images/ui/agents/emblem_cccp_badge.png')}
                style={styles.contentWatermark}
                contentFit="contain"
              />
              {isDesktop ? (
                <ScrollView
                  style={styles.contentScroll}
                  contentContainerStyle={styles.contentInner}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {activeNav?.supplement ? (
                    <SupplementContent supplement={activeNav.supplement} styles={styles} />
                  ) : null}
                </ScrollView>
              ) : activeNav?.supplement ? (
                <View style={[styles.contentInner, styles.contentInnerMobile]}>
                  <SupplementContent supplement={activeNav.supplement} styles={styles} />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ENC.keyTone,
  },
  rootContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: ENC.backBtnBg,
    borderWidth: 1,
    borderColor: ENC.backBtnBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: Typo({ color: ENC.backBtnIcon, fontSize: 18, fontWeight: '600' }, 'display', lang),
  intro: {
    marginBottom: 14,
  },
  eyebrow: Typo({
    color: ENC.mutedRed,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  }, 'mono', lang),
  title: Typo({ color: ENC.offWhite, fontSize: 24, fontWeight: '700', lineHeight: 30 }, 'display', lang),
  summary: Typo({ color: ENC.textBody, fontSize: 13, lineHeight: 20, marginTop: 6 }, 'sans', lang),
  introBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  introLabel: Typo({
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  }, 'display', lang),
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: ENC.badgeBg,
    borderWidth: 1,
    borderColor: ENC.badgeBorder,
  },
  roleBadgeStar: Typo({ color: ENC.badgeTan, fontSize: 10, lineHeight: 14 }, 'mono', lang),
  roleBadgeText: Typo({ color: ENC.badgeTan, fontSize: 11, fontWeight: '700' }, 'mono', lang),
  coverFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  centered: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  errorText: Typo({ color: COLORS.soviet.embroidery, fontSize: 14, textAlign: 'center' }, 'sans', lang),
  emptyText: Typo({ color: COLORS.text.muted, fontSize: 14 }, 'sans', lang),
  supplementsSection: {
    marginTop: 8,
    gap: 14,
  },
  supplementsHeading: Typo({
    color: ENC.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  }, 'mono', lang),
  bodyRow: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ENC.border,
    backgroundColor: ENC.panelBg,
    overflow: 'hidden',
  },
  bodyRowMobile: {
    flexDirection: 'column',
  },
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: ENC.border,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  sidebarMobile: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: ENC.border,
  },
  sidebarContent: {
    paddingVertical: 10,
    paddingHorizontal: 8,
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
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: ENC.navDivider,
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
    backgroundColor: ENC.navHighlight,
    borderWidth: 1,
    borderColor: ENC.badgeBorder,
    borderBottomColor: ENC.badgeBorder,
  },
  navItemActiveMobile: {
    borderBottomWidth: 0,
  },
  navIndicator: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 1,
    backgroundColor: 'transparent',
    marginTop: 3,
  },
  navIndicatorActive: {
    backgroundColor: ENC.redBright,
  },
  navIndicatorMobile: {
    height: 3,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  navLabel: Typo({ color: ENC.textMuted, fontSize: 14, lineHeight: 21, flex: 1 }, 'sans', lang),
  navLabelActive: Typo({
    color: ENC.offWhite,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  }, 'display', lang),
  navLabelMobile: {
    flex: 0,
  },
  contentPane: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  contentPaneMobile: {
    flex: 0,
    width: '100%',
  },
  contentWatermark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 112,
    height: 112,
    opacity: 0.07,
    zIndex: 0,
  },
  contentInner: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
  },
  contentInnerMobile: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
    zIndex: 1,
  },
  contentScroll: {
    flex: 1,
    zIndex: 1,
  },
  contentImage: {
    borderRadius: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: ENC.border,
  },
  contentTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  contentTitleStar: Typo({
    color: ENC.red900,
    fontSize: 32,
    lineHeight: 36,
    marginTop: -2,
  }, 'display', lang),
  contentTitle: Typo({
    color: ENC.offWhite,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    flex: 1,
  }, 'display', lang),
  contentSummary: Typo({
    color: ENC.mutedRed,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  }, 'sans', lang),
  body: Typo({ color: ENC.textBody, fontSize: 16, lineHeight: 28 }, 'sans', lang),
  bodyParagraph: {
    marginTop: 18,
  },
});
};
