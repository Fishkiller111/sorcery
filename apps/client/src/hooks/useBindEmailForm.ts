import { useCallback, useEffect, useState } from 'react';
import { bindEmail, sendBindEmailCode } from '../api/user';
import { useAuthStore } from '../stores/authStore';
import { formatApiError } from '../utils/apiError';
import { useSendCodeCooldown } from './useSendCodeCooldown';
import { notifyError, notifySuccess, notifyWarning } from '../utils/notify';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Options = {
  visible: boolean;
  initialEmail?: string;
  emailBound?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  t: (key: string) => string;
};

export function useBindEmailForm({
  visible,
  initialEmail = '',
  emailBound = false,
  onClose,
  onSuccess,
  t,
}: Options) {
  const [email, setEmail] = useState(emailBound ? '' : initialEmail);
  const [code, setCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { cooldown, canSend, startCooldown, resetCooldown } = useSendCodeCooldown();

  useEffect(() => {
    if (!visible) return;
    setEmail(emailBound ? '' : initialEmail);
    setCode('');
    setCodeSent(false);
    resetCooldown();
  }, [visible, initialEmail, emailBound, resetCooldown]);

  const handleSendCode = useCallback(async () => {
    if (!canSend) return;
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      notifyWarning(t('login.invalidEmail'));
      return;
    }
    try {
      setSendingCode(true);
      await sendBindEmailCode(trimmed);
      setCodeSent(true);
      startCooldown();
      notifySuccess(t('login.codeSent'));
    } catch (err) {
      notifyError(t('login.sendCode'), formatApiError(t, err));
    } finally {
      setSendingCode(false);
    }
  }, [canSend, email, startCooldown, t]);

  const handleSubmit = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      notifyWarning(t('login.invalidEmail'));
      return;
    }
    if (!code.trim()) {
      notifyWarning(t('settings.verificationCode'), t('settings.enter6DigitCode'));
      return;
    }
    setSubmitting(true);
    try {
      const user = await bindEmail(trimmedEmail, code.trim());
      useAuthStore.setState({ user });
      notifySuccess(t('settings.bindEmailSuccess'));
      onSuccess?.();
      onClose();
    } catch (err) {
      notifyError(t('settings.bindEmailModalTitle'), formatApiError(t, err));
    } finally {
      setSubmitting(false);
    }
  }, [code, email, onClose, onSuccess, t]);

  return {
    email,
    setEmail,
    code,
    setCode,
    sendingCode,
    submitting,
    codeSent,
    cooldown,
    handleSendCode,
    handleSubmit,
  };
}
