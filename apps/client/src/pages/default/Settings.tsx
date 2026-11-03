import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/safeGoBack';
import { DefaultShell } from './components/DefaultShell';
import { DefaultSettingsRow } from './components/DefaultSettingsRow';
import { DefaultBackButton } from './components/DefaultBackButton';
import { TOKENS } from './theme/tokens';
import { useI18n } from '../../i18n/I18nContext';
import { langDisplayName, LANG_LABELS } from '../../i18n/langs';
import type { Lang } from '../../i18n/types';
import { LangPickerModal } from '../../components/common/LangPickerModal';
import { ThemePickerModal } from '../../components/settings/ThemePickerModal';
import { MatureConfirmModal } from '../../components/settings/MatureConfirmModal';
import { ResetPasswordModal } from '../../components/settings/ResetPasswordModal';
import { BindEmailModal } from '../../components/settings/BindEmailModal';
import { ThemedGeneralConfirmModal } from '../../components/ui/ThemedGeneralConfirmModal';
import { DefaultContentTierToggle } from './components/DefaultContentTierToggle';
import { loadMatureSettings, saveMatureSettings } from '../../engine/flagStore';
import { setLocalMatureOptIn } from '../../utils/matureOptIn';
import { updateUser, scheduleAccountDeletion, cancelAccountDeletion } from '../../api/user';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { PRIMARY_SCENE_ID } from '../../constants/scene';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { formatDeletionScheduledDate } from '../../utils/accountDeletion';
import { accountEmailDisplay, isAccountEmailBound } from '../../utils/accountEmail';
import { useTheme } from '../../theme/useTheme';
import type { ThemeId } from '../../theme/system/types';
import { Typo } from '../../theme/typography';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import {
  VIP_PRIVACY_URL,
  VIP_TERMS_URL,
} from '../../components/vip/VipSubscriptionLegalLinks';

