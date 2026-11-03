import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { themedScrollViewProps } from '../../../theme/webScrollbar';
import { APP_SITE_URL, resolveStaticUrl } from '../../../constants/config';
import {
  followExploreSimulator,
  getExploreSimulator,
  likeExploreSimulator,
  recordSimulatorView,
  unfollowExploreSimulator,
  unlikeExploreSimulator,
} from '../../../api/simulator';
import type { ExploreSimulatorDetailResp } from '../../../types/simulator';
import { useAuthStore } from '../../../stores/authStore';
import { requireLoginForAction } from '../../../utils/requireLogin';
import { copyOrShareText } from '../../../utils/copyOrShare';
import { formatApiError } from '../../../utils/apiError';
import { notifyError, notifySuccess } from '../../../utils/notify';
import { TOKENS } from '../theme/tokens';
import { AgentCommentsPanel } from '../agent-media/AgentCommentsPanel';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export type DefaultSimulatorDetailModalProps = {
  visible: boolean;
  simulatorId: string | null;
  onClose: () => void;
  onStartPlay: (simulatorId: string) => void;
};

function DetailSection({
  title,
  children,
  showDivider = true,
}: {
  title: string;
  children: React.ReactNode;
  showDivider?: boolean;
}) {
  return (
    <View style={[styles.section, showDivider && styles.sectionDivider]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function DefaultSimulatorDetailModal({
  visible,
  simulatorId,
  onClose,
  onStartPlay,
}: DefaultSimulatorDetailModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { width: windowWidth } = useWindowDimensions();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const [detail, setDetail] = useState<ExploreSimulatorDetailResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const cardWidth = Math.min(Math.round(windowWidth * 0.94), 720);
  const isWideLayout = cardWidth >= 640;

  const requireLogin = useCallback(
    () => requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing')),
    [isLoggedIn, router, t],
  );

  useEffect(() => {
    if (!visible || !simulatorId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const resp = await getExploreSimulator(simulatorId);
        if (!cancelled) setDetail(resp);
        try {
          await recordSimulatorView(simulatorId);
        } catch {
          // non-fatal
        }
      } catch (err) {
        console.error('Failed to load simulator detail:', err);
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [visible, simulatorId]);

  const sim = detail?.simulator;
  const stats = detail?.stats;
  const displayTitle = sim?.title ?? '';
  const tagline = sim?.tagline?.trim() ?? '';
  const coverUrl = sim?.cover_image;
  const likedByMe = Boolean(stats?.liked_by_me);
  const followedByMe = Boolean(stats?.followed_by_me);
  const likeCount = stats?.like_count ?? 0;
  const followerCount = stats?.follower_count ?? 0;
  const intro = detail?.intro?.trim() ?? '';
  const goalBrief = detail?.goal_brief?.trim() ?? '';
  const cast = detail?.cast ?? [];

  const handleShare = async () => {
    if (!simulatorId) return;
    const path = `/simulator/${simulatorId}`;
    const url = APP_SITE_URL ? `${APP_SITE_URL}${path}` : path;
    const message = [displayTitle.trim() || 'Simulator', url].filter(Boolean).join('\n\n');
    try {
      const result = await copyOrShareText(message, t('agentMedia.shareAgent'));
      if (result === 'copied') {
        notifySuccess(t('agentMedia.shareCopied'));
      }
    } catch (e) {
      notifyError(t('agentMedia.shareFailed'), e instanceof Error ? e.message : undefined);
    }
  };

  const handleToggleLike = async () => {
    if (!simulatorId || likeBusy) return;
    if (!requireLogin()) return;
    setLikeBusy(true);
    try {
      const resp = likedByMe
        ? await unlikeExploreSimulator(simulatorId)
        : await likeExploreSimulator(simulatorId);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                liked_by_me: resp.liked,
                like_count: resp.like_count,
              },
            }
          : prev,
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setLikeBusy(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!simulatorId || followBusy) return;
    if (!requireLogin()) return;
    setFollowBusy(true);
    try {
      const resp = followedByMe
        ? await unfollowExploreSimulator(simulatorId)
        : await followExploreSimulator(simulatorId);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                followed_by_me: resp.followed,
                follower_count: resp.follower_count,
              },
            }
          : prev,
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setFollowBusy(false);
    }
  };

  if (!simulatorId) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.card, { width: cardWidth, maxWidth: cardWidth }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={TOKENS.colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{t('simulator.detailTitle')}</Text>
            <Pressable
              onPress={() => void handleShare()}
              style={styles.headerBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('agentMedia.shareAgent')}
            >
              <Ionicons name="share-outline" size={18} color={TOKENS.colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebProps.style]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={isWideLayout ? styles.wideBody : undefined}>
              <View style={isWideLayout ? styles.wideLeft : undefined}>
                <View style={styles.heroCard}>
                  <View
                    style={[styles.heroImageWrap, isWideLayout && styles.heroImageWrapWide]}
                  >
                    {coverUrl ? (
                      <Image
                        source={{ uri: resolveStaticUrl(coverUrl) }}
                        style={styles.heroImage}
                        contentFit="cover"
                        contentPosition="top"
                      />
                    ) : (
                      <View style={[styles.heroImage, styles.heroImageFallback]}>
                        <Text style={styles.heroImageFallbackText}>
                          {(displayTitle || 'S').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.heroFooter}>
                    <Text style={styles.heroName} numberOfLines={2}>
                      {displayTitle.toUpperCase()}
                    </Text>
                    {tagline ? (
                      <Text style={styles.heroSubtitle} numberOfLines={3}>
                        {tagline}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <Pressable
                    style={({ pressed }) => [styles.statChip, pressed && styles.statChipPressed]}
                    onPress={() => void handleToggleFollow()}
                    disabled={followBusy}
                    accessibilityRole="button"
                    accessibilityLabel={
                      followedByMe ? t('agentMedia.following') : t('agentMedia.follow')
                    }
                  >
                    <Ionicons
                      name={followedByMe ? 'people' : 'people-outline'}
                      size={16}
                      color={followedByMe ? TOKENS.colors.accent : TOKENS.colors.textSecondary}
                    />
                    <Text style={styles.statValue}>{formatCount(followerCount)}</Text>
                    <Text style={styles.statLabel}>{t('agentMedia.followers')}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.statChip, pressed && styles.statChipPressed]}
                    onPress={() => void handleToggleLike()}
                    disabled={likeBusy}
                    accessibilityRole="button"
                    accessibilityLabel={t('agentMedia.likes')}
                  >
                    <Ionicons
                      name={likedByMe ? 'heart' : 'heart-outline'}
                      size={16}
                      color={likedByMe ? TOKENS.colors.accent : TOKENS.colors.textSecondary}
                    />
                    <Text style={styles.statValue}>{formatCount(likeCount)}</Text>
                    <Text style={styles.statLabel}>{t('agentMedia.likes')}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.statChip, pressed && styles.statChipPressed]}
                    onPress={() => void handleShare()}
                    accessibilityRole="button"
                    accessibilityLabel={t('agentMedia.shareAgent')}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={16}
                      color={TOKENS.colors.textSecondary}
                    />
                    <Text style={styles.statLabel}>{t('agentMedia.shareAgent')}</Text>
                  </Pressable>
                </View>
              </View>

              <View style={isWideLayout ? styles.wideRight : undefined}>
                <View style={styles.detailsPanel}>
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={TOKENS.colors.accent}
                      style={styles.loader}
                    />
                  ) : null}

                  {intro ? (
                    <DetailSection title={t('simulator.intro')}>
                      <Text style={styles.sectionBody}>{intro}</Text>
                    </DetailSection>
                  ) : null}

                  {goalBrief ? (
                    <DetailSection title={t('simulator.goal')}>
                      <Text style={styles.sectionBody}>{goalBrief}</Text>
                    </DetailSection>
                  ) : null}

                  {cast.length > 0 ? (
                    <DetailSection title={t('simulator.cast')} showDivider={false}>
                      <View style={styles.castList}>
                        {cast.map((c) => (
                          <View key={c.cast_id} style={styles.castRow}>
                            {c.figure_image ? (
                              <Image
                                source={{ uri: resolveStaticUrl(c.figure_image) }}
                                style={styles.castAvatar}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={[styles.castAvatar, styles.castAvatarFallback]}>
                                <Text style={styles.castAvatarText}>
                                  {(c.name || '?').charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.castTextCol}>
                              <Text style={styles.castName} numberOfLines={1}>
                                {c.name}
                              </Text>
                              {c.world_identity ? (
                                <Text style={styles.castMeta} numberOfLines={1}>
                                  {c.world_identity}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    </DetailSection>
                  ) : null}
                </View>

                <View style={styles.commentsSection}>
                  <AgentCommentsPanel
                    simulatorId={simulatorId}
                    variant="detail"
                    requireLogin={requireLogin}
                    onCommentCountChange={(delta) => {
                      setDetail((prev) =>
                        prev
                          ? {
                              ...prev,
                              stats: {
                                ...prev.stats,
                                comment_count: Math.max(
                                  0,
                                  (prev.stats?.comment_count ?? 0) + delta,
                                ),
                              },
                            }
                          : prev,
                      );
                    }}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                pressed && styles.sendButtonPressed,
              ]}
              onPress={() => onStartPlay(simulatorId)}
              accessibilityRole="button"
              accessibilityLabel={t('simulator.startPlay')}
            >
              <Ionicons name="play-outline" size={18} color="#fff" />
              <Text style={styles.sendButtonText}>{t('simulator.startPlay')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 5, 8, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    maxHeight: '94%',
    backgroundColor: TOKENS.colors.cardSolid,
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        } as object)
      : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.cardBorderFaint,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      textAlign: 'center',
      flex: 1,
    },
    'mono',
  ),
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  wideBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 4,
  },
  wideLeft: {
    width: '38%',
    maxWidth: 300,
    flexShrink: 0,
  },
  wideRight: {
    flex: 1,
    minWidth: 0,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  statChip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  statChipPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  statValue: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    'mono',
  ),
  statLabel: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  commentsSection: {
    marginHorizontal: 14,
    marginTop: 16,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.cardBorderFaint,
  },
  heroCard: {
    backgroundColor: '#141820',
    overflow: 'hidden',
    paddingTop: 12,
  },
  heroImageWrap: {
    width: '58%',
    maxWidth: 220,
    aspectRatio: 9 / 16,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0d1018',
  },
  heroImageWrapWide: {
    width: '100%',
    maxWidth: 280,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageFallbackText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 48,
      fontWeight: '600',
    },
    'serif',
  ),
  heroFooter: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 14,
  },
  heroName: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 24,
      fontWeight: '600',
      letterSpacing: 1.2,
      lineHeight: 30,
    },
    'serif',
  ),
  heroSubtitle: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
    },
    'sans',
  ),
  detailsPanel: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: TOKENS.colors.card,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as object)
      : {}),
  },
  section: {
    paddingVertical: 14,
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.cardBorderFaint,
  },
  sectionTitle: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    'mono',
  ),
  sectionBody: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 21,
    },
    'sans',
  ),
  castList: {
    gap: 10,
  },
  castRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  castAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0d1018',
  },
  castAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  castAvatarText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  castTextCol: {
    flex: 1,
    minWidth: 0,
  },
  castName: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
  castMeta: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    'sans',
  ),
  loader: {
    marginVertical: 16,
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 14,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.cardBorderFaint,
    gap: 10,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: TOKENS.radius.pill,
    backgroundColor: TOKENS.colors.accent,
  },
  sendButtonPressed: {
    opacity: 0.88,
  },
  sendButtonText: Typo(
    {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
    'sans',
  ),
});
