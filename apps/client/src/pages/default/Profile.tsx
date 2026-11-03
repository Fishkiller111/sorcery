import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  Modal,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { useAuthStore } from '../../stores/authStore';
import { getMe, getUserProfile } from '../../api/auth';
import { updateUser } from '../../api/user';
import { getChatQuota, getVoiceQuota } from '../../api/chat';
import { getVipMe } from '../../api/vip';
import { getReferralMe } from '../../api/referral';
import { getAffiliateMe } from '../../api/affiliate';
import { listAllRoles, listExploreRoles } from '../../api/roles';
import { listOwnedWorlds } from '../../api/worldEditor';
import type { WorldEditorItem } from '../../types/worldDocument';
import { getCreatorProfile, listMeFollowingCreators } from '../../api/creators';
import { useAnnouncementUnreadStore } from '../../stores/announcementUnreadStore';
import { useInboxUnreadStore } from '../../stores/inboxUnreadStore';
import { Message } from '../../components/ui/Message';
import { AvatarCropModal } from '../../components/profile/AvatarCropModal';
import { ProfileSupportFab } from '../../components/profile/ProfileSupportFab';
import { useAvatarCropUpload } from '../../hooks/useAvatarCropUpload';
import type { CroppedAreaPixels } from '../../utils/cropAvatarImage';
import { notifyError } from '../../utils/notify';
import { formatApiError } from '../../utils/apiError';
import { copyOrShareText } from '../../utils/copyOrShare';
import { resolveStaticUrl } from '../../constants/config';
import { requireLoginForAction } from '../../utils/requireLogin';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import {
  useMobileBottomNavPadding,
  useMobilePageContentPaddingStyle,
} from '../../hooks/useMobileSafeAreaPadding';
import { MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT } from '../../constants/layout';
import { useWebHorizontalDragScroll } from '../../hooks/useWebHorizontalDragScroll';
import { ROLE_CATEGORY_HISTORY_ID } from '../../utils/roleCategory';
import { Typo } from '../../theme/typography';
import type {
  UserInfo,
  UserProfileData,
  VipMeResp,
  ChatQuotaResp,
  VoiceQuotaResp,
  RoleItem,
  ExploreRoleItem,
  CreatorProfileResp,
  AffiliateMeResp,
} from '../../types/api';
import { DefaultShell } from './components/DefaultShell';
import { DefaultDailyTasksModal } from './components/DefaultDailyTasksModal';
import { ThemedAgentDetailModal } from '../../components/ui/ThemedAgentDetailModal';
import type { AgentDetailListItem } from './components/DefaultAgentDetailModal';
import { PROFILE_IMAGES } from './theme/images';
import { TOKENS } from './theme/tokens';
import { FigureMediaView } from '../../components/create-agent/FigureMediaView';
import { hiddenScrollViewProps, themedScrollViewProps } from '../../theme/webScrollbar';

type LibraryTab = 'history' | 'agents' | 'worlds';

const NICKNAME_MAX = 32;
const MOBILE_H_PAD = 16;
const DESKTOP_H_PAD = 32;
const DESKTOP_CONTENT_MAX = 880;
/** Figma artboard width for scale reference */
const FIGMA_W = 798;

function formatCount(n?: number): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

function scale(figmaPx: number, contentW: number): number {
  return Math.max(1, Math.round((figmaPx / FIGMA_W) * contentW));
}

