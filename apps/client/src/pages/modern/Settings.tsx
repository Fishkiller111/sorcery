import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ModernPageChrome } from './theme/components/ModernPageChrome';
import { ModernPageHeader } from './theme/components/ModernPageHeader';
import { ModernSettingsRow } from './theme/components/ModernSettingsRow';
import { TOKENS } from './theme/tokens';
import { useI18n } from '../../i18n/I18nContext';
import { langDisplayName, LANG_LABELS } from '../../i18n/langs';
import type { Lang } from '../../i18n/types';
import { LangPickerModal } from '../../components/common/LangPickerModal';
import { ThemePickerModal } from '../../components/settings/ThemePickerModal';
import { MatureConfirmModal } from '../../components/settings/MatureConfirmModal';
import { ResetPasswordModal } from '../../components/settings/ResetPasswordModal';
import { BindEmailModal } from '../../components/settings/BindEmailModal';
import { GeneralConfirmModal } from '../../components/ui/GeneralConfirmModal';
import { ContentTierToggle, toggleSizeForRow } from '../../components/settings/ContentTierToggle';
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

export function ModernSettings() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bindEmail?: string }>();
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

  const toggleSize = toggleSizeForRow(140, 36);

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
    <ModernPageChrome>
      <View style={styles.page}>
        <ModernPageHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')} />

        <View style={styles.section}>
          <ModernSettingsRow
            title={t('settings.language')}
            configId="CFG-LNG-01"
            value={langDisplay}
            onPress={() => !savingLang && setLangPickerOpen(true)}
            loading={savingLang}
          />
          {Platform.OS === 'ios' ? null : (
            <View style={styles.tierRow}>
              <View style={styles.tierMain}>
                <Text style={styles.tierTitle}>{t('settings.contentTier')}</Text>
                <Text style={styles.tierConfigId}>CFG-CTT-02</Text>
              </View>
              <ContentTierToggle
                maxWidth={toggleSize.width}
                maxHeight={toggleSize.height}
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
            </View>
          )}
          {isLoggedIn ? (
            <ModernSettingsRow
              title={emailBound ? t('settings.changeEmailRowTitle') : t('settings.bindEmailRowTitle')}
              configId="CFG-EML-01"
              value={accountEmailDisplay(user, t('settings.emailNotBound'))}
              onPress={() => setBindEmailOpen(true)}
            />
          ) : null}
          <ModernSettingsRow
            title={t('settings.resetPasswordRowTitle')}
            configId="CFG-RPW-04"
            onPress={() => setResetPasswordOpen(true)}
          />
          {showThemeSwitch ? (
            <ModernSettingsRow
              title={t('settings.theme')}
              configId="CFG-THM-06"
              value={themeDisplay}
              onPress={() => setThemePickerOpen(true)}
            />
          ) : null}
          {isLoggedIn ? (
            <ModernSettingsRow
              title={t('worldPlay.openFromSettings')}
              configId="CFG-WLD-01"
              onPress={() => router.push('/world')}
            />
          ) : null}
          <ModernSettingsRow
            title={t('settings.logout')}
            configId="CFG-CLR-03"
            onPress={() => setConfirmLogout(true)}
            danger
            loading={clearing}
          />
          {isLoggedIn ? (
            <ModernSettingsRow
              title={
                user?.deletion_scheduled_at
                  ? t('settings.cancelDeleteAccount')
                  : t('settings.deleteAccount')
              }
              configId="CFG-DEL-04"
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
        onConfirm={() => void syncContentTier(true).then(() => setConfirmMature(false)).catch(() => setConfirmMature(false))}
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
      <GeneralConfirmModal
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
    </ModernPageChrome>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  page: {
    paddingTop: 8,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tierMain: {
    flex: 1,
    gap: 4,
  },
  tierTitle: Typo(
    {
      color: TOKENS.modePage.text,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'sans', lang
  ),
  tierConfigId: Typo(
    {
      color: TOKENS.modePage.textSubtle,
      fontSize: 10,
      letterSpacing: 0.8,
    },
    'mono', lang
  ),
});
};
