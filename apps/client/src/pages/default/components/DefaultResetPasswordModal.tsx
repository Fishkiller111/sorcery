import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { useAuthStore } from '../../../stores/authStore';
import { formatApiError } from '../../../utils/apiError';
import { useSendCodeCooldown } from '../../../hooks/useSendCodeCooldown';
import { useTurnstileGate } from '../../../hooks/useTurnstileGate';
import { Typo } from '../../../theme/typography';
import { themedScrollViewProps } from '../../../theme/webScrollbar';
import { notifyError, notifySuccess, notifyWarning } from '../../../utils/notify';
import { MessageHost } from '../../../components/ui/Message';
import { DefaultAuthField } from './DefaultAuthField';
import { DefaultConfirmModalPanel } from './DefaultGeneralConfirmModal';
import { TOKENS } from '../theme/tokens';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DefaultResetPasswordModalProps = {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function DefaultResetPasswordModal({
  visible,
  initialEmail = '',
  onClose,
  onSuccess,
}: DefaultResetPasswordModalProps) {
  const { t, tp } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const { resetPassword, sendCode } = useAuthStore();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { cooldown, canSend, startCooldown, resetCooldown } = useSendCodeCooldown();
  const { requestToken, gate: turnstileGate } = useTurnstileGate();

  const cardWidth = Math.min(Math.round(windowWidth * 0.92), 520);

  useEffect(() => {
    if (!visible) return;
    setEmail(initialEmail);
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setCodeSent(false);
    resetCooldown();
  }, [visible, initialEmail, resetCooldown]);

  const handleSendCode = useCallback(async () => {
    if (!canSend) return;
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      notifyWarning(t('login.invalidEmail'));
      return;
    }
    try {
      const turnstileToken = await requestToken();
      if (turnstileToken === null) return;
      setSendingCode(true);
      await sendCode(trimmed, 'reset', turnstileToken || undefined);
      setCodeSent(true);
      startCooldown();
      notifySuccess(t('login.codeSent'));
    } catch (err) {
      notifyError(t('login.sendCode'), formatApiError(t, err));
    } finally {
      setSendingCode(false);
    }
  }, [canSend, email, requestToken, sendCode, startCooldown, t]);

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
    if (password.length < 8) {
      notifyWarning(t('login.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      notifyWarning(t('login.passwordsMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({
        email: trimmedEmail,
        code: code.trim(),
        new_password: password,
        confirm_password: confirmPassword,
      });
      notifySuccess(t('settings.resetPasswordSuccess'));
      onSuccess?.();
      onClose();
    } catch (err) {
      notifyError(t('settings.resetPasswordModalTitle'), formatApiError(t, err));
    } finally {
      setSubmitting(false);
    }
  }, [code, confirmPassword, email, onClose, onSuccess, password, resetPassword, t]);

  const sendCodeLabel =
    cooldown > 0
      ? tp('login.resendCooldown', { seconds: cooldown })
      : codeSent
        ? t('settings.resetBtnResendCode')
        : t('settings.resetBtnSendCode');

  const bodyContent = (
    <ScrollView
      {...scrollWebProps}
      style={[styles.bodyScroll, scrollWebProps.style]}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.hint}>{t('settings.resetPasswordHint')}</Text>

      <DefaultAuthField
        label={t('login.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('login.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        editable={!submitting}
      />

      <DefaultAuthField
        label={t('settings.verificationCode')}
        value={code}
        onChangeText={setCode}
        placeholder={t('settings.enter6DigitCode')}
        keyboardType="number-pad"
        maxLength={6}
        editable={!submitting}
        footer={
          <Pressable
            onPress={() => void handleSendCode()}
            disabled={sendingCode || submitting || cooldown > 0}
            style={({ pressed }) => [
              styles.sendCodeBtn,
              (sendingCode || cooldown > 0) && styles.sendCodeBtnDisabled,
              pressed && !sendingCode && cooldown === 0 && styles.sendCodeBtnPressed,
            ]}
          >
            {sendingCode ? (
              <ActivityIndicator size="small" color={TOKENS.colors.text} />
            ) : (
              <Text style={styles.sendCodeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {sendCodeLabel}
              </Text>
            )}
          </Pressable>
        }
      />

      <DefaultAuthField
        label={t('login.newPassword')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('settings.enterNewPassword')}
        secureTextEntry
        autoCapitalize="none"
        editable={!submitting}
      />

      <DefaultAuthField
        label={t('settings.confirmNewPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('settings.confirmNewPasswordPlaceholder')}
        secureTextEntry
        autoCapitalize="none"
        editable={!submitting}
      />
    </ScrollView>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
          <DefaultConfirmModalPanel
            icon="warning"
            title={t('settings.resetPasswordModalTitle')}
            bodyMaxHeight={360}
            bodyContent={bodyContent}
            cardWidth={cardWidth}
            cancelLabel={t('settings.resetBtnCancel')}
            confirmLabel={t('settings.resetBtnSubmit')}
            onCancel={onClose}
            onConfirm={() => void handleSubmit()}
            loading={submitting}
          />
        </View>
        {visible ? <MessageHost /> : null}
      </Modal>
      {turnstileGate}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 5, 8, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  bodyScroll: {
    width: '100%',
  },
  bodyContent: {
    gap: 16,
    paddingBottom: 4,
  },
  hint: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 4,
    },
    'sans',
  ),
  sendCodeBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCodeBtnDisabled: {
    opacity: 0.55,
  },
  sendCodeBtnPressed: {
    transform: [{ scale: 0.98 }],
  },
  sendCodeText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    'sans',
  ),
});
