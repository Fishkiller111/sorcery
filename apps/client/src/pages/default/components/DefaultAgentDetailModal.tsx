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
  followExploreRole,
  getExploreRoleDetail,
  getRole,
  likeExploreRole,
  recordRoleView,
  unfollowExploreRole,
  unlikeExploreRole,
} from '../../../api/roles';
import { getCreatorProfile } from '../../../api/creators';
import type {
  CreatorProfileResp,
  ExploreRoleDetailResp,
  ExploreRoleItem,
  RoleDetailResp,
  RoleItem,
} from '../../../types/api';
import { useAuthStore } from '../../../stores/authStore';
import { requireLoginForAction } from '../../../utils/requireLogin';
import { copyOrShareText } from '../../../utils/copyOrShare';
import { formatApiError } from '../../../utils/apiError';
import { notifyError, notifySuccess } from '../../../utils/notify';
import { TOKENS } from '../theme/tokens';
import { VerifiedRealPersonBadge } from '../../../components/agent/VerifiedRealPersonBadge';
import { isVerifiedRealPerson } from '../../../utils/verifiedRealPerson';
import { AgentGiftButton } from '../agent-media/AgentGiftButton';
import { AgentGiftSheet } from '../agent-media/AgentGiftSheet';
import { AgentCommentsPanel } from '../agent-media/AgentCommentsPanel';
import { RoleSafetyActionLinks } from '../../../components/agent/RoleSafetyActionLinks';

