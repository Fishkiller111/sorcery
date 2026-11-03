import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useI18n } from '../i18n/I18nContext';
import { getCommonParams } from '../i18n/common';
import { useAuthStore } from '../stores/authStore';
import { formatApiError, getApiErrorCode } from '../utils/apiError';
import { validateReferral } from '../api/referral';
import { useSendCodeCooldown } from './useSendCodeCooldown';
import { useTurnstileGate } from './useTurnstileGate';
import {
  trackRegisterButtonClick,
  trackRegisterTabClick,
} from '../utils/analytics';
import { notifyError, notifySuccess, notifyWarning } from '../utils/notify';
import { captureAffCode } from '../utils/affiliateAttribution';
import type { AppleAuthReq, ReferralValidateResp, TelegramWidgetAuthReq } from '../types/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthMode = 'login' | 'register' | 'reset';

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? '').trim();
}

export function useLoginScreen() {
  const { t, lang, tp } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string | string[]; aff?: string | string[] }>();
  const {
    login,
    loginWithGoogle,
    loginWithApple,
    loginWithTelegramWidget,
    register,
    resetPassword,
    sendCode,
  } = useAuthStore();

  const initialInvite = useMemo(() => {
    return firstParam(params.invite).toUpperCase();
  }, [params.invite]);

  const initialAff = useMemo(() => {
    return firstParam(params.aff).toLowerCase();
  }, [params.aff]);

  const [mode, setMode] = useState<AuthMode>(initialInvite ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [invitePreview, setInvitePreview] = useState<ReferralValidateResp | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [passwordNotSetVisible, setPasswordNotSetVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { cooldown, canSend, startCooldown, resetCooldown } = useSendCodeCooldown();
  const { requestToken, gate: turnstileGate } = useTurnstileGate();

  const requireTerms = useCallback(() => {
    if (mode === 'reset') return true;
    if (termsAccepted) return true;
    notifyWarning(t('login.termsRequired'));
    return false;
  }, [mode, termsAccepted, t]);

  useEffect(() => {
    if (!initialInvite) return;
    setInviteCode(initialInvite);
    setMode('register');
  }, [initialInvite]);

  useEffect(() => {
    if (!initialAff) return;
    void captureAffCode(initialAff);
  }, [initialAff]);

  useEffect(() => {
    const trimmed = inviteCode.trim();
    if (!trimmed || mode === 'login') {
      setInvitePreview(null);
      return;
    }
    let cancelled = false;
    void validateReferral(trimmed)
      .then((resp) => {
        if (!cancelled) setInvitePreview(resp);
      })
      .catch(() => {
        if (!cancelled) setInvitePreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteCode, mode]);

  const clearForm = useCallback(() => {
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setCodeSent(false);
    resetCooldown();
  }, [resetCooldown]);

  const switchMode = useCallback(
    (next: AuthMode) => {
      if (next === 'register' && mode !== 'register') {
        trackRegisterTabClick();
      }
      setMode(next);
      clearForm();
    },
    [clearForm, mode],
  );

  const handleSendCode = useCallback(async () => {
    if (!canSend) return;

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      notifyWarning(t('login.invalidEmail'));
      return;
    }

    const purpose = mode === 'reset' ? 'reset' : 'register';
    try {
      const turnstileToken = await requestToken();
      if (turnstileToken === null) return;
      setSendingCode(true);
      await sendCode(trimmed, purpose, turnstileToken || undefined);
      setCodeSent(true);
      startCooldown();
      notifySuccess(t('login.codeSent'));
    } catch (err) {
      notifyError(formatApiError(t, err));
    } finally {
      setSendingCode(false);
    }
  }, [canSend, email, mode, requestToken, sendCode, startCooldown, t]);

  const validatePasswords = useCallback(() => {
    if (password.length < 8) {
      notifyWarning(t('errors.authWeakPassword'));
      return false;
    }
    if (mode !== 'login' && password !== confirmPassword) {
      notifyWarning(t('errors.authPasswordMismatch'));
      return false;
    }
    return true;
  }, [confirmPassword, mode, password.length, t]);

  const handleSubmit = useCallback(async () => {
    if (mode === 'register') {
      trackRegisterButtonClick('email');
    }

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      notifyWarning(t('login.invalidEmail'));
      return;
    }
    if (!password) {
      notifyWarning(t('login.passwordRequired'));
      return;
    }
    if (mode !== 'login') {
      if (!code) {
        notifyWarning(t('login.codeRequired'));
        return;
      }
      if (!validatePasswords()) return;
    }
    if (!requireTerms()) return;

    try {
      if (mode === 'login') {
        const turnstileToken = await requestToken();
        if (turnstileToken === null) return;
        setSubmitting(true);
        await login(trimmedEmail, password, turnstileToken || undefined);
        notifySuccess(t('login.loginSuccess'));
        router.replace('/');
      } else if (mode === 'register') {
        setSubmitting(true);
        await register({
          email: trimmedEmail,
          code,
          password,
          confirm_password: confirmPassword,
          invite_code: inviteCode.trim() || undefined,
        });
        notifySuccess(t('login.registerSuccess'));
        router.replace('/');
      } else {
        setSubmitting(true);
        await resetPassword({
          email: trimmedEmail,
          code,
          new_password: password,
          confirm_password: confirmPassword,
        });
        notifySuccess(t('login.resetSuccess'));
        switchMode('login');
      }
    } catch (err) {
      const codeErr = getApiErrorCode(err);
      if (codeErr === 'AUTH_011') {
        setPasswordNotSetVisible(true);
      } else {
        // Prefer the localized business message alone — avoid "登录失败：密码错误" noise.
        notifyError(formatApiError(t, err));
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    code,
    confirmPassword,
    email,
    login,
    mode,
    password,
    register,
    requestToken,
    requireTerms,
    resetPassword,
    router,
    switchMode,
    inviteCode,
    t,
    validatePasswords,
  ]);

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      if (!requireTerms()) return;
      if (mode === 'register') {
        trackRegisterButtonClick('google');
      }
      setSubmitting(true);
      try {
        await loginWithGoogle(
          idToken,
          mode === 'register' ? inviteCode.trim() || undefined : undefined,
        );
        notifySuccess(mode === 'register' ? t('login.registerSuccess') : t('login.loginSuccess'));
        router.replace('/');
      } catch (err) {
        notifyError(formatApiError(t, err));
      } finally {
        setSubmitting(false);
      }
    },
    [inviteCode, loginWithGoogle, mode, requireTerms, router, t],
  );

  const handleAppleCredential = useCallback(
    async (req: AppleAuthReq) => {
      if (!requireTerms()) return;
      if (mode === 'register') {
        trackRegisterButtonClick('apple');
      }
      setSubmitting(true);
      try {
        await loginWithApple({
          ...req,
          invite_code: mode === 'register' ? inviteCode.trim() || undefined : undefined,
        });
        notifySuccess(mode === 'register' ? t('login.registerSuccess') : t('login.loginSuccess'));
        router.replace('/');
      } catch (err) {
        notifyError(formatApiError(t, err));
      } finally {
        setSubmitting(false);
      }
    },
    [inviteCode, loginWithApple, mode, requireTerms, router, t],
  );

  const handleAppleError = useCallback(
    (err: unknown) => {
      notifyError(formatApiError(t, err));
    },
    [t],
  );

  const handleTelegramCredential = useCallback(
    async (req: TelegramWidgetAuthReq) => {
      if (!requireTerms()) return;
      if (mode === 'register') {
        trackRegisterButtonClick('telegram');
      }
      setSubmitting(true);
      try {
        await loginWithTelegramWidget({
          ...req,
          invite_code: mode === 'register' ? inviteCode.trim() || undefined : undefined,
        });
        notifySuccess(mode === 'register' ? t('login.registerSuccess') : t('login.loginSuccess'));
        router.replace('/');
      } catch (err) {
        notifyError(formatApiError(t, err));
      } finally {
        setSubmitting(false);
      }
    },
    [inviteCode, loginWithTelegramWidget, mode, requireTerms, router, t],
  );

  const handleTelegramError = useCallback(
    (err: unknown) => {
      notifyError(formatApiError(t, err));
    },
    [t],
  );

  const inviteBannerText = useMemo(() => {
    if (mode !== 'register' || !invitePreview) return null;
    if (invitePreview.activity_status === 'ended') {
      return t('referral.loginBannerEnded');
    }
    if (invitePreview.valid && invitePreview.invitee_points != null) {
      const name = invitePreview.inviter_nickname || '-';
      return getCommonParams('referral.loginBannerValid', lang, {
        name,
        points: String(invitePreview.invitee_points),
      });
    }
    return null;
  }, [invitePreview, lang, mode, t]);

  const submitLabel =
    mode === 'login'
      ? t('login.login')
      : mode === 'register'
        ? t('login.register')
        : t('login.resetPassword');

  const submitLoadingLabel =
    mode === 'login'
      ? t('login.loggingIn')
      : mode === 'register'
        ? t('login.registering')
        : t('login.resetting');

  return {
    t,
    tp,
    mode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    code,
    setCode,
    inviteCode,
    setInviteCode,
    invitePreview,
    sendingCode,
    submitting,
    codeSent,
    cooldown,
    passwordNotSetVisible,
    setPasswordNotSetVisible,
    termsAccepted,
    setTermsAccepted,
    switchMode,
    handleSendCode,
    handleSubmit,
    handleGoogleCredential,
    handleAppleCredential,
    handleAppleError,
    handleTelegramCredential,
    handleTelegramError,
    inviteBannerText,
    submitLabel,
    submitLoadingLabel,
    turnstileGate,
  };
}
