import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemePage } from '../src/theme/useThemePage';
import { ModernSettings } from '../src/pages/modern/Settings';
import { DefaultSettings } from '../src/pages/default/Settings';
import { ShellLayout } from '../src/components/shell/ShellLayout';
import { PageBackground } from '../src/components/ui/PageBackground';
import { DividerStar } from '../src/components/ui/DividerStar';
import { SettingRow, rowHeightForWidth, rowInnerHeightForWidth } from '../src/components/settings/SettingRow';
import { ContentTierToggle, toggleSizeForRow } from '../src/components/settings/ContentTierToggle';
import { MatureConfirmModal } from '../src/components/settings/MatureConfirmModal';
import { ResetPasswordModal } from '../src/components/settings/ResetPasswordModal';
import { BindEmailModal } from '../src/components/settings/BindEmailModal';
import { GeneralConfirmModal } from '../src/components/ui/GeneralConfirmModal';
import { useI18n } from '../src/i18n/I18nContext';
import { langDisplayName, LANG_LABELS } from '../src/i18n/langs';
import type { Lang } from '../src/i18n/types';
import { LangPickerModal } from '../src/components/common/LangPickerModal';
import { ThemePickerModal } from '../src/components/settings/ThemePickerModal';
import { GenderPickerModal } from '../src/components/settings/GenderPickerModal';
import { loadMatureSettings, saveMatureSettings } from '../src/engine/flagStore';
import { setLocalMatureOptIn } from '../src/utils/matureOptIn';
import { updateUser, scheduleAccountDeletion, cancelAccountDeletion } from '../src/api/user';
import { ApiError } from '../src/api/client';
import { useIsDesktop } from '../src/hooks/useIsDesktop';
import { useMobileSafeAreaPadding } from '../src/hooks/useMobileSafeAreaPadding';
import { useAuthStore } from '../src/stores/authStore';
import { SIDEBAR_WIDTH } from '../src/constants/layout';
import { COLORS } from '../src/theme/colors';
import { useTheme } from '../src/theme/useTheme';
import type { ThemeId } from '../src/theme/system/types';
import { Typo } from '../src/theme/typography';
import { formatUserGenderDisplay } from '../src/utils/userGender';
import { formatDeletionScheduledDate } from '../src/utils/accountDeletion';
import { accountEmailDisplay, isAccountEmailBound } from '../src/utils/accountEmail';
import type { UserGender } from '../src/types/api';

const HEADER_TITLE_SRC = { width: 696, height: 126 };
const DESKTOP_CONTENT_MAX = 920;
const DESKTOP_ROW_WIDTH_RATIO = 0.94;
const MOBILE_ROW_WIDTH_RATIO = 0.92;
const BOTTOM_NAV_INSET = 90;
import { PRIMARY_SCENE_ID } from '../src/constants/scene';
import { notifyError, notifySuccess, notifyWarning } from '../src/utils/notify';

function scaleLayout(value: number, scale: number): number {
  return Math.max(1, Math.round(value * scale));
}

export default function Settings() {
  const ThemedPage = useThemePage({ modern: ModernSettings, default: DefaultSettings });
  if (ThemedPage) return <ThemedPage />;
  return <SovietSettings />;
}