function formatCreatorHandle(nickname?: string | null): string | null {
  const raw = nickname?.trim();
  if (!raw) return null;
  return raw.startsWith('@') ? raw : `@${raw}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export type AgentDetailListItem = RoleItem | ExploreRoleItem;

export type DefaultAgentDetailModalProps = {
  visible: boolean;
  role: AgentDetailListItem | null;
  mode: 'explore' | 'library';
  onClose: () => void;
  onStartChat: (roleId: string) => void;
  onViewMedia?: (roleId: string) => void;
  onManage?: (roleId: string) => void;
  onSocialManage?: (roleId: string) => void;
};

function parseAttributes(attrJson?: string): Record<string, unknown> | null {
  if (!attrJson) return null;
  try {
    return JSON.parse(attrJson);
  } catch {
    return null;
  }
}

function formatAttributeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'string' ? v : String(v))).join(' / ');
  }
  return null;
}

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

function PillTag({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function DefaultAgentDetailModal({
  visible,
  role,
  mode,
  onClose,
  onStartChat,
  onViewMedia,
  onManage,
  onSocialManage,
}: DefaultAgentDetailModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const { width: windowWidth } = useWindowDimensions();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const [libraryDetail, setLibraryDetail] = useState<RoleDetailResp | null>(null);
  const [exploreDetail, setExploreDetail] = useState<ExploreRoleDetailResp | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const cardWidth = Math.min(Math.round(windowWidth * 0.94), 720);
  const isWideLayout = cardWidth >= 640;
  const showSocial = mode === 'explore';

  const requireLogin = useCallback(
    () => requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing')),
    [isLoggedIn, router, t],
  );

  useEffect(() => {
    if (!visible || !role) {
      setLibraryDetail(null);
      setExploreDetail(null);
      setCreatorProfile(null);
      setGiftOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setCreatorProfile(null);

    const load = async () => {
      try {
        if (mode === 'explore') {
          const resp = await getExploreRoleDetail(role.id);
          if (!cancelled) setExploreDetail(resp);
          try {
            await recordRoleView(role.id, 'detail');
          } catch {
            // non-fatal
          }
          const creatorId = resp.creator_user_id?.trim();
          if (creatorId) {
            try {
              const profile = await getCreatorProfile(creatorId);
              if (!cancelled) setCreatorProfile(profile);
            } catch {
              // non-fatal
            }
          }
        } else {
          const resp = await getRole(role.id);
          if (!cancelled) setLibraryDetail(resp);
        }
      } catch (err) {
        console.error('Failed to load agent detail:', err);
        if (!cancelled) {
          setLibraryDetail(null);
          setExploreDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [visible, role?.id, mode]);

  const attributes = useMemo(() => {
    const raw =
      mode === 'explore'
        ? exploreDetail?.attributes ?? role?.attributes
        : libraryDetail?.attributes ?? role?.attributes;
    return parseAttributes(raw);
  }, [exploreDetail?.attributes, libraryDetail?.attributes, mode, role?.attributes]);

  const background = formatAttributeValue(attributes?.background);
  const coverIdentity = formatAttributeValue(attributes?.cover_identity);

  const displayName =
    (mode === 'explore' ? exploreDetail?.name : libraryDetail?.name) ?? role?.name ?? '';
  const sceneName =
    (mode === 'explore' ? exploreDetail?.scene_name : libraryDetail?.scene_name) ??
    (role && 'scene_name' in role ? role.scene_name : '') ??
    '';
  const sceneDesc = mode === 'explore' ? exploreDetail?.scene_desc ?? '' : libraryDetail?.scene_desc ?? '';
  const figureUrl =
    (mode === 'explore' ? exploreDetail?.figure_url : libraryDetail?.figure_url) ??
    role?.figure_url;
  const avatarUrl =
    (mode === 'explore' ? exploreDetail?.avatar_url : libraryDetail?.avatar_url) ??
    role?.avatar_url;
  const portraitUrl = figureUrl || avatarUrl;

  const worldviewName =
    mode === 'library'
      ? libraryDetail?.worldview_name ?? (role as RoleItem | null)?.worldview_name ?? ''
      : '';
  const worldviewSummary =
    mode === 'library'
      ? libraryDetail?.worldview_summary ?? (role as RoleItem | null)?.worldview_summary ?? ''
      : '';

  const introduction =
    mode === 'explore'
      ? exploreDetail?.introduction ?? (role as ExploreRoleItem | null)?.introduction
      : (role as RoleItem | null)?.introduction;

  const characterBio =
    introduction?.trim() || background || worldviewSummary || sceneDesc || null;

  const operationTags = useMemo(() => {
    const tags: string[] = [];
    const categories = role?.categories ?? [];
    for (const cat of categories) {
      if (cat.name && !tags.includes(cat.name)) tags.push(cat.name);
    }
    if (sceneName && !tags.includes(sceneName)) tags.push(sceneName);
    return tags;
  }, [role?.categories, sceneName]);

  const subtitleParts = [coverIdentity || sceneName, worldviewName].filter(Boolean);
  const subtitle = subtitleParts.join(' / ');

  const isOwner = mode === 'library' && Boolean((role as RoleItem | null)?.is_owner);
  const isOwnExploreAgent = Boolean(
    mode === 'explore' &&
      user?.id &&
      exploreDetail?.creator_user_id &&
      exploreDetail.creator_user_id === user.id,
  );
  const showSafetyActions = Boolean(showSocial && role && !isOwner && !isOwnExploreAgent);

  const stats = exploreDetail?.stats;
  const likedByMe = Boolean(stats?.liked_by_me);
  const followedByMe = Boolean(stats?.followed_by_me);
  const likeCount = stats?.like_count ?? (role as ExploreRoleItem | null)?.like_count ?? 0;
  const followerCount =
    stats?.follower_count ?? 0;
  const creatorNickname =
    exploreDetail?.creator_nickname ?? creatorProfile?.nickname ?? '';
  const creatorHandle = formatCreatorHandle(creatorNickname);
  const creatorAvatar = creatorProfile?.avatar_url
    ? resolveStaticUrl(creatorProfile.avatar_url)
    : null;

  const handleShare = async () => {
    if (!role) return;
    const path = `/agent/${role.id}/media`;
    const url = APP_SITE_URL ? `${APP_SITE_URL}${path}` : path;
    const message = [displayName.trim() || 'Agent', url].filter(Boolean).join('\n\n');
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
    if (!role || likeBusy || !showSocial) return;
    if (!requireLogin()) return;
    setLikeBusy(true);
    try {
      const resp = likedByMe
        ? await unlikeExploreRole(role.id)
        : await likeExploreRole(role.id);
      setExploreDetail((prev) =>
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
    if (!role || followBusy || !showSocial) return;
    if (!requireLogin()) return;
    setFollowBusy(true);
    try {
      const resp = followedByMe
        ? await unfollowExploreRole(role.id)
        : await followExploreRole(role.id);
      setExploreDetail((prev) =>
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

  const handleAuthorPress = async () => {
    if (!creatorHandle) return;
    try {
      const result = await copyOrShareText(creatorHandle, t('agentMedia.creator'));
      if (result === 'copied' || result === 'shared') {
        notifySuccess(t('agentMedia.shareCopied'));
      }
    } catch (e) {
      notifyError(t('agentMedia.shareFailed'), e instanceof Error ? e.message : undefined);
    }
  };

  const handleGift = () => {
    if (!requireLogin()) return;
    setGiftOpen(true);
  };

  const handleGiftSent = (pointsSpent: number) => {
    setExploreDetail((prev) => {
      if (!prev?.stats) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          gift_points_total: (prev.stats.gift_points_total ?? 0) + pointsSpent,
        },
      };
    });
  };

  if (!role) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.card, { width: cardWidth, maxWidth: cardWidth }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={TOKENS.colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{t('agent.detailTitle')}</Text>
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
                    {portraitUrl ? (
                      <Image
                        source={{ uri: resolveStaticUrl(portraitUrl) }}
                        style={styles.heroImage}
                        contentFit="cover"
                        contentPosition="top"
                      />
                    ) : (
                      <View style={[styles.heroImage, styles.heroImageFallback]}>
                        <Text style={styles.heroImageFallbackText}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {isVerifiedRealPerson(role) || isVerifiedRealPerson(exploreDetail) ? (
                      <VerifiedRealPersonBadge
                        size={22}
                        inset={8}
                        label={t('agent.verifiedRealPersonLabel')}
                        accessibilityLabel={t('agent.verifiedRealPersonLabel')}
                      />
                    ) : null}
                  </View>
                  <View style={styles.heroFooter}>
                    <Text style={styles.heroName} numberOfLines={2}>
                      {displayName.toUpperCase()}
                    </Text>
                    {subtitle ? (
                      <Text style={styles.heroSubtitle} numberOfLines={2}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {showSocial ? (
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
                ) : null}

                {showSafetyActions ? (
                  <View style={styles.safetyRow}>
                    <RoleSafetyActionLinks
                      roleId={role!.id}
                      creatorUserId={exploreDetail?.creator_user_id}
                      onBlocked={onClose}
                    />
                  </View>
                ) : null}

                {showSocial && creatorHandle ? (
                  <Pressable
                    style={({ pressed }) => [styles.authorRow, pressed && styles.authorRowPressed]}
                    onPress={() => void handleAuthorPress()}
                    accessibilityRole="button"
                  >
                    {creatorAvatar ? (
                      <Image
                        source={{ uri: creatorAvatar }}
                        style={styles.authorAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
                        <Text style={styles.authorAvatarText}>
                          {creatorHandle.replace(/^@/, '').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.authorTextCol}>
                      <Text style={styles.authorLabel}>{t('agentMedia.creator')}</Text>
                      <Text style={styles.authorHandle} numberOfLines={1}>
                        {creatorHandle}
                      </Text>
                      {creatorProfile ? (
                        <Text style={styles.authorMeta} numberOfLines={1}>
                          {formatCount(creatorProfile.follower_count)} {t('agentMedia.followers')}
                          {' · '}
                          {formatCount(creatorProfile.like_count)} {t('agentMedia.likes')}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="copy-outline" size={16} color={TOKENS.colors.textMuted} />
                  </Pressable>
                ) : null}
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

                  {characterBio ? (
                    <DetailSection title={t('agent.characterBio')}>
                      <Text style={styles.sectionBody}>{characterBio}</Text>
                    </DetailSection>
                  ) : null}

                  {worldviewName ? (
                    <DetailSection title={t('agent.affiliatedFaction')}>
                      <View style={styles.pillRow}>
                        <PillTag label={worldviewName} />
                      </View>
                    </DetailSection>
                  ) : null}

                  {operationTags.length > 0 ? (
                    <DetailSection title={t('agent.relatedOperations')} showDivider={false}>
                      <View style={styles.pillRow}>
                        {operationTags.map((tag) => (
                          <PillTag key={tag} label={tag} />
                        ))}
                      </View>
                    </DetailSection>
                  ) : null}
                </View>

                {showSocial ? (
                  <View style={styles.giftSection}>
                    <Text style={styles.giftSectionTitle}>{t('agentMedia.giftSupport')}</Text>
                    <AgentGiftButton onPress={handleGift} compact />
                    {typeof stats?.gift_points_total === 'number' && stats.gift_points_total > 0 ? (
                      <Text style={styles.giftTotal}>
                        {formatCount(stats.gift_points_total)} Soul
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {showSocial ? (
                  <View style={styles.commentsSection}>
                    <AgentCommentsPanel
                      roleId={role.id}
                      variant="detail"
                      requireLogin={requireLogin}
                      onCommentCountChange={(delta) => {
                        setExploreDetail((prev) =>
                          prev?.stats
                            ? {
                                ...prev,
                                stats: {
                                  ...prev.stats,
                                  comment_count: Math.max(
                                    0,
                                    (prev.stats.comment_count ?? 0) + delta,
                                  ),
                                },
                              }
                            : prev,
                        );
                      }}
                    />
                  </View>
                ) : null}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerActionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  onViewMedia ? styles.footerBtnHalf : styles.footerBtnFull,
                  pressed && styles.sendButtonPressed,
                ]}
                onPress={() => onStartChat(role.id)}
              >
                <Ionicons name="mail-outline" size={18} color="#fff" />
                <Text style={styles.sendButtonText}>{t('agent.sendMessage')}</Text>
              </Pressable>

              {onViewMedia ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.mediaButton,
                    styles.footerBtnHalf,
                    pressed && styles.mediaButtonPressed,
                  ]}
                  onPress={() => onViewMedia(role.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('agentMedia.viewMedia')}
                >
                  <Ionicons name="images-outline" size={18} color={TOKENS.colors.text} />
                  <Text style={styles.mediaButtonText}>{t('agentMedia.viewMedia')}</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.createImageButton,
                pressed && styles.createImageButtonPressed,
              ]}
              onPress={() => {
                if (!requireLogin()) return;
                const referenceUrl = resolveStaticUrl(portraitUrl);
                onClose();
                router.push({
                  pathname: '/creation-center/image',
                  params: {
                    ...(referenceUrl ? { referenceUrl } : {}),
                    ...(displayName.trim() ? { roleName: displayName.trim() } : {}),
                  },
                } as never);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('agent.createImageForHer')}
            >
              <Ionicons name="color-wand-outline" size={18} color={TOKENS.colors.text} />
              <Text style={styles.createImageButtonText}>{t('agent.createImageForHer')}</Text>
            </Pressable>

            {isOwner && (onManage || onSocialManage) ? (
              <View style={styles.manageLinks}>
                {onManage ? (
                  <Pressable
                    style={({ pressed }) => [styles.manageButton, pressed && styles.manageButtonPressed]}
                    onPress={() => onManage(role.id)}
                  >
                    <Ionicons name="settings-outline" size={15} color="#E8D5C4" />
                    <Text style={styles.manageButtonText}>{t('agent.basicManage')}</Text>
                  </Pressable>
                ) : null}
                {onSocialManage ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.manageButton,
                      styles.socialManageButton,
                      pressed && styles.socialManageButtonPressed,
                    ]}
                    onPress={() => onSocialManage(role.id)}
                  >
                    <Ionicons name="chatbubbles-outline" size={15} color="#F2B8BE" />
                    <Text style={styles.socialManageButtonText}>{t('agent.socialManage')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {showSocial && role ? (
        <AgentGiftSheet
          visible={giftOpen}
          roleId={role.id}
          agentName={displayName.trim()}
          onClose={() => setGiftOpen(false)}
          onSent={handleGiftSent}
        />
      ) : null}
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
  safetyRow: {
    paddingHorizontal: 14,
    paddingTop: 4,
    alignItems: 'flex-start',
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
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  authorRowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d1018',
  },
  authorAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 16,
      fontWeight: '600',
    },
    'sans',
  ),
  authorTextCol: {
    flex: 1,
    minWidth: 0,
  },
  authorLabel: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    'mono',
  ),
  authorHandle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  authorMeta: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    'sans',
  ),
  giftSection: {
    marginHorizontal: 14,
    marginTop: 14,
    gap: 10,
  },
  giftSectionTitle: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  giftTotal: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
    },
    'sans',
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    maxWidth: '100%',
  },
  pillText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    'sans',
  ),
  loader: {
    marginVertical: 16,
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.cardBorderFaint,
    gap: 8,
  },
  footerActionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  footerBtnHalf: {
    flex: 1,
    minWidth: 0,
  },
  footerBtnFull: {
    flex: 1,
    width: '100%',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TOKENS.colors.accent,
    borderRadius: TOKENS.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 10,
    minHeight: 50,
  },
  sendButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  sendButtonText: Typo(
    {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: TOKENS.radius.button,
    paddingVertical: 13,
    paddingHorizontal: 10,
    minHeight: 50,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  mediaButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ scale: 0.99 }],
  },
  mediaButtonText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  createImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    borderRadius: TOKENS.radius.button,
    paddingVertical: 13,
    minHeight: 48,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(232, 75, 106, 0.12)',
  },
  createImageButtonPressed: {
    backgroundColor: 'rgba(232, 75, 106, 0.2)',
    transform: [{ scale: 0.99 }],
  },
  createImageButtonText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  manageLinks: {
    width: '100%',
    gap: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 196, 0.35)',
    backgroundColor: 'rgba(232, 213, 196, 0.08)',
  },
  manageButtonPressed: {
    backgroundColor: 'rgba(232, 213, 196, 0.16)',
    transform: [{ scale: 0.98 }],
  },
  manageButtonText: Typo(
    {
      color: '#E8D5C4',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  socialManageButton: {
    borderColor: 'rgba(186, 60, 71, 0.55)',
    backgroundColor: 'rgba(186, 60, 71, 0.14)',
  },
  socialManageButtonPressed: {
    backgroundColor: 'rgba(186, 60, 71, 0.24)',
    transform: [{ scale: 0.98 }],
  },
  socialManageButtonText: Typo(
    {
      color: '#F2B8BE',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'mono',
  ),
});