export function DefaultSettings() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bindEmail?: string }>();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const { lang, setLang, t, tp } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const { themeId, setThemeId } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const updateUserLang = useAuthStore((s) => s.updateUserLang);
  const logout = useAuthStore((s) => s.logout);
  const isDevUser = user?.is_dev === true;
  const showThemeSwitch = isDevUser;

  const [matureEnabled, setMatureEnabled] = useState(false);
  const [confirmMature, setConfirmMature] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
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

  useEffect(() => {
    if (params.bindEmail === '1' && isLoggedIn) {
      setBindEmailOpen(true);
    }
  }, [params.bindEmail, isLoggedIn]);

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
        if (err instanceof ApiError && err.code === 'VIP_010') {
          notifyWarning(t('settings.matureVipRequired'));
        } else {
          notifyError(t('settings.saveFailed'));
        }
        await saveMatureSettings(PRIMARY_SCENE_ID, false, true);
        setLocalMatureOptIn(false);
        setMatureEnabled(false);
        throw err;
      }
    },
    [isLoggedIn, t],
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

  const onPickLanguage = (next: Lang) => {
    setLangPickerOpen(false);
    if (next === lang || savingLang) return;
    setPendingLang(next);
    setConfirmLangChange(true);
  };

  const switchTheme = useCallback(
    (id: ThemeId) => {
      if (id === themeId) return;
      setThemeId(id);
      router.replace('/');
    },
    [router, setThemeId, themeId],
  );

  const langDisplay = langDisplayName(lang);
  const themeDisplay = t(`settings.themeNames.${themeId}`);

  return (
    <DefaultShell>
      <View style={[styles.page, pageContentPadding]}>
        <DefaultBackButton
          onPress={() => safeGoBack('/profile')}
          accessibilityLabel={t('vip.shop.back')}
        />
        <Text style={styles.pageTitle}>{t('settings.title')}</Text>

        <View style={styles.section}>
          <DefaultSettingsRow
            title={t('settings.language')}
            value={langDisplay}
            onPress={() => !savingLang && setLangPickerOpen(true)}
            loading={savingLang}
          />
          {Platform.OS === 'ios' ? null : (
            <DefaultSettingsRow
              title={t('settings.contentTier')}
              right={
                <DefaultContentTierToggle
                  matureEnabled={matureEnabled}
                  onSelectStandard={() => void syncContentTier(false)}
                  onRequestMature={() => {
                    if (!matureEnabled) {
                      if (isLoggedIn && user?.vip && !user.vip.permissions.mature_mode) {
                        notifyWarning(t('settings.matureVipRequired'));
                        return;
                      }
                      setConfirmMature(true);
                    }
                  }}
                  standardLabel={t('settings.standard')}
                  matureLabel={t('settings.mature')}
                />
              }
            />
          )}
          {isLoggedIn ? (
            <DefaultSettingsRow
              title={emailBound ? t('settings.changeEmailRowTitle') : t('settings.bindEmailRowTitle')}
              value={accountEmailDisplay(user, t('settings.emailNotBound'))}
              onPress={() => setBindEmailOpen(true)}
            />
          ) : null}
          <DefaultSettingsRow
            title={t('settings.resetPasswordRowTitle')}
            onPress={() => setResetPasswordOpen(true)}
          />
          {showThemeSwitch ? (
            <DefaultSettingsRow
              title={t('settings.theme')}
              value={themeDisplay}
              onPress={() => setThemePickerOpen(true)}
            />
          ) : null}
          {isLoggedIn ? (
            <DefaultSettingsRow
              title={t('worldPlay.openFromSettings')}
              onPress={() => router.push('/world')}
            />
          ) : null}
          <DefaultSettingsRow
            title={t('login.privacyPolicy')}
            onPress={() => VIP_PRIVACY_URL && void Linking.openURL(VIP_PRIVACY_URL)}
          />
          <DefaultSettingsRow
            title={t('login.termsOfUse')}
            onPress={() => VIP_TERMS_URL && void Linking.openURL(VIP_TERMS_URL)}
          />
          <DefaultSettingsRow
            title={t('settings.logout')}
            onPress={() => setConfirmLogout(true)}
            danger
            loading={clearing}
          />
          {isLoggedIn ? (
            <DefaultSettingsRow
              title={
                user?.deletion_scheduled_at
                  ? t('settings.cancelDeleteAccount')
                  : t('settings.deleteAccount')
              }
              onPress={() =>
                user?.deletion_scheduled_at
                  ? setConfirmCancelDeletion(true)
                  : setConfirmDeleteAccount(true)
              }
              danger
              loading={deletionBusy}
            />
          ) : null}
        </View>
      </View>

      <MatureConfirmModal
        visible={confirmMature}
        onConfirm={() =>
          void syncContentTier(true)
            .then(() => setConfirmMature(false))
            .catch(() => setConfirmMature(false))
        }
        onCancel={() => setConfirmMature(false)}
      />
      <ThemedGeneralConfirmModal
        visible={confirmLogout}
        icon="warning"
        title={t('settings.logoutConfirmTitle')}
        subtitle={t('settings.logoutConfirmSubtitle')}
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('settings.logoutConfirmBtn')}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          setClearing(true);
          try {
            logout();
            router.replace('/');
          } finally {
            setClearing(false);
          }
        }}
        loading={clearing}
      />
      <ThemedGeneralConfirmModal
        visible={confirmDeleteAccount}
        icon="warning"
        title={t('settings.deleteAccountConfirmTitle')}
        subtitle={t('settings.deleteAccountConfirmSubtitle')}
        subtitleTone="body"
        bodyMaxHeight={280}
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('settings.deleteAccountConfirmBtn')}
        onCancel={() => setConfirmDeleteAccount(false)}
        onConfirm={async () => {
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
        }}
        loading={deletionBusy}
      />
      <ThemedGeneralConfirmModal
        visible={confirmCancelDeletion}
        icon="warning"
        title={t('settings.cancelDeleteAccountConfirmTitle')}
        subtitle={tp('settings.cancelDeleteAccountConfirmSubtitle', {
          date: formatDeletionScheduledDate(user?.deletion_scheduled_at, lang) || '—',
        })}
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('settings.cancelDeleteAccountConfirmBtn')}
        onCancel={() => setConfirmCancelDeletion(false)}
        onConfirm={async () => {
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
        }}
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
      <ThemedGeneralConfirmModal
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
        onCancel={() => {
          setConfirmLangChange(false);
          setPendingLang(null);
        }}
        onConfirm={async () => {
          if (!pendingLang) return;
          const next = pendingLang;
          setConfirmLangChange(false);
          setPendingLang(null);
          await selectLanguage(next);
        }}
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
    </DefaultShell>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  page: {
    width: '100%',
    paddingHorizontal: TOKENS.layout.contentPadding,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 24,
  },
  pageTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '600',
      letterSpacing: 2.4,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    'serif', lang
  ),
  section: {
    width: '100%',
    gap: 12,
  },
});
};