function SovietSettings() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bindEmail?: string }>();
  const { lang, setLang, t, tp } = useI18n();
  const isDesktop = useIsDesktop();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const updateUserLang = useAuthStore((s) => s.updateUserLang);
  const logout = useAuthStore((s) => s.logout);
  const { themeId, setThemeId } = useTheme();
  const isDevUser = user?.is_dev === true;
  const showThemeSwitch = isDevUser;

  const [matureEnabled, setMatureEnabled] = useState(false);
  const [confirmMature, setConfirmMature] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [pendingLang, setPendingLang] = useState<Lang | null>(null);
  const [confirmLangChange, setConfirmLangChange] = useState(false);
  const [savingLang, setSavingLang] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmCancelDeletion, setConfirmCancelDeletion] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [bindEmailOpen, setBindEmailOpen] = useState(false);
  const emailBound = isAccountEmailBound(user);
  const [genderPickerOpen, setGenderPickerOpen] = useState(false);
  const [savingGender, setSavingGender] = useState(false);
  const [genderMessage, setGenderMessage] = useState<string | null>(null);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const { paddingTop: safeTop, paddingBottom: safeBottom } = useMobileSafeAreaPadding();

  const layout = useMemo(() => {
    const contentWidth = isDesktop
      ? Math.min(DESKTOP_CONTENT_MAX, Math.max(windowWidth - SIDEBAR_WIDTH - 96, 520))
      : Math.max(Math.min(windowWidth, 520) - 32, 280);
    const rowWidth = Math.round(contentWidth * (isDesktop ? DESKTOP_ROW_WIDTH_RATIO : MOBILE_ROW_WIDTH_RATIO));
    const rowHeight = rowHeightForWidth(rowWidth, false);
    const rowHeightDanger = rowHeightForWidth(rowWidth, true);
    const rowInnerHeight = rowInnerHeightForWidth(rowWidth, false);
    const toggleMaxWidth = Math.round(rowWidth * 0.44);
    const toggleSize = toggleSizeForRow(toggleMaxWidth, rowInnerHeight);
    const headerTitleWidth = Math.min(rowWidth * 0.72, 520);
    const headerTitleHeight = Math.round(
      (headerTitleWidth * HEADER_TITLE_SRC.height) / HEADER_TITLE_SRC.width,
    );
    const metaSize = isDesktop ? 11 : 10;
    const footerEmblemWidth = Math.round(rowWidth * 0.22);
    const footerEmblemHeight = Math.round(footerEmblemWidth * 0.39);
    const langValueSize = Math.round(rowInnerHeight * 0.22);
    const chevronSize = Math.round(rowInnerHeight * 0.34);
    const dangerIconSize = Math.round(rowInnerHeightForWidth(rowWidth, true) * 0.78);

    const contentPadTopBase = 40 + (isDesktop ? 0 : safeTop);
    const pagePadBottomBase = isDesktop ? 56 : 100;
    const metaMarginBottomBase = 18;
    const headerMarginBottomBase = isDesktop ? 36 : 28;
    const rowGapBase = 14;
    const footerMarginTopBase = 48;
    const metaRowHeight = isDesktop
      ? metaMarginBottomBase + 4 * Math.round(metaSize * 1.4) + 2 * 3
      : 0;
    const headerHeight = isDesktop
      ? 18 + 2 + 8 + headerTitleHeight + 18 + 14 + headerMarginBottomBase
      : 16 + 6 + 30 + 10 + 14 + headerMarginBottomBase;
    const rowCount = showThemeSwitch ? 5 : 4;
    const rowsHeight = rowHeight * rowCount + rowHeightDanger + rowGapBase * rowCount;
    const feedbackHeight = isDesktop ? 0 : 30;
    const footerHeight = isDesktop ? footerMarginTopBase + footerEmblemHeight : 0;
    const naturalHeight =
      contentPadTopBase +
      metaRowHeight +
      headerHeight +
      rowsHeight +
      feedbackHeight +
      footerHeight +
      pagePadBottomBase;

    const bottomInset = isDesktop ? 0 : BOTTOM_NAV_INSET + safeBottom;
    const availableHeight = windowHeight - bottomInset;
    const layoutScale =
      naturalHeight <= availableHeight
        ? 1
        : Math.min(1, (availableHeight * 0.98) / Math.max(naturalHeight, 1));
    const s = (value: number) => scaleLayout(value, layoutScale);

    return {
      viewportHeight: availableHeight,
      contentWidth: s(contentWidth),
      rowWidth: s(rowWidth),
      rowHeight: s(rowHeight),
      rowHeightDanger: s(rowHeightDanger),
      rowInnerHeight: s(rowInnerHeight),
      toggleMaxWidth: s(toggleMaxWidth),
      toggleWidth: s(toggleSize.width),
      toggleHeight: s(toggleSize.height),
      headerTitleWidth: s(headerTitleWidth),
      headerTitleHeight: s(headerTitleHeight),
      metaSize: s(metaSize),
      footerEmblemWidth: s(footerEmblemWidth),
      footerEmblemHeight: s(footerEmblemHeight),
      langValueSize: s(langValueSize),
      chevronSize: s(chevronSize),
      dangerIconSize: s(dangerIconSize),
      contentPadTop: s(contentPadTopBase),
      pagePadBottom: s(pagePadBottomBase),
      metaMarginBottom: s(metaMarginBottomBase),
      headerMarginBottom: s(headerMarginBottomBase),
      rowGap: s(rowGapBase),
      footerMarginTop: s(footerMarginTopBase),
      headerStarSize: s(18),
      headerStarMobileSize: s(16),
      headerTitleMarginTop: s(8),
      desktopTitleRowMarginTop: s(18),
      dividerStarSize: s(14),
      mobileTitleFontSize: s(30),
      headerDividerHeight: s(14),
      mobileTitleMarginBottom: s(10),
      headerStarMobileMarginBottom: s(6),
    };
  }, [isDesktop, windowWidth, windowHeight, showThemeSwitch, safeTop, safeBottom]);

  useEffect(() => {
    let mounted = true;
    async function loadTier() {
      if (Platform.OS === 'ios') {
        setLocalMatureOptIn(false);
        if (mounted) setMatureEnabled(false);
        await saveMatureSettings(PRIMARY_SCENE_ID, false, true);
        return;
      }
      if (isLoggedIn && user?.content_tier) {
        const enabled = user.content_tier === 'mature';
        if (mounted) setMatureEnabled(enabled);
        await saveMatureSettings(PRIMARY_SCENE_ID, enabled, true);
        setLocalMatureOptIn(enabled);
        return;
      }
      const settings = await loadMatureSettings(PRIMARY_SCENE_ID);
      if (mounted) setMatureEnabled(settings.enabled);
      setLocalMatureOptIn(settings.enabled);
    }
    void loadTier();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user?.content_tier]);

  useEffect(() => {
    if (params.bindEmail === '1' && isLoggedIn) {
      setBindEmailOpen(true);
    }
  }, [params.bindEmail, isLoggedIn]);

  const syncContentTier = useCallback(
    async (mature: boolean) => {
      if (Platform.OS === 'ios') {
        setLocalMatureOptIn(false);
        setMatureEnabled(false);
        return;
      }
      await saveMatureSettings(PRIMARY_SCENE_ID, mature, true);
      setLocalMatureOptIn(mature);
      setMatureEnabled(mature);
      if (!isLoggedIn) return;
      try {
        const updated = await updateUser({ content_tier: mature ? 'mature' : 'standard' });
        useAuthStore.setState({ user: updated });
      } catch (err) {
        const fallback = t('settings.saveFailed');
        if (err instanceof ApiError && err.code === 'VIP_010') {
          notifyWarning(t('settings.matureVipRequired'));
        } else {
          notifyError(fallback);
        }
        await saveMatureSettings(PRIMARY_SCENE_ID, false, true);
        setLocalMatureOptIn(false);
        setMatureEnabled(false);
        throw err;
      }
    },
    [isLoggedIn, lang, t],
  );

  const selectLanguage = useCallback(
    async (next: Lang) => {
      if (next === lang || savingLang) return;
      setLang(next);

      if (!isLoggedIn) return;

      setSavingLang(true);
      try {
        await updateUserLang(next);
      } catch {
        notifyError(t('settings.saveFailed'));
      } finally {
        setSavingLang(false);
      }
    },
    [isLoggedIn, lang, savingLang, setLang, t, updateUserLang],
  );

  const openLanguagePicker = () => {
    if (savingLang) return;
    setLangPickerOpen(true);
  };

  const onPickLanguage = (next: Lang) => {
    setLangPickerOpen(false);
    if (next === lang || savingLang) return;
    setPendingLang(next);
    setConfirmLangChange(true);
  };

  const confirmLanguageChange = async () => {
    if (!pendingLang) return;
    const next = pendingLang;
    setConfirmLangChange(false);
    setPendingLang(null);
    await selectLanguage(next);
  };

  const cancelLanguageChange = () => {
    setConfirmLangChange(false);
    setPendingLang(null);
  };

  const selectStandard = async () => {
    try {
      await syncContentTier(false);
      setConfirmMature(false);
    } catch {
      /* error message set in syncContentTier */
    }
  };

  const requestMature = () => {
    if (!matureEnabled) {
      if (isLoggedIn && user?.vip && !user.vip.permissions.mature_mode) {
        notifyWarning(t('settings.matureVipRequired'));
        return;
      }
      setConfirmMature(true);
    }
  };

  const confirmMatureSelection = async () => {
    try {
      await syncContentTier(true);
      setConfirmMature(false);
    } catch {
      setConfirmMature(false);
    }
  };

  const handleLogout = () => {
    setConfirmLogout(true);
  };

  const confirmLogoutAction = async () => {
    setConfirmLogout(false);
    setClearing(true);
    try {
      logout();
      router.replace('/');
    } finally {
      setClearing(false);
    }
  };

  const deletionPending = Boolean(user?.deletion_scheduled_at);
  const deletionDateLabel = formatDeletionScheduledDate(user?.deletion_scheduled_at, lang);

  const confirmScheduleDeletion = async () => {
    if (deletionBusy) return;
    setDeletionBusy(true);
    try {
      const updated = await scheduleAccountDeletion();
      useAuthStore.setState({ user: updated });
      setConfirmDeleteAccount(false);
      notifySuccess(t('settings.deleteAccountScheduledToast'));
    } catch (err) {
      notifyError(err instanceof ApiError ? err.message : t('settings.saveFailed'));
    } finally {
      setDeletionBusy(false);
    }
  };

  const confirmCancelDeletionAction = async () => {
    if (deletionBusy) return;
    setDeletionBusy(true);
    try {
      const updated = await cancelAccountDeletion();
      useAuthStore.setState({ user: updated });
      setConfirmCancelDeletion(false);
      notifySuccess(t('settings.deleteAccountCancelledToast'));
    } catch (err) {
      notifyError(err instanceof ApiError ? err.message : t('settings.saveFailed'));
    } finally {
      setDeletionBusy(false);
    }
  };

  const langDisplay = langDisplayName(lang);
  const genderDisplay = formatUserGenderDisplay(user, t);
  const themeDisplay = t(`settings.themeNames.${themeId}`);

  const switchTheme = useCallback(
    (id: ThemeId) => {
      if (id === themeId) return;
      setThemeId(id);
      router.replace('/');
    },
    [router, setThemeId, themeId],
  );

  const saveGender = useCallback(
    async (gender: UserGender, genderCustom: string) => {
      if (!isLoggedIn || savingGender) return;
      setGenderMessage(null);
      setSavingGender(true);
      try {
        const updated = await updateUser({ gender, gender_custom: genderCustom });
        useAuthStore.setState({ user: updated });
        setGenderPickerOpen(false);
        setGenderMessage(t('settings.saved'));
      } catch {
        setGenderMessage(t('settings.saveFailed'));
      } finally {
        setSavingGender(false);
      }
    },
    [isLoggedIn, savingGender, t],
  );

  return (
    <ShellLayout scrollable showLangToggle={false}>
      <View
        style={[
          styles.page,
          isDesktop && styles.pageDesktop,
          { paddingBottom: layout.pagePadBottom },
          isDesktop && { minHeight: layout.viewportHeight },
        ]}
      >
        {isDesktop ? <PageBackground variant="settings" /> : null}

        <View
          style={[
            styles.content,
            {
              width: layout.contentWidth,
              paddingTop: layout.contentPadTop,
              maxHeight: layout.viewportHeight,
            },
          ]}
        >
          {isDesktop ? (
            <View style={[styles.metaRow, { marginBottom: layout.metaMarginBottom }]}>
              <View style={styles.metaLeft}>
                <Text style={[styles.metaText, { fontSize: layout.metaSize }]}>{t('settings.meta.terminal')}</Text>
                <Text style={[styles.metaText, { fontSize: layout.metaSize }]}>{t('settings.meta.user')}</Text>
                <Text style={[styles.metaText, { fontSize: layout.metaSize }]}>{t('settings.meta.clearance')}</Text>
                <Text style={[styles.metaText, { fontSize: layout.metaSize }]}>{t('settings.meta.sysVer')}</Text>
              </View>
              <View style={styles.metaRight}>
                <Text style={[styles.metaText, styles.metaRightText, { fontSize: layout.metaSize }]}>
                  {t('settings.meta.ministryInfo')}
                </Text>
                <Text style={[styles.metaText, styles.metaRightText, { fontSize: layout.metaSize }]}>{t('settings.meta.docNumber')}</Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.header, { marginBottom: layout.headerMarginBottom }]}
            activeOpacity={0.82}
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.title')}
          >
            {isDesktop ? (
              <>
                <Image
                  source={require('../assets/images/ui/common/emblem_star_simple.png')}
                  style={[
                    styles.headerStar,
                    { width: layout.headerStarSize, height: layout.headerStarSize },
                  ]}
                  resizeMode="contain"
                />
                <Image
                  source={require('../assets/images/ui/setting/header_title.png')}
                  style={{
                    width: layout.headerTitleWidth,
                    height: layout.headerTitleHeight,
                    marginTop: layout.headerTitleMarginTop,
                  }}
                  resizeMode="contain"
                />
                <View style={[styles.desktopTitleRow, { marginTop: layout.desktopTitleRowMarginTop }]}>
                  <View style={styles.desktopTitleLine} />
                  <DividerStar color={RED_ACCENT} size={layout.dividerStarSize} />
                  <View style={styles.desktopTitleLine} />
                </View>
              </>
            ) : (
              <>
                <Image
                  source={require('../assets/images/ui/common/emblem_star_simple.png')}
                  style={[
                    styles.headerStarMobile,
                    {
                      width: layout.headerStarMobileSize,
                      height: layout.headerStarMobileSize,
                      marginBottom: layout.headerStarMobileMarginBottom,
                    },
                  ]}
                  resizeMode="contain"
                />
                <Text style={[styles.mobileTitle, { fontSize: layout.mobileTitleFontSize, marginBottom: layout.mobileTitleMarginBottom }]}>
                  {t('settings.title')}
                </Text>
                <Image
                  source={require('../assets/images/ui/profile/header_divider.png')}
                  style={[
                    styles.headerDivider,
                    { width: layout.contentWidth, height: layout.headerDividerHeight },
                  ]}
                  resizeMode="stretch"
                />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.rows}>
            <TouchableOpacity activeOpacity={0.88} onPress={openLanguagePicker} disabled={savingLang}>
              <SettingRow
                width={layout.rowWidth}
                height={layout.rowHeight}
                icon={require('../assets/images/ui/setting/icon_language.png')}
                title={t('settings.language')}
                configId="CFG-LNG-01"
                rightMinWidth={layout.toggleWidth}
                right={
                  <View style={styles.langRight}>
                    {savingLang ? (
                      <ActivityIndicator size="small" color={GOLD} />
                    ) : (
                      <Text style={[styles.langValue, { fontSize: layout.langValueSize }]}>{langDisplay}</Text>
                    )}
                    <Image
                      source={require('../assets/images/ui/profile/icon_chevron.png')}
                      style={{ width: layout.chevronSize, height: layout.chevronSize }}
                      resizeMode="contain"
                    />
                  </View>
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setGenderPickerOpen(true)}
              disabled={!isLoggedIn || savingGender}
              style={{ marginTop: layout.rowGap }}
            >
              <SettingRow
                width={layout.rowWidth}
                height={layout.rowHeight}
                icon={require('../assets/images/ui/setting/icon_language.png')}
                title={t('settings.gender')}
                configId="CFG-GDR-05"
                rightMinWidth={layout.toggleWidth}
                right={
                  <View style={styles.langRight}>
                    {savingGender ? (
                      <ActivityIndicator size="small" color={GOLD} />
                    ) : (
                      <Text style={[styles.langValue, { fontSize: layout.langValueSize }]} numberOfLines={1}>
                        {genderDisplay}
                      </Text>
                    )}
                    <Image
                      source={require('../assets/images/ui/profile/icon_chevron.png')}
                      style={{ width: layout.chevronSize, height: layout.chevronSize }}
                      resizeMode="contain"
                    />
                  </View>
                }
              />
            </TouchableOpacity>

            {Platform.OS === 'ios' ? null : (
              <SettingRow
                width={layout.rowWidth}
                height={layout.rowHeight}
                icon={require('../assets/images/ui/setting/icon_content_tier.png')}
                title={t('settings.contentTier')}
                configId="CFG-CTT-02"
                style={{ marginTop: layout.rowGap }}
                rightMinWidth={layout.toggleWidth}
                right={
                  <ContentTierToggle
                    maxWidth={layout.toggleWidth}
                    maxHeight={layout.rowInnerHeight}
                    matureEnabled={matureEnabled}
                    onSelectStandard={selectStandard}
                    onRequestMature={requestMature}
                    standardLabel={t('settings.standard')}
                    matureLabel={t('settings.mature')}
                  />
                }
              />
            )}

            {isLoggedIn ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setBindEmailOpen(true)}
                style={{ marginTop: layout.rowGap }}
              >
                <SettingRow
                  width={layout.rowWidth}
                  height={layout.rowHeight}
                  icon={require('../assets/images/ui/setting/icon_warning.png')}
                  title={emailBound ? t('settings.changeEmailRowTitle') : t('settings.bindEmailRowTitle')}
                  configId="CFG-EML-01"
                  rightMinWidth={layout.toggleWidth}
                  right={
                    <View style={styles.langRight}>
                      <Text style={[styles.langValue, { fontSize: layout.langValueSize }]} numberOfLines={1}>
                        {accountEmailDisplay(user, t('settings.emailNotBound'))}
                      </Text>
                    </View>
                  }
                />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setResetPasswordOpen(true)}
              style={{ marginTop: layout.rowGap }}
            >
              <SettingRow
                width={layout.rowWidth}
                height={layout.rowHeight}
                icon={require('../assets/images/ui/setting/icon_warning.png')}
                title={t('settings.resetPasswordRowTitle')}
                configId="CFG-RPW-04"
              />
            </TouchableOpacity>

            {showThemeSwitch ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setThemePickerOpen(true)}
                style={{ marginTop: layout.rowGap }}
              >
                <SettingRow
                  width={layout.rowWidth}
                  height={layout.rowHeight}
                  icon={require('../assets/images/ui/setting/icon_content_tier.png')}
                  title={t('settings.theme')}
                  configId="CFG-THM-06"
                  rightMinWidth={layout.toggleWidth}
                  right={
                    <View style={styles.langRight}>
                      <Text style={[styles.langValue, { fontSize: layout.langValueSize }]} numberOfLines={1}>
                        {themeDisplay}
                      </Text>
                      <Image
                        source={require('../assets/images/ui/profile/icon_chevron.png')}
                        style={{ width: layout.chevronSize, height: layout.chevronSize }}
                        resizeMode="contain"
                      />
                    </View>
                  }
                />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleLogout}
              disabled={clearing}
              style={{ marginTop: layout.rowGap }}
            >
              <SettingRow
                width={layout.rowWidth}
                height={layout.rowHeightDanger}
                danger
                icon={require('../assets/images/ui/setting/icon_warning.png')}
                title={t('settings.logout')}
                configId="CFG-CLR-03"
                right={
                  clearing ? (
                    <ActivityIndicator size="small" color={RED_ACCENT} />
                  ) : (
                    <Image
                      source={require('../assets/images/ui/setting/icon_trash.png')}
                      style={{
                        width: layout.dangerIconSize,
                        height: layout.dangerIconSize,
                      }}
                      resizeMode="contain"
                    />
                  )
                }
              />
            </TouchableOpacity>

            {isLoggedIn ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() =>
                  deletionPending ? setConfirmCancelDeletion(true) : setConfirmDeleteAccount(true)
                }
                disabled={deletionBusy}
                style={{ marginTop: layout.rowGap }}
              >
                <SettingRow
                  width={layout.rowWidth}
                  height={layout.rowHeightDanger}
                  danger
                  icon={require('../assets/images/ui/setting/icon_warning.png')}
                  title={
                    deletionPending ? t('settings.cancelDeleteAccount') : t('settings.deleteAccount')
                  }
                  configId="CFG-DEL-04"
                  right={
                    deletionBusy ? (
                      <ActivityIndicator size="small" color={RED_ACCENT} />
                    ) : (
                      <Image
                        source={require('../assets/images/ui/profile/icon_chevron.png')}
                        style={{ width: layout.chevronSize, height: layout.chevronSize }}
                        resizeMode="contain"
                      />
                    )
                  }
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {genderMessage ? (
            <Text
              style={[
                styles.feedback,
                genderMessage === t('settings.saved') ? styles.feedbackOk : styles.feedbackErr,
              ]}
            >
              {genderMessage}
            </Text>
          ) : deletionPending && deletionDateLabel ? (
            <Text style={styles.feedbackHint}>
              {tp('settings.deleteAccountScheduled', { date: deletionDateLabel })}
            </Text>
          ) : isLoggedIn && !isDesktop ? (
            <Text style={styles.feedbackHint}>{t('settings.languageHint')}</Text>
          ) : null}

          {isDesktop ? (
            <View style={[styles.footer, { marginTop: layout.footerMarginTop }]}>
              <Text style={[styles.footerText, { fontSize: layout.metaSize }]}>
                {t('settings.footer.stateProperty')}
              </Text>
              <Image
                source={require('../assets/images/ui/setting/footer_emblem.png')}
                style={{
                  width: layout.footerEmblemWidth,
                  height: layout.footerEmblemHeight,
                  opacity: 0.55,
                }}
                resizeMode="contain"
              />
              <Text style={[styles.footerText, styles.footerTextRight, { fontSize: layout.metaSize }]}>
                {t('settings.footer.keepForever')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <MatureConfirmModal
        visible={confirmMature}
        onConfirm={confirmMatureSelection}
        onCancel={() => setConfirmMature(false)}
      />

      <GeneralConfirmModal
        visible={confirmLogout}
        icon="warning"
        title={t('settings.logoutConfirmTitle')}
        subtitle={t('settings.logoutConfirmSubtitle')}
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('settings.logoutConfirmBtn')}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={confirmLogoutAction}
        loading={clearing}
      />

      <GeneralConfirmModal
        visible={confirmDeleteAccount}
        icon="warning"
        title={t('settings.deleteAccountConfirmTitle')}
        subtitle={t('settings.deleteAccountConfirmSubtitle')}
        subtitleTone="body"
        bodyMaxHeight={280}
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('settings.deleteAccountConfirmBtn')}
        onCancel={() => setConfirmDeleteAccount(false)}
        onConfirm={() => void confirmScheduleDeletion()}
        loading={deletionBusy}
      />

      <GeneralConfirmModal
        visible={confirmCancelDeletion}
        icon="warning"
        title={t('settings.cancelDeleteAccountConfirmTitle')}
        subtitle={tp('settings.cancelDeleteAccountConfirmSubtitle', {
          date: deletionDateLabel || '—',
        })}
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('settings.cancelDeleteAccountConfirmBtn')}
        onCancel={() => setConfirmCancelDeletion(false)}
        onConfirm={() => void confirmCancelDeletionAction()}
        loading={deletionBusy}
      />

      <LangPickerModal
        visible={langPickerOpen}
        current={lang}
        variant="general"
        onSelect={onPickLanguage}
        onClose={() => setLangPickerOpen(false)}
      />

      {showThemeSwitch ? (
        <ThemePickerModal
          visible={themePickerOpen}
          current={themeId}
          onSelect={switchTheme}
          onClose={() => setThemePickerOpen(false)}
        />
      ) : null}

      <GenderPickerModal
        visible={genderPickerOpen}
        currentGender={user?.gender ?? ''}
        currentCustom={user?.gender_custom ?? ''}
        saving={savingGender}
        onSave={saveGender}
        onClose={() => setGenderPickerOpen(false)}
      />

      <GeneralConfirmModal
        visible={confirmLangChange}
        icon="globe"
        title={t('settings.languageConfirmTitle')}
        subtitle={
          pendingLang
            ? tp('settings.languageConfirmSubtitle', { language: LANG_LABELS[pendingLang].native })
            : undefined
        }
        subtitleTone="body"
        cancelLabel={t('settings.cancel')}
        confirmLabel={t('settings.languageConfirmBtn')}
        onCancel={cancelLanguageChange}
        onConfirm={() => void confirmLanguageChange()}
        loading={savingLang}
      />

      <ResetPasswordModal
        visible={resetPasswordOpen}
        initialEmail={emailBound ? user?.email ?? '' : ''}
        onClose={() => setResetPasswordOpen(false)}
      />
      <BindEmailModal
        visible={bindEmailOpen}
        initialEmail={emailBound ? user?.email ?? '' : ''}
        emailBound={emailBound}
        onClose={() => setBindEmailOpen(false)}
      />
    </ShellLayout>
  );
}

