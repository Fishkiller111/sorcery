import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Lang } from '../src/i18n/types';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  type StyleProp,
  type TextStyle,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemePage } from '../src/theme/useThemePage';
import { DefaultProfileScreen } from '../src/pages/default/Profile';
import { ModernProfile } from '../src/pages/modern/Profile';
import { Ionicons } from '@expo/vector-icons';
import { SocialLinks } from '../src/components/common/SocialLinks';
import { ShellLayout } from '../src/components/shell/ShellLayout';
import { useI18n } from '../src/i18n/I18nContext';
import { useIsDesktop } from '../src/hooks/useIsDesktop';
import { PageBackground } from '../src/components/ui/PageBackground';
import { DividerStar } from '../src/components/ui/DividerStar';
import { RibbonSectionHeader } from '../src/components/ui/RibbonSectionHeader';
import { COLORS } from '../src/theme/colors';
import { Typo } from '../src/theme/typography';
import { SIDEBAR_WIDTH } from '../src/constants/layout';
import { useAuthStore } from '../src/stores/authStore';
import { getMe, getUserProfile } from '../src/api/auth';
import { getChatQuota, getVoiceQuota } from '../src/api/chat';
import { getVipMe } from '../src/api/vip';
import { getReferralMe } from '../src/api/referral';
import { listSurveys } from '../src/api/surveys';
import { Message } from '../src/components/ui/Message';
import { notifyError } from '../src/utils/notify';
import { formatApiError } from '../src/utils/apiError';
import { copyOrShareText } from '../src/utils/copyOrShare';
import { resolveStaticUrl } from '../src/constants/config';
import { useMobileSafeAreaPadding } from '../src/hooks/useMobileSafeAreaPadding';
import { requireLoginForAction } from '../src/utils/requireLogin';
import { AvatarCropModal } from '../src/components/profile/AvatarCropModal';
import { ProfileSupportFab } from '../src/components/profile/ProfileSupportFab';
import { SurveyPromptModal } from '../src/components/survey/SurveyPromptModal';
import { useAvatarCropUpload } from '../src/hooks/useAvatarCropUpload';
import type { CroppedAreaPixels } from '../src/utils/cropAvatarImage';
import type { UserInfo, UserProfileData, VipMeResp, ChatQuotaResp, VoiceQuotaResp, SurveyItem } from '../src/types/api';

const CARD_INFO_SRC = { width: 696, height: 372 };
const CARD_INFO_CAP = { left: 23, top: 21, right: 28, bottom: 21 };
const CARD_STATS_SRC = { width: 816, height: 759 };
const CARD_STATS_CAP = { left: 46, top: 46, right: 46, bottom: 46 };
/** Mobile info card height / width — matches `card_info_bg.png` source ratio. */
const INFO_CARD_DISPLAY_ASPECT = CARD_INFO_SRC.height / CARD_INFO_SRC.width;
/** PC info cards — shorter frame, content-sized. */
const INFO_CARD_DESKTOP_ASPECT = 200 / 460;
/** PC settings row height (px at 724px art width). */
const SETTINGS_DESKTOP_HEIGHT = 96;
/** PC stats card vertical slack between rows. */
/** Mobile info card inner inset (all sides). */
const INFO_CARD_MOBILE_PAD = 6;
/** Mobile emblem is narrower than the identity sheet crop suggests on full-page layout. */
const EMBLEM_MOBILE_SCALE = 0.72;
const SETTINGS_BG_SRC = { width: 724, height: 230 };
const SETTINGS_CAP = { left: 28, top: 18, right: 75, bottom: 17 };
/** PC mock: settings/stats card ≈ 59% of main column width (780px / 1316px). */
const DESKTOP_CARD_WIDTH_RATIO = 0.59;
const DESKTOP_CARD_MAX = 780;
const DESKTOP_CARD_MIN = 420;
/** Mobile: cards use nearly full screen width with small side inset. */
const MOBILE_HORIZONTAL_PAD = 16;
/** Mobile info cards — shorter than source art ratio. */
const INFO_CARD_MOBILE_ASPECT = 300 / CARD_INFO_SRC.width;
/** Mobile settings row height (px at 724px art width). */
const SETTINGS_MOBILE_HEIGHT = 148;
const DESKTOP_CONTENT_MAX = 720;
const BOTTOM_NAV_INSET = 90;

function scaleLayout(value: number, scale: number): number {
  return Math.max(1, Math.round(value * scale));
}

/** Identity slice proportions from `用户身份区.jpg` (sheet width ≈ 864). */
const IDENTITY_SHEET_WIDTH = 864;
const AVATAR_RING_SRC = { width: 442, height: 454 };
const AVATAR_SILHOUETTE_SRC = { width: 256, height: 336 };
const EMBLEM_WINGS_SRC = { width: 709, height: 213 };
const AVATAR_WIDTH_RATIO = AVATAR_RING_SRC.width / IDENTITY_SHEET_WIDTH;
const EMBLEM_WIDTH_RATIO = EMBLEM_WINGS_SRC.width / IDENTITY_SHEET_WIDTH;

/** Profile 侧栏图标统一尺寸上限（与 stats 区 reel 图标一致） */
const PROFILE_ICON_MAX = 40;

type InfoCardProps = {
  width: number;
  height: number;
  innerStyle?: object | object[];
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
};

function InfoCardText({
  style,
  children,
  lines = 1,
  minScale = 0.72,
}: {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  lines?: number;
  minScale?: number;
}) {
  return (
    <Text
      style={style}
      numberOfLines={lines}
      adjustsFontSizeToFit
      minimumFontScale={minScale}
    >
      {children}
    </Text>
  );
}

function InfoCard({ width, height, innerStyle, children, styles }: InfoCardProps) {
  const frame = useMemo(
    () => ({ width, height, overflow: 'hidden' as const }),
    [width, height],
  );
  return (
    <ImageBackground
      source={require('../assets/images/ui/profile/card_info_bg.png')}
      style={frame}
      imageStyle={styles.stretchImage}
      resizeMode="stretch"
      capInsets={CARD_INFO_CAP}
    >
      <View style={[styles.infoCardInner, { width, height }, innerStyle]}>{children}</View>
    </ImageBackground>
  );
}

