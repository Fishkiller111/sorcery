import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { useAuthStore } from '../../stores/authStore';
import { formatApiError } from '../../utils/apiError';
import { useSendCodeCooldown } from '../../hooks/useSendCodeCooldown';
import { useTurnstileGate } from '../../hooks/useTurnstileGate';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { MessageHost } from '../ui/Message';
import { DividerStar } from '../ui/DividerStar';
import { useTheme } from '../../theme/system/ThemeContext';
import { DefaultResetPasswordModal } from '../../pages/default/components/DefaultResetPasswordModal';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FRAME_SRC = { width: 957, height: 768 };
const FRAME_CAP = { left: 100, top: 88, right: 100, bottom: 88 };

const BTN_CANCEL_CAP = { left: 52, top: 30, right: 52, bottom: 30 };

const BTN_SUBMIT_CAP = { left: 52, top: 30, right: 52, bottom: 30 };

const BTN_SEND_SRC = { width: 222, height: 88 };
const BTN_SEND_CAP = { left: 28, top: 28, right: 28, bottom: 28 };

const RED = '#c43e3e';
const GOLD = '#c9a86c';
const LABEL = '#8a8278';

type ResetPasswordModalProps = {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

function ModalButton({
  source,
  capInsets,
  height,
  label,
  labelColor,
  fontSize,
  onPress,
  disabled,
  loading,
}: {
  source: number;
  capInsets: { left: number; top: number; right: number; bottom: number };
  height: number;
  label: string;
  labelColor: string;
  fontSize: number;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.modalBtnWrap, { height, opacity: disabled ? 0.55 : 1 }]}
    >
      <ImageBackground
        source={source}
        style={styles.modalBtnBg}
        imageStyle={styles.stretchImage}
        resizeMode="stretch"
        capInsets={capInsets}
      >
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          <Text
            style={[styles.modalBtnText, { color: labelColor, fontSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {label}
          </Text>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}

export function ResetPasswordModal({
  visible,
  initialEmail = '',
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const { themeId, loaded } = useTheme();
  if (themeId === 'default' && loaded) {
    return (
      <DefaultResetPasswordModal
        visible={visible}
        initialEmail={initialEmail}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }
  return (
    <SovietResetPasswordModal
      visible={visible}
      initialEmail={initialEmail}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function SovietResetPasswordModal({
  visible,
  initialEmail = '',
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const { t, tp } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const { resetPassword, sendCode } = useAuthStore();

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { cooldown, canSend, startCooldown, resetCooldown } = useSendCodeCooldown();
  const { requestToken, gate: turnstileGate } = useTurnstileGate();

  const cardWidth = useMemo(() => Math.min(Math.round(windowWidth * 0.9), 620), [windowWidth]);
  const cardHeight = useMemo(
    () => Math.round(cardWidth * 0.9),
    [cardWidth],
  );
  const padH = Math.round(cardWidth * 0.09);
  const padTop = Math.round(cardHeight * 0.09);
  const padBottom = Math.round(cardHeight * 0.11);
  const sendBtnWidth = Math.round(cardWidth * (BTN_SEND_SRC.width / FRAME_SRC.width));
  const sendBtnHeight = Math.round(sendBtnWidth * (BTN_SEND_SRC.height / BTN_SEND_SRC.width));
  const footerBtnHeight = Math.round(cardWidth * 0.072);
  const titleFontSize = Math.round(cardWidth * 0.042);
  const modalBtnFontSize = Math.round(cardWidth * 0.028);
  const sendBtnFontSize = Math.round(cardWidth * 0.025);

  useEffect(() => {
    if (!visible) return;
    setEmail(initialEmail);
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setCodeSent(false);
    resetCooldown();
    setShowPassword(false);
    setShowConfirmPassword(false);
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
  }, [
    code,
    confirmPassword,
    email,
    onClose,
    onSuccess,
    password,
    resetPassword,
    t,
  ]);

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.cardOuter, { width: cardWidth, height: cardHeight }]}>
          <ImageBackground
            source={require('../../../assets/images/ui/setting/reset_modal_frame.png')}
            style={styles.frame}
            imageStyle={styles.stretchImage}
            resizeMode="stretch"
            capInsets={FRAME_CAP}
          >
            <View style={[styles.content, { paddingHorizontal: padH, paddingTop: padTop, paddingBottom: padBottom }]}>
              <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <DividerStar size={16} color={RED} style={styles.star} />
                <Text style={[styles.title, { fontSize: titleFontSize, lineHeight: titleFontSize + 4 }]}>
                  {t('settings.resetPasswordModalTitle')}
                </Text>
                <View style={styles.titleDivider} />
                <Text style={styles.subtitle}>{t('settings.resetPasswordHint')}</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>{t('login.email')}</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('login.emailPlaceholder')}
                    placeholderTextColor={COLORS.text.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    editable={!submitting}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>{t('settings.verificationCode')}</Text>
                  <View style={styles.codeRow}>
                    <TextInput
                      style={[styles.input, styles.codeInput]}
                      value={code}
                      onChangeText={setCode}
                      placeholder={t('settings.enter6DigitCode')}
                      placeholderTextColor={COLORS.text.muted}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!submitting}
                    />
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={handleSendCode}
                      disabled={sendingCode || submitting || cooldown > 0}
                      style={{
                        width: sendBtnWidth,
                        height: sendBtnHeight,
                        opacity: sendingCode || cooldown > 0 ? 0.6 : 1,
                      }}
                    >
                      <ImageBackground
                        source={require('../../../assets/images/ui/setting/reset_btn_send_code.png')}
                        style={styles.sendBtnBg}
                        imageStyle={styles.stretchImage}
                        resizeMode="stretch"
                        capInsets={BTN_SEND_CAP}
                      >
                        {sendingCode ? (
                          <ActivityIndicator size="small" color={GOLD} />
                        ) : (
                          <Text
                            style={[styles.sendBtnText, { fontSize: sendBtnFontSize }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.82}
                          >
                            {cooldown > 0
                              ? tp('login.resendCooldown', { seconds: cooldown })
                              : codeSent
                                ? t('settings.resetBtnResendCode')
                                : t('settings.resetBtnSendCode')}
                          </Text>
                        )}
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>{t('login.newPassword')}</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={t('settings.enterNewPassword')}
                      placeholderTextColor={COLORS.text.muted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      editable={!submitting}
                    />
                    <Pressable
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={COLORS.text.muted}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>{t('settings.confirmNewPassword')}</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={t('settings.confirmNewPasswordPlaceholder')}
                      placeholderTextColor={COLORS.text.muted}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      editable={!submitting}
                    />
                    <Pressable
                      style={styles.eyeBtn}
                      onPress={() => setShowConfirmPassword((v) => !v)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={COLORS.text.muted}
                      />
                    </Pressable>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.footerRow}>
                <ModalButton
                  source={require('../../../assets/images/ui/setting/reset_btn_cancel.png')}
                  capInsets={BTN_CANCEL_CAP}
                  height={footerBtnHeight}
                  label={t('settings.resetBtnCancel')}
                  labelColor={LABEL}
                  fontSize={modalBtnFontSize}
                  onPress={onClose}
                  disabled={submitting}
                />
                <ModalButton
                  source={require('../../../assets/images/ui/setting/reset_btn_submit.png')}
                  capInsets={BTN_SUBMIT_CAP}
                  height={footerBtnHeight}
                  label={t('settings.resetBtnSubmit')}
                  labelColor={RED}
                  fontSize={modalBtnFontSize}
                  onPress={handleSubmit}
                  disabled={submitting}
                  loading={submitting}
                />
              </View>
            </View>
          </ImageBackground>
        </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cardOuter: {
    maxWidth: '100%',
    overflow: 'hidden',
  },
  frame: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  stretchImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  star: {
    alignSelf: 'center',
    marginBottom: 2,
  },
  title: Typo(
    {
      color: RED,
      fontWeight: '700',
      letterSpacing: 1.4,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    'display',
  ),
  titleDivider: {
    height: 1,
    backgroundColor: RED,
    opacity: 0.85,
    marginTop: 2,
    marginBottom: 2,
  },
  subtitle: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
      marginBottom: 4,
    },
    'sans',
  ),
  field: {
    gap: 5,
  },
  label: Typo(
    {
      color: LABEL,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  input: {
    backgroundColor: 'rgba(8, 9, 12, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(90, 82, 72, 0.55)',
    borderRadius: 4,
    color: COLORS.text.primary,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeInput: {
    flex: 1,
  },
  sendBtnBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  sendBtnText: Typo(
    {
      color: GOLD,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'display',
  ),
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    height: '100%',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    flexShrink: 0,
  },
  modalBtnWrap: {
    flex: 1,
  },
  modalBtnBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  modalBtnText: Typo(
    {
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'display',
  ),
});