export function DefaultProfileScreen() {
  const router = useRouter();
  const { t, tp, lang } = useI18n();
  const isDesktop = useIsDesktop();
  const { width: windowWidth } = useWindowDimensions();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const scrollBottomClearance = useMobileBottomNavPadding(MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const contentWidth = useMemo(() => {
    const pad = isDesktop ? DESKTOP_H_PAD * 2 : MOBILE_H_PAD * 2;
    const available = Math.max(280, windowWidth - pad - (isDesktop ? TOKENS.layout.sidebarWidth : 0));
    return isDesktop ? Math.min(DESKTOP_CONTENT_MAX, available) : available;
  }, [isDesktop, windowWidth]);

  const layout = useMemo(() => {
    const w = contentWidth;
    const avatar = isDesktop ? Math.min(152, scale(152, w)) : Math.max(72, scale(152, w));
    const agentCardW = isDesktop ? Math.min(180, scale(196, w)) : Math.max(96, scale(196, w));
    const agentCardH = Math.round(agentCardW * (348 / 196));
    return {
      avatar,
      nameSize: isDesktop ? 36 : Math.max(22, scale(42, w)),
      statsSize: isDesktop ? 15 : Math.max(12, scale(18, w)),
      agentMetaSize: isDesktop ? 16 : Math.max(13, scale(20, w)),
      sectionTitleSize: isDesktop ? 32 : Math.max(22, scale(42, w)),
      /** Figma 125px @ 798 → scale alone is ~56 on phone; keep readable min height. */
      actionCardH: isDesktop ? 96 : Math.max(118, Math.round(scale(125, w) * 2)),
      vipCardW: isDesktop ? Math.round(w * 0.28) : Math.max(104, scale(194, w)),
      /** Gap between hamburger row and avatar — Figma ~100px @ 798. */
      identityTopGap: isDesktop ? 20 : Math.max(36, scale(100, w)),
      plusBarH: isDesktop ? 64 : Math.max(44, scale(86, w)),
      starBarH: isDesktop ? 80 : Math.max(56, scale(122, w)),
      agentCardW,
      agentCardH,
      iconMenu: isDesktop ? 28 : Math.max(18, scale(37, w)),
      iconEdit: isDesktop ? 28 : Math.max(22, scale(57, w)),
      iconPlus: isDesktop ? 26 : Math.max(18, scale(31, w)),
      iconStar: isDesktop ? 32 : Math.max(24, scale(58, w)),
      gap: isDesktop ? 14 : 10,
    };
  }, [contentWidth, isDesktop]);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<UserProfileData>({});
  const [vip, setVip] = useState<VipMeResp | null>(null);
  const [chatQuota, setChatQuota] = useState<ChatQuotaResp | null>(null);
  const [voiceQuota, setVoiceQuota] = useState<VoiceQuotaResp | null>(null);
  const [creator, setCreator] = useState<CreatorProfileResp | null>(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [ownedAgents, setOwnedAgents] = useState<RoleItem[]>([]);
  const [historyAgents, setHistoryAgents] = useState<ExploreRoleItem[]>([]);
  const [ownedWorlds, setOwnedWorlds] = useState<WorldEditorItem[]>([]);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('history');
  const [inviteCopying, setInviteCopying] = useState(false);
  const [dailyTasksVisible, setDailyTasksVisible] = useState(false);
  const [affiliateMe, setAffiliateMe] = useState<AffiliateMeResp | null>(null);
  const announcementUnread = useAnnouncementUnreadStore((s) => s.unreadCount);
  const inboxUnread = useInboxUnreadStore((s) => s.inboxUnread);
  const refreshInboxUnread = useInboxUnreadStore((s) => s.refreshInboxUnread);
  const bellUnread = announcementUnread + inboxUnread;
  const refreshAnnouncementUnread = useAnnouncementUnreadStore((s) => s.refresh);
  const clearAnnouncementUnread = useAnnouncementUnreadStore((s) => s.clear);
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AgentDetailListItem | null>(null);
  const libraryHasItems =
    (libraryTab === 'history' && historyAgents.length > 0) ||
    (libraryTab === 'agents' && ownedAgents.length > 0) ||
    (libraryTab === 'worlds' && ownedWorlds.length > 0);
  const { scrollRef: agentsScrollRef, consumeClickIfDragged } = useWebHorizontalDragScroll(
    !loading && libraryHasItems,
  );
  const agentsScrollHideProps = hiddenScrollViewProps();
  const agentsScrollHideStyle = agentsScrollHideProps.style as object | undefined;
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const {
    cropPick,
    avatarUploading,
    handleAvatarPress,
    handleCropCancel,
    handleCropConfirm,
  } = useAvatarCropUpload({ onUserUpdated: setUser });

  const requireLogin = useCallback(
    () => requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing')),
    [isLoggedIn, router, t],
  );

  const openProtectedRoute = useCallback(
    (
      route:
        | '/vip/shop'
        | '/points/shop'
        | '/soul/wallet'
        | '/settings'
        | '/affiliate'
        | '/free-chat'
        | '/create-agent'
        | '/create-world'
        | '/world'
        | '/announcements'
        | `/world/${string}`
        | `/world/${string}/edit`,
    ) => {
      if (!requireLogin()) return;
      router.push(route as never);
    },
    [requireLogin, router],
  );

  const handleAvatarAction = useCallback(() => {
    if (!requireLogin()) return;
    void handleAvatarPress();
  }, [handleAvatarPress, requireLogin]);

  const openNicknameEdit = useCallback(() => {
    if (!requireLogin()) return;
    setNicknameDraft(user?.nickname?.trim() || '');
    setNicknameModalOpen(true);
  }, [requireLogin, user?.nickname]);

  const closeNicknameEdit = useCallback(() => {
    if (nicknameSaving) return;
    setNicknameModalOpen(false);
  }, [nicknameSaving]);

  const saveNickname = useCallback(async () => {
    const next = nicknameDraft.trim();
    if (!next) {
      Message.warning(t('profile.nicknameEmpty'));
      return;
    }
    if (next.length > NICKNAME_MAX) {
      Message.warning(t('profile.nicknameTooLong'));
      return;
    }
    if (next === (user?.nickname?.trim() || '')) {
      setNicknameModalOpen(false);
      return;
    }
    setNicknameSaving(true);
    try {
      const updated = await updateUser({ nickname: next });
      setUser(updated);
      try {
        await refreshUser();
      } catch {
        // Local profile already updated; auth cache refresh is best-effort.
      }
      setNicknameModalOpen(false);
      Message.success(t('profile.nicknameUpdated'));
    } catch (err) {
      notifyError(t('system.error'), formatApiError(t, err));
    } finally {
      setNicknameSaving(false);
    }
  }, [nicknameDraft, refreshUser, t, user?.nickname]);

  const loadProfile = useCallback(async () => {
    if (!isLoggedIn) {
      setUser(null);
      setProfile({});
      setVip(null);
      setChatQuota(null);
      setVoiceQuota(null);
      setCreator(null);
      setFollowingCount(0);
      setOwnedAgents([]);
      setHistoryAgents([]);
      setOwnedWorlds([]);
      setAffiliateMe(null);
      clearAnnouncementUnread();
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [meData, profileResp, vipData, quotaData, voiceData, roles, historyResp, worldsResp, affMe] = await Promise.all([
        getMe(),
        getUserProfile().catch(() => ({ profile_data: '{}' } as Awaited<ReturnType<typeof getUserProfile>>)),
        getVipMe().catch(() => null),
        getChatQuota().catch(() => null),
        getVoiceQuota().catch(() => null),
        listAllRoles().catch(() => [] as RoleItem[]),
        listExploreRoles({ category_id: ROLE_CATEGORY_HISTORY_ID, page_size: 20 }).catch(
          () => ({ roles: [] as ExploreRoleItem[] }),
        ),
        listOwnedWorlds(50).catch(() => ({ worlds: [] as WorldEditorItem[] })),
        getAffiliateMe().catch(() => null),
      ]);
      setUser(meData);
      setVip(vipData);
      setChatQuota(quotaData);
      setVoiceQuota(voiceData);
      setAffiliateMe(affMe);
      try {
        setProfile(JSON.parse(profileResp.profile_data || '{}'));
      } catch {
        setProfile({});
      }
      const owned = roles.filter((r) => r.is_owner === true);
      setOwnedAgents(owned);
      setHistoryAgents(historyResp.roles || []);
      setOwnedWorlds(worldsResp.worlds || []);

      const [creatorData, followingData] = await Promise.all([
        getCreatorProfile(meData.id).catch(() => null),
        listMeFollowingCreators({ page: 1, page_size: 1 }).catch(() => null),
      ]);
      setCreator(creatorData);
      setFollowingCount(followingData?.pagination?.total ?? 0);
    } catch (err) {
      notifyError(t('system.error'), formatApiError(t, err));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, t, clearAnnouncementUnread]);

  useEffect(() => {
    if (!isRestored) return;
    void loadProfile();
  }, [isRestored, loadProfile]);

  useFocusEffect(
    useCallback(() => {
      if (!isRestored || !isLoggedIn) {
        clearAnnouncementUnread();
        useInboxUnreadStore.getState().setInboxUnread(0);
        return;
      }
      void listAllRoles()
        .then((roles) => setOwnedAgents(roles.filter((r) => r.is_owner === true)))
        .catch(() => undefined);
      void listExploreRoles({ category_id: ROLE_CATEGORY_HISTORY_ID, page_size: 20 })
        .then((resp) => setHistoryAgents(resp.roles || []))
        .catch(() => undefined);
      void listOwnedWorlds(50)
        .then((resp) => setOwnedWorlds(resp.worlds || []))
        .catch(() => undefined);
      void refreshAnnouncementUnread(lang);
      void refreshInboxUnread();
    }, [
      isRestored,
      isLoggedIn,
      lang,
      refreshAnnouncementUnread,
      refreshInboxUnread,
      clearAnnouncementUnread,
    ]),
  );

  const handleDailyTasksPress = useCallback(() => {
    if (!requireLogin()) return;
    setDailyTasksVisible(true);
  }, [requireLogin]);

  const isAffiliatePartner = affiliateMe?.is_partner === true;

  const handleInvitePress = useCallback(async () => {
    if (!requireLogin()) return;
    if (inviteCopying) return;
    setInviteCopying(true);
    try {
      // Always re-check partner status so disabled accounts fall back immediately.
      const aff = await getAffiliateMe().catch(() => null);
      if (aff) setAffiliateMe(aff);

      if (aff?.is_partner) {
        const link = aff.share_url?.trim() || '';
        if (!link) {
          Message.error(t('affiliate.loadFailed'));
          return;
        }
        await copyOrShareText(link, t('affiliate.inviteTitle'));
        Message.success(`${t('affiliate.copied')}\n${link}`, { duration: 4500 });
        return;
      }

      const me = await getReferralMe();
      if (me.activity_status !== 'active') {
        Message.warning(t('referral.activityEnded'));
        return;
      }
      const link =
        me.share_url?.trim() ||
        (typeof window !== 'undefined'
          ? `${window.location.origin}/login?invite=${encodeURIComponent(me.invite_code)}`
          : '');
      if (!link) {
        Message.error(t('referral.loadFailed'));
        return;
      }
      await copyOrShareText(link, t('referral.title'));
      Message.success(`${t('referral.copied')}\n${link}`, { duration: 4500 });
    } catch {
      Message.error(t('referral.loadFailed'));
    } finally {
      setInviteCopying(false);
    }
  }, [inviteCopying, requireLogin, t]);

  const displayName = user?.nickname || user?.email || t('profile.placeholderUser');
  const vipPlanLabel = vip?.plan_name || user?.vip?.plan_name || t('vip.profile.free');
  const vipIsActive = vip?.is_active ?? user?.vip?.is_active ?? false;
  const vipExpires = vip?.expires_at || user?.vip?.expires_at;
  const pointsValue = profile?.points ?? 0;
  const chatQuotaLabel = chatQuota?.unlimited
    ? t('profile.chatQuotaUnlimited')
    : String(chatQuota?.remaining_messages_hint ?? t('common.notAvailable'));
  const voiceQuotaLabel =
    voiceQuota?.enabled === false
      ? t('common.notAvailable')
      : voiceQuota?.unlimited
        ? t('profile.voiceQuotaUnlimited')
        : String(voiceQuota?.remaining_hint ?? t('common.notAvailable'));
  // const achievementsCurrent = profile?.achievements?.current ?? 0;
  // const achievementsTotal = profile?.achievements?.total ?? 3;
  const avatarUri = user?.avatar_url ? resolveStaticUrl(user.avatar_url) : null;

  const likesCount = creator?.agents_like_total ?? creator?.like_count ?? 0;
  const fansCount = creator?.follower_count ?? 0;
  const agentCount = creator?.published_agent_count ?? ownedAgents.length;
  const agentCountLabel =
    agentCount === 1
      ? tp('profile.agentCount', { n: agentCount })
      : tp('profile.agentCountPlural', { n: agentCount });

  const vipSubtitle = vipIsActive
    ? vipExpires
      ? `${t('vip.shop.expires')} ${vipExpires.slice(0, 10)}`
      : t('vip.profile.active')
    : t('vip.profile.tapToUpgrade');
  const quotaSubtitle = `${t('profile.chatQuotaShort')} ${chatQuotaLabel} · ${t('profile.voiceQuota')} ${voiceQuotaLabel}`;

  const hPad = isDesktop ? DESKTOP_H_PAD : MOBILE_H_PAD;

  if (loading) {
    return (
      <DefaultShell scrollable={false}>
        <View style={styles.loadingRoot}>
          <ActivityIndicator size="large" color={TOKENS.colors.accent} />
        </View>
        <ProfileSupportFab tone="default" />
      </DefaultShell>
    );
  }

  return (
    <DefaultShell scrollable={false}>
      <DefaultDailyTasksModal
        visible={dailyTasksVisible}
        onClose={() => setDailyTasksVisible(false)}
        onBindEmail={() => {
          setDailyTasksVisible(false);
          router.push('/settings?bindEmail=1');
        }}
      />
      <View style={[styles.page, pageContentPadding, { paddingHorizontal: hPad }]}>
        <ScrollView
          {...scrollWebProps}
          style={[styles.scroll, scrollWebProps.style]}
          contentContainerStyle={[
            styles.scrollContent,
            { width: contentWidth, maxWidth: contentWidth, alignSelf: 'center' },
            // Own ScrollView (shell scrollable=false) — must clear absolute bottom nav.
            !isDesktop && { paddingBottom: scrollBottomClearance },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar: hamburger → settings · bell → announcements */}
          <View style={[styles.topBar, { marginBottom: layout.identityTopGap }]}>
            <Pressable
              onPress={() => openProtectedRoute('/settings')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('profile.openSettings')}
              style={styles.topBarBtn}
            >
              <Image
                source={PROFILE_IMAGES.menu}
                style={{ width: layout.iconMenu, height: Math.round(layout.iconMenu * (31 / 37)) }}
                contentFit="contain"
              />
            </Pressable>
            <View style={styles.topBarSpacer} />
            <Pressable
              onPress={() => openProtectedRoute('/announcements')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('profile.openAnnouncements')}
              style={styles.topBarBtnRight}
            >
              <Ionicons
                name="notifications-outline"
                size={layout.iconMenu + 2}
                color={TOKENS.colors.text}
              />
              {bellUnread > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {bellUnread > 99 ? '99+' : bellUnread}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {/* Identity: avatar + name/stats + edit */}
          <View style={[styles.identityRow, isDesktop && styles.identityRowDesktop]}>
            <Pressable
              onPress={handleAvatarAction}
              disabled={avatarUploading}
              style={[
                styles.avatarBtn,
                {
                  width: layout.avatar,
                  height: layout.avatar,
                  borderRadius: layout.avatar / 2,
                },
              ]}
              accessibilityRole="button"
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: layout.avatar, height: layout.avatar, borderRadius: layout.avatar / 2 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    {
                      width: layout.avatar,
                      height: layout.avatar,
                      borderRadius: layout.avatar / 2,
                    },
                  ]}
                >
                  <Ionicons name="person" size={Math.round(layout.avatar * 0.38)} color={TOKENS.colors.textMuted} />
                </View>
              )}
              {avatarUploading ? (
                <View style={[styles.avatarOverlay, { borderRadius: layout.avatar / 2 }]}>
                  <ActivityIndicator color={TOKENS.colors.text} />
                </View>
              ) : null}
            </Pressable>

            <View style={styles.identityMain}>
              <View style={styles.nameRow}>
                <Text
                  style={[
                    styles.displayName,
                    { fontSize: layout.nameSize, lineHeight: Math.round(layout.nameSize * 1.15) },
                  ]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                {isLoggedIn ? (
                  <Pressable
                    onPress={openNicknameEdit}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.editNickname')}
                    style={styles.editBtn}
                  >
                    <Image
                      source={PROFILE_IMAGES.edit}
                      style={{ width: layout.iconEdit * 0.9, height: layout.iconEdit * 0.9 }}
                      contentFit="contain"
                    />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.statsRow}>
                <Text style={[styles.statText, { fontSize: layout.statsSize }]}>
                  ♡ {formatCount(likesCount)} {t('profile.likes')}
                </Text>
                <Text style={[styles.statText, { fontSize: layout.statsSize }]}>
                  {formatCount(fansCount)} {t('profile.fans')}
                </Text>
                <Text style={[styles.statText, { fontSize: layout.statsSize }]}>
                  {formatCount(followingCount)} {t('profile.follows')}
                </Text>
              </View>

              <Text style={[styles.agentMeta, { fontSize: layout.agentMetaSize }]}>{agentCountLabel}</Text>

              {user?.email ? (
                <Text style={[styles.emailLine, { fontSize: Math.max(11, layout.statsSize - 1) }]} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>

          {/* VIP + Points cards */}
          <View style={[styles.actionCards, { gap: layout.gap, marginTop: isDesktop ? 20 : 16 }]}>
            <Pressable
              onPress={() => openProtectedRoute('/vip/shop')}
              style={({ pressed }) => [
                styles.vipCard,
                {
                  width: layout.vipCardW,
                  minHeight: layout.actionCardH,
                  borderRadius: isDesktop ? 18 : 12,
                },
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${t('profile.vip')}. ${vipSubtitle}`}
              accessibilityHint={t('vip.profile.tapToUpgrade')}
            >
              <Image source={PROFILE_IMAGES.vipCardBg} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={[styles.cardInner, !isDesktop && styles.cardInnerMobile]}>
                <Text
                  style={[styles.cardLabel, !isDesktop && styles.cardLabelMobile]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {t('profile.vip')}
                </Text>
                <Text
                  style={[styles.cardValue, !isDesktop && styles.cardValueMobile]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {vipPlanLabel}
                </Text>
                <Text style={[styles.cardHint, !isDesktop && styles.cardHintMobile]} numberOfLines={2}>
                  {vipSubtitle}
                </Text>
                {isDesktop ? (
                  <Text style={styles.cardHint} numberOfLines={1}>
                    {quotaSubtitle}
                  </Text>
                ) : null}
              </View>
            </Pressable>

            <Pressable
              onPress={() => openProtectedRoute('/points/shop')}
              style={({ pressed }) => [
                styles.pointsCard,
                {
                  flex: 1,
                  minHeight: layout.actionCardH,
                  borderRadius: isDesktop ? 18 : 12,
                },
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
            >
              <Image source={PROFILE_IMAGES.pointsCardBg} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={[styles.cardInner, !isDesktop && styles.cardInnerMobile]}>
                <Text
                  style={[styles.cardLabel, !isDesktop && styles.cardLabelMobile]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {t('profile.points')}
                </Text>
                <Text
                  style={[styles.cardValue, !isDesktop && styles.cardValueMobile]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {pointsValue}
                </Text>
                <Text style={[styles.cardHint, !isDesktop && styles.cardHintMobile]} numberOfLines={2}>
                  {t('profile.pointsHint')}
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            onPress={() => openProtectedRoute('/soul/wallet')}
            style={({ pressed }) => [
              styles.plusBar,
              {
                height: layout.plusBarH,
                borderRadius: layout.plusBarH / 2,
                marginTop: isDesktop ? 16 : 12,
              },
              pressed && styles.cardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('profile.wallet')}
          >
            <Ionicons name="wallet-outline" size={Math.round(layout.iconPlus)} color="#F2F2F4" />
            <View style={styles.funcBlockText}>
              <Text style={styles.barLabel}>{t('profile.wallet')}</Text>
              <Text style={[styles.barHint, { color: 'rgba(242,242,244,0.72)' }]} numberOfLines={1}>
                {t('profile.walletHint')}
              </Text>
            </View>
          </Pressable>

          {/* History / My Agents / My Worlds — switchable library row */}
          <View style={[styles.agentsHeader, { marginTop: isDesktop ? 28 : 22 }]}>
            <View style={styles.libraryTabs}>
              <Pressable
                onPress={() => setLibraryTab('history')}
                style={[styles.libraryTab, libraryTab === 'history' && styles.libraryTabOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: libraryTab === 'history' }}
              >
                <Text
                  style={[
                    styles.libraryTabText,
                    { fontSize: Math.max(18, layout.sectionTitleSize - 4) },
                    libraryTab === 'history' && styles.libraryTabTextOn,
                  ]}
                >
                  {t('profile.history')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLibraryTab('agents')}
                style={[styles.libraryTab, libraryTab === 'agents' && styles.libraryTabOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: libraryTab === 'agents' }}
              >
                <Text
                  style={[
                    styles.libraryTabText,
                    { fontSize: Math.max(18, layout.sectionTitleSize - 4) },
                    libraryTab === 'agents' && styles.libraryTabTextOn,
                  ]}
                >
                  {t('profile.myAgents')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLibraryTab('worlds')}
                style={[styles.libraryTab, libraryTab === 'worlds' && styles.libraryTabOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: libraryTab === 'worlds' }}
              >
                <Text
                  style={[
                    styles.libraryTabText,
                    { fontSize: Math.max(18, layout.sectionTitleSize - 4) },
                    libraryTab === 'worlds' && styles.libraryTabTextOn,
                  ]}
                >
                  {t('profile.myWorlds')}
                </Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() =>
                openProtectedRoute(libraryTab === 'worlds' ? '/world' : '/free-chat')
              }
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                libraryTab === 'worlds'
                  ? t('profile.worldsMore')
                  : libraryTab === 'history'
                    ? t('profile.historyMore')
                    : t('profile.agentsMore')
              }
              style={styles.agentsMoreHeaderBtn}
            >
              <Text style={styles.agentsMoreHeaderText}>
                {libraryTab === 'worlds'
                  ? t('profile.worldsMore')
                  : libraryTab === 'history'
                    ? t('profile.historyMore')
                    : t('profile.agentsMore')}
              </Text>
              <Text style={styles.chevronInline}>›</Text>
            </Pressable>
          </View>

          {libraryTab === 'history' ? (
            historyAgents.length === 0 ? (
              <Pressable
                onPress={() => openProtectedRoute('/free-chat')}
                style={[styles.emptyAgents, { height: layout.agentCardH * 0.55 }]}
              >
                <Text style={styles.emptyAgentsText}>{t('profile.emptyHistory')}</Text>
              </Pressable>
            ) : (
              <ScrollView
                ref={agentsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                {...agentsScrollHideProps}
                style={agentsScrollHideStyle}
                contentContainerStyle={[styles.agentsScroll, { gap: layout.gap }]}
              >
                {historyAgents.slice(0, 8).map((role) => (
                  <AgentThumb
                    key={role.id}
                    role={role}
                    width={layout.agentCardW}
                    height={layout.agentCardH}
                    onPress={() => {
                      if (consumeClickIfDragged()) return;
                      setSelectedRole(role);
                    }}
                  />
                ))}
                {historyAgents.length > 8 ? (
                  <Pressable
                    onPress={() => {
                      if (consumeClickIfDragged()) return;
                      openProtectedRoute('/free-chat');
                    }}
                    style={({ pressed }) => [
                      styles.agentMoreCard,
                      {
                        width: layout.agentCardW,
                        height: layout.agentCardH,
                        borderRadius: 7,
                      },
                      pressed && styles.cardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.historyMore')}
                  >
                    <Text style={styles.agentMoreCardText}>{t('profile.historyMore')}</Text>
                    <Text style={styles.agentMoreCardChevron}>›</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            )
          ) : libraryTab === 'agents' ? (
            ownedAgents.length === 0 ? (
              <Pressable
                onPress={() => openProtectedRoute('/create-agent')}
                style={[styles.emptyAgents, { height: layout.agentCardH * 0.55 }]}
              >
                <Text style={styles.emptyAgentsText}>{t('profile.emptyAgents')}</Text>
              </Pressable>
            ) : (
              <ScrollView
                ref={agentsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                {...agentsScrollHideProps}
                style={agentsScrollHideStyle}
                contentContainerStyle={[styles.agentsScroll, { gap: layout.gap }]}
              >
                {ownedAgents.slice(0, 8).map((role) => (
                  <AgentThumb
                    key={role.id}
                    role={role}
                    width={layout.agentCardW}
                    height={layout.agentCardH}
                    onPress={() => {
                      if (consumeClickIfDragged()) return;
                      setSelectedRole(role);
                    }}
                  />
                ))}
                {ownedAgents.length > 8 ? (
                  <Pressable
                    onPress={() => {
                      if (consumeClickIfDragged()) return;
                      openProtectedRoute('/free-chat');
                    }}
                    style={({ pressed }) => [
                      styles.agentMoreCard,
                      {
                        width: layout.agentCardW,
                        height: layout.agentCardH,
                        borderRadius: 7,
                      },
                      pressed && styles.cardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.agentsMore')}
                  >
                    <Text style={styles.agentMoreCardText}>{t('profile.agentsMore')}</Text>
                    <Text style={styles.agentMoreCardChevron}>›</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            )
          ) : ownedWorlds.length === 0 ? (
            <Pressable
              onPress={() => openProtectedRoute('/create-world')}
              style={[styles.emptyAgents, { height: layout.agentCardH * 0.55 }]}
            >
              <Text style={styles.emptyAgentsText}>{t('profile.emptyWorlds')}</Text>
            </Pressable>
          ) : (
            <ScrollView
              ref={agentsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              {...agentsScrollHideProps}
              style={agentsScrollHideStyle}
              contentContainerStyle={[styles.agentsScroll, { gap: layout.gap }]}
            >
              {ownedWorlds.slice(0, 8).map((world) => (
                <WorldThumb
                  key={world.world_id}
                  world={world}
                  width={layout.agentCardW}
                  height={layout.agentCardH}
                  onPress={() => {
                    if (consumeClickIfDragged()) return;
                    openProtectedRoute(`/world/${world.world_id}/edit`);
                  }}
                />
              ))}
              {ownedWorlds.length > 8 ? (
                <Pressable
                  onPress={() => {
                    if (consumeClickIfDragged()) return;
                    openProtectedRoute('/world');
                  }}
                  style={({ pressed }) => [
                    styles.agentMoreCard,
                    {
                      width: layout.agentCardW,
                      height: layout.agentCardH,
                      borderRadius: 7,
                    },
                    pressed && styles.cardPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.worldsMore')}
                >
                  <Text style={styles.agentMoreCardText}>{t('profile.worldsMore')}</Text>
                  <Text style={styles.agentMoreCardChevron}>›</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}

          {/* Plus bar → Invite Friends / Alliance invite */}
          <Pressable
            onPress={() => void handleInvitePress()}
            disabled={inviteCopying}
            style={({ pressed }) => [
              styles.plusBar,
              {
                height: layout.plusBarH,
                borderRadius: layout.plusBarH / 2,
                marginTop: isDesktop ? 28 : 20,
              },
              pressed && styles.cardPressed,
              inviteCopying && styles.barDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isAffiliatePartner ? t('affiliate.inviteTitle') : t('referral.title')}
          >
            {inviteCopying ? (
              <ActivityIndicator color="#F2F2F4" />
            ) : (
              <Image
                source={PROFILE_IMAGES.plus}
                style={{ width: layout.iconPlus, height: layout.iconPlus }}
                contentFit="contain"
              />
            )}
            <Text style={styles.barLabel}>
              {isAffiliatePartner ? t('affiliate.inviteTitle') : t('referral.title')}
            </Text>
          </Pressable>

          {/* Function blocks: Daily Task / Setting */}
          <View style={[styles.funcBlocks, { gap: layout.gap, marginTop: layout.gap }]}>
            <Pressable
              onPress={handleDailyTasksPress}
              style={({ pressed }) => [
                styles.funcBlock,
                { minHeight: layout.starBarH, borderRadius: isDesktop ? 16 : 12 },
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('dailyTasks.title')}
            >
              <Image
                source={PROFILE_IMAGES.star}
                style={{ width: layout.iconStar * 0.7, height: layout.iconStar * 0.7 }}
                contentFit="contain"
              />
              <View style={styles.funcBlockText}>
                <Text style={styles.barLabelDark}>{t('dailyTasks.title')}</Text>
                <Text style={styles.barHint} numberOfLines={2}>
                  {t('dailyTasks.subtitle')}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => openProtectedRoute('/settings')}
              style={({ pressed }) => [
                styles.funcBlock,
                { minHeight: layout.starBarH, borderRadius: isDesktop ? 16 : 12 },
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('settings.title')}
            >
              <Ionicons name="settings-outline" size={Math.round(layout.iconStar * 0.55)} color="#FF4D4D" />
              <View style={styles.funcBlockText}>
                <Text style={styles.barLabelDark}>{t('settings.title')}</Text>
              </View>
            </Pressable>

            {isAffiliatePartner ? (
              <Pressable
                onPress={() => openProtectedRoute('/affiliate')}
                style={({ pressed }) => [
                  styles.funcBlock,
                  { minHeight: layout.starBarH, borderRadius: isDesktop ? 16 : 12 },
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('affiliate.listTitle')}
              >
                <Ionicons name="people-outline" size={Math.round(layout.iconStar * 0.55)} color="#FF4D4D" />
                <View style={styles.funcBlockText}>
                  <Text style={styles.barLabelDark}>{t('affiliate.listTitle')}</Text>
                </View>
              </Pressable>
            ) : null}
          </View>

          {/* Achievement Center not shipped yet — hide placeholder on profile. */}
          {/*
          <View style={[styles.achievementRow, { marginTop: layout.gap }]}>
            <View style={styles.achievementInner}>
              <Ionicons name="trophy-outline" size={18} color={TOKENS.colors.textMuted} />
              <Text style={styles.achievementText}>
                {t('profile.achievementCenter')} · {achievementsCurrent}/{achievementsTotal} ·{' '}
                {t('profile.achievementCenterLocked')}
              </Text>
            </View>
          </View>
          */}
        </ScrollView>
      </View>

      {Platform.OS === 'web' ? (
        <AvatarCropModal
          visible={cropPick != null}
          imageUri={cropPick?.previewUri ?? ''}
          loading={avatarUploading}
          onConfirm={(area: CroppedAreaPixels) => void handleCropConfirm(area)}
          onCancel={handleCropCancel}
        />
      ) : null}

      <ThemedAgentDetailModal
        visible={selectedRole != null}
        role={selectedRole}
        mode={libraryTab === 'agents' ? 'library' : 'explore'}
        onClose={() => setSelectedRole(null)}
        onStartChat={(roleId) => {
          setSelectedRole(null);
          if (!requireLogin()) return;
          router.push(`/free-chat/${roleId}`);
        }}
        onViewMedia={(roleId) => {
          setSelectedRole(null);
          router.push(`/agent/${roleId}/media` as never);
        }}
        onManage={
          libraryTab === 'agents'
            ? (roleId) => {
                setSelectedRole(null);
                if (!requireLogin()) return;
                router.push(`/agent/${roleId}/settings`);
              }
            : undefined
        }
        onSocialManage={
          libraryTab === 'agents'
            ? (roleId) => {
                setSelectedRole(null);
                if (!requireLogin()) return;
                router.push(`/agent/${roleId}/posts` as never);
              }
            : undefined
        }
      />

      <Modal
        visible={nicknameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeNicknameEdit}
      >
        <View style={styles.nicknameModalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeNicknameEdit} />
          <View style={styles.nicknameModalCard}>
            <Text style={styles.nicknameModalTitle}>{t('profile.editNickname')}</Text>
            <TextInput
              value={nicknameDraft}
              onChangeText={setNicknameDraft}
              placeholder={t('profile.nicknamePlaceholder')}
              placeholderTextColor={TOKENS.colors.textMuted}
              maxLength={NICKNAME_MAX}
              autoFocus
              editable={!nicknameSaving}
              style={styles.nicknameInput}
              returnKeyType="done"
              onSubmitEditing={() => void saveNickname()}
            />
            <View style={styles.nicknameModalActions}>
              <Pressable
                onPress={closeNicknameEdit}
                disabled={nicknameSaving}
                style={({ pressed }) => [styles.nicknameModalBtn, pressed && styles.nicknameModalBtnPressed]}
              >
                <Text style={styles.nicknameModalBtnText}>{t('settings.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveNickname()}
                disabled={nicknameSaving}
                style={({ pressed }) => [
                  styles.nicknameModalBtn,
                  styles.nicknameModalBtnPrimary,
                  pressed && styles.nicknameModalBtnPressed,
                ]}
              >
                {nicknameSaving ? (
                  <ActivityIndicator size="small" color={TOKENS.colors.text} />
                ) : (
                  <Text style={[styles.nicknameModalBtnText, styles.nicknameModalBtnPrimaryText]}>
                    {t('settings.save')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <ProfileSupportFab tone="default" />
    </DefaultShell>
  );
}

function AgentThumb({
  role,
  width,
  height,
  onPress,
}: {
  role: {
    id: string;
    name: string;
    avatar_url: string;
    figure_url?: string;
  };
  width: number;
  height: number;
  onPress: () => void;
}) {
  const coverUrl = role.figure_url || role.avatar_url;
  const cover = coverUrl ? resolveStaticUrl(coverUrl) : null;
  const name = role.name?.trim() || '—';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.agentCard,
        { width, height, borderRadius: 7 },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      {cover ? (
        <FigureMediaView
          uri={cover}
          style={styles.agentCover}
          useExpoImage
          contentFit="cover"
          contentPosition="top"
        />
      ) : (
        <View style={[styles.agentCover, styles.agentPlaceholder]}>
          <Text style={styles.agentInitial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </Pressable>
  );
}

function WorldThumb({
  world,
  width,
  height,
  onPress,
}: {
  world: WorldEditorItem;
  width: number;
  height: number;
  onPress: () => void;
}) {
  const cover = world.cover_image ? resolveStaticUrl(world.cover_image) : null;
  const name = world.title?.trim() || '—';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.agentCard,
        { width, height, borderRadius: 7 },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      {cover ? (
        <FigureMediaView
          uri={cover}
          style={styles.agentCover}
          useExpoImage
          contentFit="cover"
          contentPosition="top"
        />
      ) : (
        <View style={[styles.agentCover, styles.agentPlaceholder]}>
          <Text style={styles.agentInitial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.worldThumbMeta}>
        <Text style={styles.worldThumbTitle} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.worldThumbStatus} numberOfLines={1}>
          {world.status}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
  page: {
    flex: 1,
    width: '100%',
    paddingTop: 8,
    position: 'relative',
    zIndex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  topBarBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  topBarBtnRight: {
    paddingVertical: 4,
    paddingLeft: 8,
    position: 'relative',
  },
  topBarSpacer: {
    flex: 1,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: Typo(
    {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 12,
    },
    'sans',
  ),
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  identityRowDesktop: {
    gap: 24,
  },
  avatarBtn: {
    overflow: 'hidden',
    backgroundColor: 'rgba(210, 210, 218, 0.85)',
    position: 'relative',
    flexShrink: 0,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(210, 210, 218, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 10, 15, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityMain: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  displayName: Typo(
    {
      color: '#FFFFFF',
      fontWeight: '700',
      letterSpacing: 0.2,
      flexShrink: 1,
    },
    'display',
  ),
  editBtn: {
    padding: 4,
    flexShrink: 0,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  statText: Typo(
    {
      color: '#A4A4AC',
      fontWeight: '400',
    },
    'sans',
  ),
  agentMeta: Typo(
    {
      color: '#8E8E96',
      fontWeight: '400',
    },
    'sans',
  ),
  emailLine: Typo(
    {
      color: '#8E8E96',
      fontWeight: '400',
      opacity: 0.85,
    },
    'sans',
  ),
  actionCards: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'stretch',
  },
  vipCard: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pointsCard: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  cardInner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
    backgroundColor: 'rgba(8, 10, 15, 0.18)',
  },
  cardInnerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 3,
  },
  cardLabel: Typo(
    {
      color: 'rgba(255,255,255,0.78)',
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      includeFontPadding: false,
    },
    'mono',
  ),
  cardLabelMobile: {
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.6,
  },
  cardValue: Typo(
    {
      color: '#FFFFFF',
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
      letterSpacing: 0.2,
      includeFontPadding: false,
    },
    'display',
  ),
  cardValueMobile: {
    fontSize: 16,
    lineHeight: 22,
  },
  cardHint: Typo(
    {
      color: 'rgba(255,255,255,0.58)',
      fontSize: 11,
      lineHeight: 15,
      includeFontPadding: false,
    },
    'sans',
  ),
  cardHintMobile: {
    fontSize: 10,
    lineHeight: 14,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  agentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  libraryTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  libraryTab: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  libraryTabOn: {
    borderBottomColor: TOKENS.colors.accent,
  },
  libraryTabText: Typo(
    {
      color: 'rgba(255,255,255,0.45)',
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    'display',
  ),
  libraryTabTextOn: {
    color: '#FFFFFF',
  },
  agentsMoreHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 8,
  },
  agentsMoreHeaderText: Typo(
    {
      color: '#8993AA',
      fontSize: 14,
      fontWeight: '500',
    },
    'sans',
  ),
  sectionTitle: Typo(
    {
      color: '#FFFFFF',
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    'display',
  ),
  chevronInline: Typo(
    {
      color: '#8993AA',
      fontSize: 22,
      lineHeight: 24,
      fontWeight: '400',
    },
    'sans',
  ),
  agentsScroll: {
    flexDirection: 'row',
    paddingRight: 8,
  },
  agentCard: {
    overflow: 'hidden',
    backgroundColor: '#D9D9D9',
  },
  agentMoreCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(23, 28, 40, 0.92)',
    borderWidth: 1,
    borderColor: '#2C3445',
  },
  agentMoreCardText: Typo(
    {
      color: '#F2F2F4',
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  agentMoreCardChevron: Typo(
    {
      color: '#8993AA',
      fontSize: 28,
      lineHeight: 30,
      fontWeight: '400',
    },
    'sans',
  ),
  agentCover: {
    width: '100%',
    height: '100%',
  },
  agentPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9D9D9',
  },
  agentInitial: Typo(
    {
      color: '#3A3A42',
      fontSize: 28,
      fontWeight: '700',
    },
    'display',
  ),
  worldThumbMeta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(8,10,15,0.72)',
    gap: 2,
  },
  worldThumbTitle: Typo(
    {
      color: '#F2F2F4',
      fontSize: 12,
      fontWeight: '700',
    },
    'sans',
  ),
  worldThumbStatus: Typo(
    {
      color: 'rgba(242,242,244,0.65)',
      fontSize: 10,
      fontWeight: '500',
      textTransform: 'uppercase',
    },
    'sans',
  ),
  emptyAgents: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  emptyAgentsText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    'sans',
  ),
  plusBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    backgroundColor: 'rgba(210, 74, 90, 0.34)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  funcBlocks: {
    width: '100%',
  },
  funcBlock: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    backgroundColor: '#171C28',
    borderWidth: 2,
    borderColor: '#2C3445',
  },
  funcBlockText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  barLabel: Typo(
    {
      color: '#F2F2F4',
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    'sans',
  ),
  barLabelDark: Typo(
    {
      color: '#F2F2F4',
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    'sans',
  ),
  barHint: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
    },
    'sans',
  ),
  barDisabled: {
    opacity: 0.7,
  },
  achievementRow: {
    width: '100%',
    opacity: 0.62,
  },
  achievementInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  achievementText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      flexShrink: 1,
    },
    'sans',
  ),
  nicknameModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 24,
  },
  nicknameModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.cardSolid,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    padding: 18,
    gap: 14,
  },
  nicknameModalTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    'sans',
  ),
  nicknameInput: {
    borderWidth: 1,
    borderColor: TOKENS.colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    color: TOKENS.colors.text,
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  nicknameModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  nicknameModalBtn: {
    minWidth: 84,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.line,
  },
  nicknameModalBtnPrimary: {
    backgroundColor: TOKENS.colors.accent,
    borderColor: TOKENS.colors.accent,
  },
  nicknameModalBtnPressed: {
    opacity: 0.85,
  },
  nicknameModalBtnText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  nicknameModalBtnPrimaryText: {
    color: TOKENS.colors.text,
  },
});