export default function Profile() {
  const ThemedPage = useThemePage({
    default: DefaultProfileScreen,
    modern: ModernProfile,
  });
  if (ThemedPage) return <ThemedPage />;
  return <SovietProfile />;
}

function SovietProfile() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const isDesktop = useIsDesktop();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { paddingTop: safeTop, paddingBottom: safeBottom } = useMobileSafeAreaPadding();

  const {
    viewportHeight,
    sectionGap,
    contentPadTop,
    contentPadBottom,
    headerMarginBottom,
    identityMarginBottom,
    footerMarginTop,
    contentWidth,
    cardWidth,
    headerTitleSize,
    infoCardWidth,
    infoCardHeight,
    pointsCardHeight,
    infoRowWidth,
    infoCardPad,
    infoMemberTextSize,
    hintFontSize,
    profileIconSize,
    infoLabelSize,
    quotaLineSize,
    pointsValueSize,
    memberRibbonSize,
    starsSize,
    statsCardHeight,
    settingsHeight,
    settingsCapWidth,
    profileIconColumnLeft,
    profileInnerPadX,
    settingsLabelSize,
    statsPad,
    statsRowPad,
    statsTitlePad,
    statsTitleSize,
    statsLabelSize,
    statsValueSize,
    statsStarSize,
    avatarSize,
    avatarSilhouetteWidth,
    avatarSilhouetteHeight,
    avatarInnerSize,
    emblemWidth,
    emblemHeight,
    usernameSize,
  } = useMemo(() => {
    const w = isDesktop
      ? Math.min(DESKTOP_CONTENT_MAX, Math.max(windowWidth - SIDEBAR_WIDTH - 96, 480))
      : windowWidth - MOBILE_HORIZONTAL_PAD * 2;
    const cardW = isDesktop
      ? Math.min(
          DESKTOP_CARD_MAX,
          Math.max(DESKTOP_CARD_MIN, Math.round((windowWidth - SIDEBAR_WIDTH) * DESKTOP_CARD_WIDTH_RATIO)),
        )
      : w;
    const gap = 12;
    const infoRowWidth = cardW;
    const infoW = Math.floor((infoRowWidth - gap) / 2);
    const infoH = Math.round(
      infoW * (isDesktop ? INFO_CARD_DESKTOP_ASPECT : INFO_CARD_MOBILE_ASPECT),
    );
    const infoPadScale = isDesktop ? 0.32 : 1;
    const settingsH = isDesktop
      ? Math.round((cardW * SETTINGS_DESKTOP_HEIGHT) / SETTINGS_BG_SRC.width)
      : Math.round((cardW * SETTINGS_MOBILE_HEIGHT) / SETTINGS_BG_SRC.width);
    const capW = Math.round(settingsH * 0.34);
    const settingsLabelSize = Math.round(
      Math.min(isDesktop ? 18 : 16, settingsH * (isDesktop ? 0.46 : 0.3)),
    );
    const statsTitleSize = settingsLabelSize;

    const statsPadTop = isDesktop
      ? Math.round(cardW * 0.016)
      : Math.round(cardW * (CARD_STATS_CAP.top / CARD_STATS_SRC.width) + 4);
    const statsPadBottom = isDesktop
      ? Math.round(cardW * 0.014)
      : Math.round(cardW * (CARD_STATS_CAP.bottom / CARD_STATS_SRC.width) + 2);
    const statsLabelSize = Math.round(Math.min(isDesktop ? 12 : 12, cardW * 0.036));
    const statsValueSize = Math.round(Math.min(isDesktop ? 16 : 16, cardW * 0.048));
    const statsStarSize = Math.round(Math.min(isDesktop ? 11 : 16, cardW * 0.034));
    const statsIconSize = Math.round(Math.min(PROFILE_ICON_MAX, cardW * 0.13));
    const rowTextBlockH = statsLabelSize + statsValueSize + 4;
    const statsRowPadV = isDesktop ? 20 : 16;
    const statsRowContentH = isDesktop
      ? Math.max(statsIconSize, statsLabelSize)
      : Math.max(statsIconSize, rowTextBlockH);
    const statsRow1H = statsRowPadV + statsRowContentH;
    const statsRow2H = statsRow1H;
    const statsTitleRowH = isDesktop
      ? Math.max(statsStarSize, statsTitleSize) + 8
      : statsTitleSize;
    const statsH = isDesktop
      ? statsPadTop + statsPadBottom + statsTitleRowH + statsRow1H + 1 + statsRow2H
      : statsPadTop +
        statsPadBottom +
        statsTitleSize +
        6 +
        statsStarSize +
        8 +
        6 +
        statsRow1H +
        6 +
        1 +
        4 +
        statsRow2H;
    const avatar = Math.round(
      isDesktop ? Math.min(152, w * 0.19) : Math.max(120, w * AVATAR_WIDTH_RATIO - 50),
    );
    const silW = Math.round(avatar * (AVATAR_SILHOUETTE_SRC.width / AVATAR_RING_SRC.width));
    const silH = Math.round(silW * (AVATAR_SILHOUETTE_SRC.height / AVATAR_SILHOUETTE_SRC.width));
    const avatarInner = Math.round(avatar * 0.72);
    const emblemW = Math.max(
      120,
      Math.round(w * EMBLEM_WIDTH_RATIO * (isDesktop ? 1 : EMBLEM_MOBILE_SCALE) - (isDesktop ? 0 : 25)),
    );
    const emblemH = Math.round(emblemW * (EMBLEM_WINGS_SRC.height / EMBLEM_WINGS_SRC.width));
    const padTop = Math.round(
      infoH * (CARD_INFO_CAP.top / CARD_INFO_SRC.height) * infoPadScale + (isDesktop ? 2 : 4),
    );
    const padBottom = Math.round(
      infoH * (CARD_INFO_CAP.bottom / CARD_INFO_SRC.height) * infoPadScale + (isDesktop ? 2 : 6),
    );
    const padX = Math.round(
      infoW * (CARD_INFO_CAP.left / CARD_INFO_SRC.width) * infoPadScale + (isDesktop ? 0 : 2),
    );
    const headerTitleSize = Math.round(isDesktop ? 40 : 34);
    const usernameSize = Math.round(Math.min(isDesktop ? 40 : 28, w * (isDesktop ? 0.09 : 0.058)));
    const pointsCardH = isDesktop ? Math.round(infoH * 0.92) : Math.round(infoH * 0.88);
    const sectionGapBase = isDesktop ? 10 : 14;
    const contentPadTopBase = (isDesktop ? 40 : 48) + (isDesktop ? 0 : safeTop);
    const contentPadBottomBase = isDesktop ? 12 : 24;
    const headerMarginBottomBase = isDesktop ? 14 : 8;
    const identityMarginBottomBase = isDesktop ? 12 : 10;
    const footerMarginTopBase = 20;
    const headerBlockH = isDesktop ? headerTitleSize + headerMarginBottomBase : 50;
    const identityBlockH =
      2 +
      avatar +
      8 +
      Math.round(usernameSize * 1.05) +
      (isDesktop ? 0 : 6) +
      16 +
      (isDesktop ? 0 : emblemH + 2) +
      identityMarginBottomBase;
    const footerBlockH = isDesktop ? 0 : footerMarginTopBase + 14;
    const naturalHeight =
      contentPadTopBase +
      headerBlockH +
      identityBlockH +
      infoH +
      sectionGapBase +
      pointsCardH +
      sectionGapBase +
      (settingsH + sectionGapBase) * 2 +
      statsH +
      footerBlockH +
      contentPadBottomBase;
    const bottomInset = isDesktop ? 0 : BOTTOM_NAV_INSET + safeBottom;
    const availableHeight = windowHeight - bottomInset;
    const layoutScale = isDesktop
      ? Math.min(1, (availableHeight * 0.98) / Math.max(naturalHeight, 1))
      : 1;
    const s = (value: number) => scaleLayout(value, layoutScale);

    const iconSideMargin = isDesktop ? 15 : 20;
    const profileInnerPadX = isDesktop ? s(padX) : s(INFO_CARD_MOBILE_PAD + 2);
    const profileIconColumnLeft = profileInnerPadX + s(iconSideMargin);

    return {
      viewportHeight: availableHeight,
      sectionGap: s(sectionGapBase),
      contentPadTop: s(contentPadTopBase),
      contentPadBottom: s(contentPadBottomBase),
      headerMarginBottom: s(headerMarginBottomBase),
      identityMarginBottom: s(identityMarginBottomBase),
      footerMarginTop: s(footerMarginTopBase),
      contentWidth: s(w),
      cardWidth: s(cardW),
      headerTitleSize: s(headerTitleSize),
      infoCardWidth: s(infoW),
      infoCardHeight: s(infoH),
      pointsCardHeight: s(pointsCardH),
      infoRowWidth: s(infoRowWidth),
      infoCardPad: isDesktop
        ? {
            paddingTop: s(padTop),
            paddingBottom: s(padBottom),
            paddingHorizontal: s(padX),
          }
        : {},
      profileIconSize: {
        width: s(statsIconSize),
        height: s(statsIconSize),
      },
      infoLabelSize: s(
        Math.round(Math.min(isDesktop ? 16 : 12, infoH * (isDesktop ? 0.2 : 0.082))),
      ),
      quotaLineSize: s(Math.round(Math.min(isDesktop ? 12 : 10, infoH * (isDesktop ? 0.15 : 0.068)))),
      pointsValueSize: isDesktop
        ? s(Math.round(Math.min(24, infoH * 0.4)))
        : s(17),
      memberRibbonSize: {
        width: s(Math.round(infoW * (isDesktop ? 0.52 : 0.5))),
        height: s(Math.round(infoH * (isDesktop ? 0.11 : 0.17))),
      },
      starsSize: {
        width: s(Math.round(infoW * (isDesktop ? 0.48 : 0.48))),
        height: s(Math.round(infoH * (isDesktop ? 0.1 : 0.16))),
      },
      infoMemberTextSize: isDesktop ? s(Math.max(9, Math.round(infoH * 0.1))) : s(8),
      hintFontSize: s(Math.max(8, Math.round(infoH * 0.1))),
      statsCardHeight: s(statsH),
      statsPad: {
        paddingTop: s(statsPadTop),
        paddingBottom: s(statsPadBottom),
      },
      statsRowPad: {
        paddingLeft: profileIconColumnLeft,
        paddingRight: profileInnerPadX,
      },
      statsTitlePad: {
        paddingLeft: profileIconColumnLeft,
        paddingRight: profileIconColumnLeft,
      },
      statsTitleSize: s(statsTitleSize),
      statsLabelSize: s(statsLabelSize),
      statsValueSize: s(statsValueSize),
      statsStarSize: s(statsStarSize),
      settingsHeight: s(settingsH),
      settingsCapWidth: s(capW),
      profileIconColumnLeft,
      profileInnerPadX,
      settingsLabelSize: s(settingsLabelSize),
      avatarSize: s(avatar),
      avatarSilhouetteWidth: s(silW),
      avatarSilhouetteHeight: s(silH),
      avatarInnerSize: s(avatarInner),
      emblemWidth: s(emblemW),
      emblemHeight: s(emblemH),
      usernameSize: s(usernameSize),
    };
  }, [windowWidth, windowHeight, isDesktop, safeTop, safeBottom]);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [vip, setVip] = useState<VipMeResp | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [chatQuota, setChatQuota] = useState<ChatQuotaResp | null>(null);
  const [voiceQuota, setVoiceQuota] = useState<VoiceQuotaResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCopying, setInviteCopying] = useState(false);
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
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

  useEffect(() => {
    let isMounted = true;
    if (!isRestored) return () => {
      isMounted = false;
    };
    if (!isLoggedIn) {
      setUser(null);
      setVip(null);
      setProfile({});
      setChatQuota(null);
      setVoiceQuota(null);
      setSurveys([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }
    setLoading(true);
    Promise.all([
      getMe(),
      getUserProfile(),
      getVipMe(),
      getChatQuota(),
      getVoiceQuota(),
      listSurveys().catch(() => ({ items: [] as SurveyItem[] })),
    ])
      .then(([meData, profileResp, vipData, quotaData, voiceData, surveyData]) => {
        if (!isMounted) return;
        setUser(meData);
        setVip(vipData);
        setChatQuota(quotaData);
        setVoiceQuota(voiceData);
        setSurveys(surveyData.items ?? []);
        try {
          const parsed: UserProfileData = JSON.parse(profileResp.profile_data || '{}');
          setProfile(parsed);
        } catch {
          setProfile({});
        }
        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          notifyError(t('system.error'), formatApiError(t, err));
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isRestored, t]);

  const refreshSurveys = useCallback(() => {
    void listSurveys()
      .then((data) => setSurveys(data.items ?? []))
      .catch(() => setSurveys([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isRestored && isLoggedIn) {
        refreshSurveys();
      }
    }, [isRestored, isLoggedIn, refreshSurveys]),
  );

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
  const sceneValue = profile?.scene ?? 's0_01';
  const achievementsCurrent = profile?.achievements?.current ?? 0;
  const achievementsTotal = profile?.achievements?.total ?? 3;
  const primarySurvey = surveys[0] ?? null;

  if (loading) {
    return (
      <ShellLayout scrollable={false} showLangToggle={false}>
        <View style={styles.loadingRoot}>
          <ActivityIndicator size="large" color={COLORS.accent.gold} />
        </View>
        <ProfileSupportFab tone="soviet" />
      </ShellLayout>
    );
  }

  return (
    <ShellLayout showLangToggle={false}>
      <SurveyPromptModal survey={primarySurvey} />
      <View
        style={[
          styles.page,
          isDesktop ? styles.pageDesktop : styles.pageMobile,
          isDesktop && { minHeight: viewportHeight },
        ]}
      >
        {isDesktop ? <PageBackground variant="home" /> : null}
        <View
          style={[
            styles.content,
            isDesktop ? styles.contentDesktop : styles.contentMobile,
            {
              width: contentWidth,
              paddingTop: contentPadTop,
              paddingBottom: contentPadBottom,
            },
          ]}
        >
          <View style={[styles.header, isDesktop && styles.headerDesktop, { marginBottom: headerMarginBottom }]}>
            {isDesktop ? (
              <View style={styles.desktopTitleRow}>
                <View style={styles.desktopTitleLine} />
                <DividerStar color={RED_ACCENT} size={14} />
                <Text
                  style={Typo(
                    { ...styles.headerTitle, fontSize: headerTitleSize, marginTop: 0, marginBottom: 0 },
                    'display',
                    lang,
                  )}
                >
                  {t('profile.title')}
                </Text>
                <DividerStar color={RED_ACCENT} size={14} />
                <View style={styles.desktopTitleLine} />
              </View>
            ) : (
              <RibbonSectionHeader
                ribbonSource={require('../assets/images/ui/profile/header_ribbon.png')}
              >
                <Text style={Typo(styles.headerTitle, 'display', lang)}>
                  {t('profile.title')}
                </Text>
              </RibbonSectionHeader>
            )}
          </View>

          <View
            style={[
              styles.identity,
              isDesktop && styles.identityDesktop,
              { marginBottom: identityMarginBottom },
            ]}
          >
            <Pressable
              onPress={handleAvatarAction}
              disabled={avatarUploading}
              style={[styles.avatarWrap, { width: avatarSize, height: avatarSize }]}
            >
              {user?.avatar_url ? (
                <View
                  style={[
                    styles.avatarPhotoClip,
                    {
                      width: avatarInnerSize,
                      height: avatarInnerSize,
                      borderRadius: avatarInnerSize / 2,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: resolveStaticUrl(user.avatar_url) }}
                    style={styles.avatarPhotoFill}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <Image
                  source={require('../assets/images/ui/profile/avatar_silhouette.png')}
                  style={{
                    width: avatarSilhouetteWidth,
                    height: avatarSilhouetteHeight,
                  }}
                  resizeMode="contain"
                />
              )}
              <Image
                source={require('../assets/images/ui/profile/avatar_ring.png')}
                style={styles.avatarRing}
                resizeMode="contain"
              />
              {avatarUploading ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator color={COLORS.accent.gold} size="small" />
                </View>
              ) : null}
            </Pressable>
            <Text
              style={[
                styles.username,
                { fontSize: usernameSize, lineHeight: Math.round(usernameSize * 1.05) },
                isDesktop && styles.usernameDesktop,
              ]}
            >
              {displayName}
            </Text>
            {user?.email && (
              <Text style={styles.emailText}>{user.email}</Text>
            )}
            {!isDesktop ? (
              <Image
                source={require('../assets/images/ui/profile/emblem_cccp_wings.png')}
                style={[styles.emblem, { width: emblemWidth, height: emblemHeight }]}
                resizeMode="contain"
              />
            ) : null}
          </View>

          <View style={styles.cardsColumn}>
          <View style={[styles.infoRow, { width: infoRowWidth, marginBottom: sectionGap }]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openProtectedRoute('/vip/shop')}
              accessibilityRole="button"
            >
            <InfoCard
              width={infoCardWidth}
              height={infoCardHeight}
              styles={styles}
              innerStyle={[
                infoCardPad,
                isDesktop ? styles.infoCardInnerDesktop : styles.infoCardInnerMobile,
              ]}
            >
                <View style={[styles.vipCardMobile, isDesktop && styles.vipCardDesktop, !isDesktop && { padding: INFO_CARD_MOBILE_PAD }]}>
                  <View style={[styles.vipTopRow, !isDesktop && styles.infoSideRowMobile]}>
                    <Image
                      source={require('../assets/images/ui/profile/icon_crown.png')}
                      style={[
                        styles.infoIconSide,
                        isDesktop && styles.infoIconSideDesktop,
                        profileIconSize,
                        isDesktop && styles.infoIconDesktop,
                      ]}
                      resizeMode="contain"
                    />
                    <View style={[styles.vipTextCol, styles.infoTextColShrink]}>
                      <InfoCardText
                        style={[styles.infoLabel, styles.infoLabelCentered, isDesktop && styles.infoLabelDesktop, { fontSize: infoLabelSize }]}
                        lines={2}
                      >
                        {t('profile.vip')}
                      </InfoCardText>
                      <View style={[styles.memberRow, { minHeight: memberRibbonSize.height, width: '100%' }]}>
                        <Image
                          source={require('../assets/images/ui/profile/ribbon_member.png')}
                          style={[styles.memberRibbon, memberRibbonSize]}
                          resizeMode="stretch"
                        />
                        <InfoCardText
                          style={[styles.memberText, { fontSize: infoMemberTextSize }]}
                          minScale={0.65}
                        >
                          {vipPlanLabel}
                        </InfoCardText>
                      </View>
                      {isDesktop && vipIsActive ? (
                        <Image
                          source={require('../assets/images/ui/profile/stars_rating.png')}
                          style={[
                            styles.starsRating,
                            starsSize,
                            !vipIsActive && styles.starsInactive,
                          ]}
                          resizeMode="contain"
                        />
                      ) : null}
                      {vipExpires ? (
                        <InfoCardText style={[styles.vipExpiryHint, { fontSize: hintFontSize }]} lines={2} minScale={0.75}>
                          {t('vip.shop.expires')}: {vipExpires.slice(0, 10)}
                        </InfoCardText>
                      ) : (
                        <InfoCardText style={[styles.vipExpiryHint, { fontSize: hintFontSize }]} lines={2} minScale={0.75}>
                          {t('vip.profile.tapToUpgrade')}
                        </InfoCardText>
                      )}
                    </View>
                  </View>
                </View>
            </InfoCard>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openProtectedRoute('/vip/shop')}
              accessibilityRole="button"
            >
            <InfoCard
              width={infoCardWidth}
              height={infoCardHeight}
              styles={styles}
              innerStyle={[
                infoCardPad,
                isDesktop ? styles.infoCardInnerDesktop : styles.infoCardInnerMobile,
              ]}
            >
                <View style={[styles.quotaCardInner, !isDesktop && { padding: INFO_CARD_MOBILE_PAD }]}>
                  <InfoCardText
                    style={[styles.infoLabel, styles.infoLabelCentered, isDesktop && styles.infoLabelDesktop, { fontSize: infoLabelSize }]}
                    lines={2}
                  >
                    {t('profile.quotaTitle')}
                  </InfoCardText>
                  <View style={styles.quotaRows}>
                    <InfoCardText
                      style={[styles.quotaLine, { fontSize: quotaLineSize, lineHeight: quotaLineSize + 3 }]}
                      minScale={0.7}
                    >
                      {t('profile.chatQuotaShort')}: {chatQuotaLabel}
                    </InfoCardText>
                    <InfoCardText
                      style={[styles.quotaLine, { fontSize: quotaLineSize, lineHeight: quotaLineSize + 3 }]}
                      minScale={0.7}
                    >
                      {t('profile.voiceQuota')}: {voiceQuotaLabel}
                    </InfoCardText>
                  </View>
                  {!chatQuota?.unlimited ? (
                    <InfoCardText style={[styles.vipExpiryHint, { fontSize: hintFontSize }]} lines={2} minScale={0.75}>
                      {t('profile.chatQuotaToday')}
                    </InfoCardText>
                  ) : null}
                  {voiceQuota?.enabled && !voiceQuota.unlimited ? (
                    <InfoCardText style={[styles.vipExpiryHint, { fontSize: hintFontSize }]} lines={2} minScale={0.75}>
                      {t('profile.voiceQuotaToday')}
                    </InfoCardText>
                  ) : null}
                </View>
            </InfoCard>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => openProtectedRoute('/points/shop')}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={{ width: infoRowWidth, marginBottom: sectionGap }}
          >
            <InfoCard
              width={infoRowWidth}
              height={pointsCardHeight}
              styles={styles}
              innerStyle={[
                infoCardPad,
                isDesktop ? styles.infoCardInnerDesktop : styles.infoCardInnerMobile,
              ]}
            >
              <View style={[styles.pointsCardMobile, !isDesktop && { padding: INFO_CARD_MOBILE_PAD }]}>
                <View style={[styles.pointsTopRow, !isDesktop && styles.infoSideRowMobile]}>
                  <Image
                    source={require('../assets/images/ui/profile/icon_points_star.png')}
                    style={[
                      styles.infoIconSide,
                      isDesktop && styles.infoIconSideDesktop,
                      profileIconSize,
                      isDesktop && styles.infoIconDesktop,
                    ]}
                    resizeMode="contain"
                  />
                  <View style={[styles.pointsTextCol, styles.infoTextColShrink]}>
                    <InfoCardText
                      style={[styles.infoLabel, styles.infoLabelCentered, isDesktop && styles.infoLabelDesktop, { fontSize: infoLabelSize }]}
                      lines={2}
                    >
                      {t('profile.points')}
                    </InfoCardText>
                    <InfoCardText
                      style={[
                        styles.pointsValue,
                        styles.infoLabelCentered,
                        isDesktop && styles.pointsValueDesktop,
                        { fontSize: pointsValueSize, lineHeight: pointsValueSize + 4 },
                      ]}
                      minScale={0.75}
                    >
                      {pointsValue}
                    </InfoCardText>
                    <InfoCardText style={[styles.vipExpiryHint, { fontSize: hintFontSize }]} lines={2} minScale={0.72}>
                      {t('profile.pointsHint')}
                    </InfoCardText>
                  </View>
                </View>
              </View>
            </InfoCard>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openProtectedRoute('/soul/wallet')}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[
              styles.settingsButton,
              { width: cardWidth, height: settingsHeight, marginBottom: sectionGap },
            ]}
          >
            <ImageBackground
              source={require('../assets/images/ui/profile/button_settings_bg.png')}
              style={styles.settingsBg}
              imageStyle={styles.stretchImage}
              resizeMode="stretch"
              capInsets={
                isDesktop
                  ? { left: 32, top: 20, right: 32, bottom: 20 }
                  : SETTINGS_CAP
              }
            >
              <View
                style={[
                  styles.settingsBody,
                  isDesktop
                    ? { paddingLeft: profileIconColumnLeft, paddingRight: profileInnerPadX }
                    : { paddingLeft: profileIconColumnLeft, paddingRight: profileIconColumnLeft },
                ]}
              >
                <View style={[styles.settingsRow, isDesktop && styles.settingsRowDesktop, !isDesktop && styles.settingsRowMobile]}>
                  <View style={[styles.settingsLeft, !isDesktop && styles.settingsLeftMobile]}>
                    <Ionicons
                      name="wallet-outline"
                      size={profileIconSize.width}
                      color={GOLD_MUTED}
                      style={styles.settingsGear}
                    />
                    <InfoCardText
                      style={[styles.settingsLabel, { fontSize: settingsLabelSize }]}
                      minScale={0.65}
                    >
                      {t('profile.wallet')}
                    </InfoCardText>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void handleInvitePress()}
            activeOpacity={0.85}
            disabled={inviteCopying}
            accessibilityRole="button"
            style={[
              styles.settingsButton,
              { width: cardWidth, height: settingsHeight, marginBottom: sectionGap },
              inviteCopying && styles.settingsButtonDisabled,
            ]}
          >
            <ImageBackground
              source={require('../assets/images/ui/profile/button_settings_bg.png')}
              style={styles.settingsBg}
              imageStyle={styles.stretchImage}
              resizeMode="stretch"
              capInsets={
                isDesktop
                  ? { left: 32, top: 20, right: 32, bottom: 20 }
                  : SETTINGS_CAP
              }
            >
              <View
                style={[
                  styles.settingsBody,
                  isDesktop
                    ? { paddingLeft: profileIconColumnLeft, paddingRight: profileInnerPadX }
                    : { paddingLeft: profileIconColumnLeft, paddingRight: profileIconColumnLeft },
                ]}
              >
                <View style={[styles.settingsRow, isDesktop && styles.settingsRowDesktop, !isDesktop && styles.settingsRowMobile]}>
                  <View style={[styles.settingsLeft, !isDesktop && styles.settingsLeftMobile]}>
                    {inviteCopying ? (
                      <ActivityIndicator
                        color={COLORS.accent.gold}
                        style={[styles.settingsGear, profileIconSize]}
                      />
                    ) : (
                      <Ionicons
                        name="share-outline"
                        size={profileIconSize.width}
                        color={GOLD_MUTED}
                        style={styles.settingsGear}
                      />
                    )}
                    <InfoCardText
                      style={[styles.settingsLabel, { fontSize: settingsLabelSize }]}
                      minScale={0.65}
                    >
                      {t('referral.title')}
                    </InfoCardText>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openProtectedRoute('/settings')}
            activeOpacity={0.85}
            style={[
              styles.settingsButton,
              { width: cardWidth, height: settingsHeight, marginBottom: sectionGap },
            ]}
          >
            <ImageBackground
              source={require('../assets/images/ui/profile/button_settings_bg.png')}
              style={styles.settingsBg}
              imageStyle={styles.stretchImage}
              resizeMode="stretch"
              capInsets={
                isDesktop
                  ? { left: 32, top: 20, right: 32, bottom: 20 }
                  : SETTINGS_CAP
              }
            >
              <View
                style={[
                  styles.settingsBody,
                  isDesktop
                    ? { paddingLeft: profileIconColumnLeft, paddingRight: profileInnerPadX }
                    : { marginRight: settingsCapWidth, paddingLeft: profileIconColumnLeft },
                ]}
              >
                <View style={[styles.settingsRow, isDesktop && styles.settingsRowDesktop, !isDesktop && styles.settingsRowMobile]}>
                  <View style={[styles.settingsLeft, !isDesktop && styles.settingsLeftMobile]}>
                    <Image
                      source={require('../assets/images/ui/profile/icon_settings_gear.png')}
                      style={[styles.settingsGear, profileIconSize]}
                      resizeMode="contain"
                    />
                    <InfoCardText
                      style={[styles.settingsLabel, { fontSize: settingsLabelSize }]}
                      minScale={0.65}
                    >
                      {t('menu.settings')}
                    </InfoCardText>
                  </View>
                  {isDesktop ? (
                    <Image
                      source={require('../assets/images/ui/profile/icon_chevron.png')}
                      style={styles.settingsChevronDesktop}
                      resizeMode="contain"
                    />
                  ) : null}
                </View>
              </View>
              {!isDesktop ? (
              <View style={[styles.settingsCap, { width: settingsCapWidth }]}>
                <Image
                  source={require('../assets/images/ui/profile/button_settings_cap.png')}
                  style={styles.settingsCapBg}
                  resizeMode="stretch"
                />
                <Image
                  source={require('../assets/images/ui/profile/icon_chevron.png')}
                  style={styles.settingsChevron}
                  resizeMode="contain"
                />
              </View>
              ) : null}
            </ImageBackground>
          </TouchableOpacity>

          <ImageBackground
            source={require('../assets/images/ui/profile/card_stats_bg.png')}
            style={[
              styles.statsCard,
              { width: cardWidth, minHeight: statsCardHeight },
            ]}
            imageStyle={styles.stretchImage}
            resizeMode="stretch"
            capInsets={CARD_STATS_CAP}
          >
            <View style={[styles.statsInner, statsPad]}>
              {isDesktop ? (
                <View style={[styles.statsTitleRowDesktop, statsTitlePad]}>
                  <DividerStar color={RED_ACCENT} size={statsStarSize} />
                  <Text style={[styles.statsTitle, styles.statsTitleDesktop, { fontSize: statsTitleSize }]}>
                    {t('profile.stats')}
                  </Text>
                  <DividerStar color={RED_ACCENT} size={statsStarSize} />
                </View>
              ) : (
                <>
                  <Text style={[styles.statsTitle, statsTitlePad, { fontSize: statsTitleSize }]}>
                    {t('profile.stats')}
                  </Text>

                  <View style={styles.statsHeaderDivider}>
                    <View style={styles.statsDividerLine} />
                    <DividerStar color={RED_ACCENT} size={statsStarSize} />
                    <View style={styles.statsDividerLine} />
                  </View>
                </>
              )}

              <View style={[styles.statRow, isDesktop && styles.statRowDesktop, statsRowPad]}>
                {isDesktop ? (
                  <>
                    <View style={styles.statRowHalfLeftDesktop}>
                      <Image
                        source={require('../assets/images/ui/profile/icon_scene_reel.png')}
                        style={profileIconSize}
                        resizeMode="contain"
                      />
                      <Text style={[styles.statRowLabel, styles.statRowLabelDesktop, { fontSize: statsLabelSize }]}>
                        {t('profile.sceneLabel')}:
                      </Text>
                    </View>
                    <View style={styles.statRowHalfRightDesktop}>
                      <Text style={[styles.statRowValue, styles.statRowValueDesktop, { fontSize: statsValueSize }]}>
                        <Text style={[styles.statValueAccent, { fontSize: statsValueSize }]}>
                          {sceneValue}
                        </Text>
                        <Text style={[styles.statValueMuted, { fontSize: statsValueSize }]}>
                          {' · '}
                          {t('index.title').toUpperCase()}
                        </Text>
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Image
                      source={require('../assets/images/ui/profile/icon_scene_reel.png')}
                      style={profileIconSize}
                      resizeMode="contain"
                    />
                    <View style={styles.statTextCol}>
                      <Text style={[styles.statRowLabel, { fontSize: statsLabelSize }]}>
                        {t('profile.sceneLabel')}:
                      </Text>
                      <Text style={[styles.statRowValue, { fontSize: statsValueSize }]}>
                        <Text style={[styles.statValueAccent, { fontSize: statsValueSize }]}>
                          {sceneValue}
                        </Text>
                        <Text style={[styles.statValueMuted, { fontSize: statsValueSize }]}>
                          {' · '}
                          {t('index.title').toUpperCase()}
                        </Text>
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <View style={[styles.statsRowDivider, isDesktop && styles.statsRowDividerDesktop, statsRowPad]} />

              <View style={[styles.statRow, isDesktop && styles.statRowDesktop, styles.statRowLast, isDesktop && styles.statRowLastDesktop, statsRowPad]}>
                {isDesktop ? (
                  <>
                    <View style={styles.statRowHalfLeftDesktop}>
                      <Image
                        source={require('../assets/images/ui/profile/icon_achievement_medal.png')}
                        style={profileIconSize}
                        resizeMode="contain"
                      />
                      <Text style={[styles.statRowLabel, styles.statRowLabelDesktop, { fontSize: statsLabelSize }]}>
                        {t('profile.achievements')}:
                      </Text>
                    </View>
                    <View style={styles.statRowHalfRightDesktop}>
                      <Text style={[styles.statRowValue, styles.statRowValueDesktop, { fontSize: statsValueSize }]}>
                        <Text style={[styles.statValueAccent, { fontSize: statsValueSize }]}>{achievementsCurrent}</Text>
                        <Text style={[styles.statValueMuted, { fontSize: statsValueSize }]}> / {achievementsTotal}</Text>
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Image
                      source={require('../assets/images/ui/profile/icon_achievement_medal.png')}
                      style={profileIconSize}
                      resizeMode="contain"
                    />
                    <View style={styles.statTextCol}>
                      <Text style={[styles.statRowLabel, { fontSize: statsLabelSize }]}>
                        {t('profile.achievements')}:
                      </Text>
                      <Text style={[styles.statRowValue, { fontSize: statsValueSize }]}>
                        <Text style={[styles.statValueAccent, { fontSize: statsValueSize }]}>{achievementsCurrent}</Text>
                        <Text style={[styles.statValueMuted, { fontSize: statsValueSize }]}> / {achievementsTotal}</Text>
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </ImageBackground>
          </View>

          {!isDesktop ? (
            <>
              <Text style={[styles.footer, { marginTop: footerMarginTop }]}>{t('home.ministryFooterCyrillic')}</Text>
              <SocialLinks style={styles.socialLinks} />
            </>
          ) : null}
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
      <ProfileSupportFab tone="soviet" />
    </ShellLayout>
  );
}

const GOLD = '#c9a86c';
const GOLD_MUTED = '#a8894f';
const RED_ACCENT = '#9e1b1b';
const RED_DIVIDER = '#7a1818';
/** PC stats row separator — muted dark bronze per UI/pc/个人中心.jpg */
const STATS_ROW_DIVIDER_DESKTOP = 'rgba(201, 168, 108, 0.22)';

function createStyles(lang: Lang) {
  return StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bg.primary,
  },
  pageDesktop: {
    backgroundColor: 'transparent',
  },
  pageMobile: {
    overflow: 'visible',
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  contentDesktop: {
    flexGrow: 0,
    justifyContent: 'flex-start',
  },
  contentMobile: {
    flexGrow: 0,
    justifyContent: 'flex-start',
  },
  cardsColumn: {
    width: '100%',
    alignItems: 'center',
  },
  stretchImage: {
    width: '100%',
    height: '100%',
  },
  header: {
    alignItems: 'center',
    width: '100%',
  },
  headerDesktop: {
    minHeight: 0,
    width: '100%',
  },
  desktopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  desktopTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: RED_DIVIDER,
    opacity: 0.85,
  },
  headerTitle: {
    color: GOLD,
    fontSize: 34,
    letterSpacing: 2,
    textTransform: 'uppercase',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  identity: {
    alignItems: 'center',
    marginTop: 2,
  },
  identityDesktop: {},
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  avatarPhotoClip: {
    overflow: 'hidden',
  },
  avatarPhotoFill: {
    width: '100%',
    height: '100%',
  },
  avatarRing: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  avatarLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 2,
  },
  username: Typo(
    {
      color: GOLD,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    'display', lang
  ),
  usernameDesktop: {
    marginBottom: 0,
    letterSpacing: 2.5,
  },
  emailText: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 12,
      marginTop: 4,
      letterSpacing: 0.3,
    },
    'sans', lang
  ),
  errorText: Typo(
    {
      color: COLORS.soviet.embroidery,
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
    },
    'sans', lang
  ),
  emblem: {
    alignSelf: 'center',
    opacity: 0.98,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  infoCardInner: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  infoCardInnerMobile: {
    justifyContent: 'center',
  },
  infoCardInnerDesktop: {
    justifyContent: 'center',
  },
  vipCardMobile: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipCardDesktop: {
    gap: 0,
  },
  vipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  vipTextCol: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  infoSideRowMobile: {
    gap: 4,
    paddingHorizontal: 2,
  },
  infoIconSide: {
    flexShrink: 0,
    alignSelf: 'center',
    marginLeft: 20,
  },
  infoIconSideDesktop: {
    marginLeft: 15,
  },
  pointsCardMobile: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaCardInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pointsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  pointsTextCol: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  infoTextColShrink: {
    flexShrink: 1,
  },
  quotaRows: {
    alignSelf: 'stretch',
    gap: 2,
    marginTop: 2,
    width: '100%',
  },
  quotaLine: Typo(
    {
      color: RED_ACCENT,
      letterSpacing: 0.4,
      textAlign: 'center',
      alignSelf: 'center',
      maxWidth: '100%',
    },
    'sans', lang
  ),
  vipLabelGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    marginBottom: 2,
  },
  infoIconDesktop: {
    marginBottom: 4,
  },
  infoLabel: Typo(
    {
      color: GOLD,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 0,
      lineHeight: 18,
    },
    'display', lang
  ),
  infoLabelDesktop: {
    marginBottom: 2,
  },
  infoLabelCentered: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  memberRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    marginTop: 1,
  },
  memberRibbon: {
    position: 'absolute',
  },
  memberText: Typo(
    {
      color: '#f4f4f5',
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      zIndex: 1,
    },
    'sans', lang
  ),
  starsRating: {
    marginTop: 0,
    alignSelf: 'center',
  },
  starsInactive: {
    opacity: 0.35,
  },
  vipExpiryHint: Typo(
    {
      color: COLORS.text.muted,
      fontSize: 8,
      marginTop: 1,
      textAlign: 'center',
      maxWidth: '100%',
      alignSelf: 'center',
    },
    'sans', lang
  ),
  pointsValue: Typo(
    {
      color: RED_ACCENT,
      letterSpacing: 0.8,
      lineHeight: 25,
      marginTop: 0,
    },
    'display', lang
  ),
  pointsValueDesktop: {
    marginTop: 0,
    lineHeight: 32,
  },
  settingsButton: {
    overflow: 'hidden',
  },
  settingsButtonDisabled: {
    opacity: 0.7,
  },
  settingsBg: {
    flex: 1,
    overflow: 'hidden',
  },
  settingsBody: {
    flex: 1,
    justifyContent: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  settingsRowDesktop: {
    justifyContent: 'space-between',
    width: '100%',
  },
  settingsRowMobile: {
    width: '100%',
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsLeftMobile: {
    flex: 1,
    minWidth: 0,
  },
  settingsGear: {
    marginRight: 8,
    flexShrink: 0,
  },
  settingsLabel: Typo(
    {
      color: GOLD_MUTED,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      flexShrink: 1,
      minWidth: 0,
    },
    'display', lang
  ),
  settingsCap: {
    position: 'absolute',
    right: 3,
    top: '6%',
    bottom: '6%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsCapBg: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  settingsChevron: {
    width: 18,
    height: 22,
    zIndex: 1,
  },
  settingsChevronDesktop: {
    width: 16,
    height: 20,
    opacity: 0.85,
  },
  statsCard: {
    marginBottom: 4,
    alignSelf: 'center',
  },
  statsInner: {
    width: '100%',
  },
  statsTitle: Typo(
    {
      color: GOLD_MUTED,
      letterSpacing: 2,
      textTransform: 'uppercase',
      textAlign: 'center',
      marginBottom: 6,
    },
    'display', lang
  ),
  statsTitleRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  statsTitleDesktop: {
    flex: 1,
    marginBottom: 0,
    color: RED_ACCENT,
  },
  statsHeaderDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  statsDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: RED_DIVIDER,
    opacity: 0.9,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  statRowDesktop: {
    paddingTop: 10,
    paddingBottom: 10,
    width: '100%',
  },
  statRowHalfLeftDesktop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  statRowHalfRightDesktop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  statRowLast: {
    paddingTop: 8,
    paddingBottom: 0,
  },
  statRowLastDesktop: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  statTextCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    marginLeft: 20,
  },
  statRowLabelDesktop: {
    marginLeft: 12,
    flexShrink: 1,
  },
  statRowValueDesktop: {
    textAlign: 'left',
  },
  statRowLabel: Typo(
    {
      color: GOLD_MUTED,
      letterSpacing: 0.4,
    },
    'sans', lang
  ),
  statRowValue: Typo(
    {
      letterSpacing: 0.5,
    },
    'sans', lang
  ),
  statValueAccent: Typo(
    {
      color: RED_ACCENT,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    'mono', lang
  ),
  statValueMuted: Typo(
    {
      color: GOLD_MUTED,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    'sans', lang
  ),
  statsRowDivider: {
    height: 1,
    backgroundColor: RED_DIVIDER,
    opacity: 0.85,
    marginVertical: 0,
  },
  statsRowDividerDesktop: {
    backgroundColor: STATS_ROW_DIVIDER_DESKTOP,
    opacity: 1,
  },
  footer: Typo(
    {
      textAlign: 'center',
      color: 'rgba(216, 208, 192, 0.28)',
      fontSize: 10,
      letterSpacing: 3,
      textTransform: 'uppercase',
    },
    'mono', lang
  ),
  socialLinks: {
    marginTop: 10,
    marginBottom: 4,
  },
});
};