const GOLD = '#c9a86c';
const RED_ACCENT = '#9e1b1b';
const RED_DIVIDER = '#7a1818';

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  pageDesktop: {
    backgroundColor: 'transparent',
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
  },
  metaRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  metaLeft: {
    gap: 2,
  },
  metaRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  metaText: Typo(
    {
      color: '#6a6258',
      letterSpacing: 0.6,
      opacity: 0.85,
    },
    'sans',
  ),
  metaRightText: {
    textAlign: 'right',
  },
  header: {
    alignItems: 'center',
    width: '100%',
  },
  headerStar: {
    marginBottom: 2,
  },
  headerStarMobile: {},
  mobileTitle: Typo(
    {
      color: GOLD,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    'display',
  ),
  headerDivider: {
    opacity: 0.95,
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
  rows: {
    width: '100%',
    alignItems: 'center',
  },
  langRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langValue: Typo(
    {
      color: GOLD,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  feedback: Typo(
    {
      fontSize: 12,
      marginTop: 16,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
    },
    'sans',
  ),
  feedbackErr: {
    color: COLORS.accent.red,
  },
  feedbackOk: {
    color: COLORS.accent.gold,
  },
  feedbackHint: Typo(
    {
      color: COLORS.text.muted,
      fontSize: 11,
      marginTop: 14,
      lineHeight: 16,
      paddingHorizontal: 8,
      alignSelf: 'flex-start',
    },
    'sans',
  ),
  footer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  footerText: Typo(
    {
      color: '#5a5248',
      letterSpacing: 0.5,
      opacity: 0.75,
      flex: 1,
    },
    'sans',
  ),
  footerTextRight: {
    textAlign: 'right',
    lineHeight: 16,
  },
});
