import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { useAuthStore } from '../../stores/authStore';
import { getMe, getUserProfile } from '../../api/auth';
import { getChatQuota, getVoiceQuota } from '../../api/chat';
import { getVipMe } from '../../api/vip';
import { getReferralMe } from '../../api/referral';
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
import { typo } from './theme/typography';
import type { UserInfo, UserProfileData, VipMeResp, ChatQuotaResp, VoiceQuotaResp } from '../../types/api';
import { ModernPageChrome } from './theme/components/ModernPageChrome';
import { ModernPageHeader } from './theme/components/ModernPageHeader';
import { ModernProfileMenuRow } from './theme/components/ModernProfileMenuRow';
import { TOKENS } from './theme/tokens';

export function ModernProfile() {
  const router = useRouter();
  const { t } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<UserProfileData>({});
  const [vip, setVip] = useState<VipMeResp | null>(null);
  const [chatQuota, setChatQuota] = useState<ChatQuotaResp | null>(null);
  const [voiceQuota, setVoiceQuota] = useState<VoiceQuotaResp | null>(null);
  const [inviteCopying, setInviteCopying] = useState(false);
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
    (route: '/vip/shop' | '/points/shop' | '/soul/wallet' | '/settings') => {
      if (!requireLogin()) return;
      router.push(route);
    },
    [requireLogin, router],
  );

  const handleAvatarAction = useCallback(() => {
    if (!requireLogin()) return;
    void handleAvatarPress();
  }, [handleAvatarPress, requireLogin]);

  useEffect(() => {
    let mounted = true;
    if (!isRestored) return () => {
      mounted = false;
    };
    if (!isLoggedIn) {
      setUser(null);
      setProfile({});
      setVip(null);
      setChatQuota(null);
      setVoiceQuota(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    setLoading(true);
    Promise.all([getMe(), getUserProfile(), getVipMe(), getChatQuota(), getVoiceQuota()])
      .then(([meData, profileResp, vipData, quotaData, voiceData]) => {
        if (!mounted) return;
        setUser(meData);
        setVip(vipData);
        setChatQuota(quotaData);
        setVoiceQuota(voiceData);
        try {
          setProfile(JSON.parse(profileResp.profile_data || '{}'));
        } catch {
          setProfile({});
        }
      })
      .catch((err) => {
        if (mounted) notifyError(t('system.error'), formatApiError(t, err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, isRestored, t]);

  const handleInvitePress = useCallback(async () => {
    if (!requireLogin()) return;
    if (inviteCopying) return;
    setInviteCopying(true);
    try {
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
  const achievementsCurrent = profile?.achievements?.current ?? 0;
  const achievementsTotal = profile?.achievements?.total ?? 3;
  const avatarUri = user?.avatar_url ? resolveStaticUrl(user.avatar_url) : null;

  if (loading) {
    return (
      <ModernPageChrome
        scrollable={false}
        overlay={<ProfileSupportFab tone="modern" />}
      >
        <View style={styles.loadingRoot}>
          <ActivityIndicator size="large" color={TOKENS.modePage.text} />
        </View>
      </ModernPageChrome>
    );
  }

  return (
    <ModernPageChrome overlay={<ProfileSupportFab tone="modern" />}>
      <View style={styles.page}>
        <ModernPageHeader eyebrow={t('profile.eyebrow')} title={t('profile.title')} />

        <View style={styles.identity}>
          <Pressable onPress={handleAvatarAction} style={styles.avatarBtn}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={36} color={TOKENS.modePage.textSubtle} />
              </View>
            )}
            {avatarUploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={TOKENS.modePage.text} />
              </View>
            ) : null}
          </Pressable>
          <Text style={styles.displayName}>{displayName}</Text>
          <View style={[styles.badge, vipIsActive && styles.badgeActive]}>
            <Text style={styles.badgeText}>{vipPlanLabel}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <StatTile label={t('profile.chatQuotaShort')} value={chatQuotaLabel} />
          <StatTile label={t('profile.voiceQuota')} value={voiceQuotaLabel} />
          <StatTile label={t('profile.achievements')} value={`${achievementsCurrent}/${achievementsTotal}`} />
          <StatTile label={t('profile.points')} value={String(pointsValue)} />
        </View>

        <View style={styles.menu}>
          <ModernProfileMenuRow
            title={t('profile.member')}
            description={vipIsActive ? t('vip.profile.active') : t('vip.profile.tapToUpgrade')}
            onPress={() => openProtectedRoute('/vip/shop')}
          />
          <ModernProfileMenuRow
            title={t('profile.points')}
            description={t('profile.pointsHint')}
            onPress={() => openProtectedRoute('/points/shop')}
          />
          <ModernProfileMenuRow
            title={t('profile.wallet')}
            description={t('profile.walletHint')}
            onPress={() => openProtectedRoute('/soul/wallet')}
          />
          <ModernProfileMenuRow
            title={t('referral.title')}
            description={inviteCopying ? t('referral.copied') : t('referral.subtitle')}
            onPress={() => void handleInvitePress()}
          />
          <ModernProfileMenuRow
            title={t('settings.title')}
            onPress={() => openProtectedRoute('/settings')}
            showDivider={false}
          />
        </View>
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
    </ModernPageChrome>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  page: {
    paddingTop: 8,
    gap: 22,
  },
  identity: {
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  avatarBtn: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: TOKENS.modePage.line,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: typo(
    {
      color: TOKENS.modePage.text,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    'display',
  ),
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: TOKENS.modePage.line,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  badgeActive: {
    borderColor: TOKENS.modePage.text,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  badgeText: typo(
    {
      color: TOKENS.modePage.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: 14,
    gap: 4,
  },
  statValue: typo(
    {
      color: TOKENS.modePage.text,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    'display',
  ),
  statLabel: typo(
    {
      color: TOKENS.modePage.textSubtle,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  menu: {
    gap: 0,
    marginTop: 4,
  },
});
