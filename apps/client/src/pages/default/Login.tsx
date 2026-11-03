import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  Linking,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLoginScreen } from '../../hooks/useLoginScreen';
import { useRememberLoginEmail } from '../../hooks/useRememberLoginEmail';
import { Typo } from '../../theme/typography';
import { AuthForm } from '../../components/auth/AuthForm';
import { ThemedGeneralConfirmModal } from '../../components/ui/ThemedGeneralConfirmModal';
import { VIP_PRIVACY_URL, VIP_TERMS_URL, VIP_LEGAL_READY } from '../../components/vip/VipSubscriptionLegalLinks';
import { DefaultAuthBackground } from './components/DefaultAuthBackground';
import { DefaultAuthEmblem } from './components/DefaultAuthEmblem';
import { DefaultAuthField } from './components/DefaultAuthField';
import { DefaultAuthCodeField } from './components/DefaultAuthCodeField';
import { DefaultAuthPrimaryButton } from './components/DefaultAuthPrimaryButton';
import { DefaultAuthSocialSection } from './components/DefaultAuthSocialSection';
import { DefaultAuthRememberRow } from './components/DefaultAuthRememberRow';
import { TOKENS } from './theme/tokens';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { Ionicons } from '@expo/vector-icons';

export function DefaultLoginScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth - 40, 440);
  const safeAreaPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  const {
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
  } = useLoginScreen();

  const { rememberMe, ready, savedEmail, toggleRememberMe, persistEmail } =
    useRememberLoginEmail();

  useEffect(() => {
    if (!ready || !savedEmail || email) return;
    setEmail(savedEmail);
  }, [ready, savedEmail, email, setEmail]);

  const onSubmit = useCallback(async () => {
    if (mode === 'login') {
      await persistEmail(email);
    }
    await handleSubmit();
  }, [email, handleSubmit, mode, persistEmail]);

  const titleText = useMemo(() => {
    if (mode === 'login') return t('login.defaultTitleLogin');
    if (mode === 'register') return t('login.defaultTitleRegister');
    return t('login.defaultTitleReset');
  }, [mode, t]);

  const subtitleText = useMemo(() => {
    if (mode === 'login') return t('login.defaultSubtitleLogin');
    if (mode === 'register') return t('login.defaultSubtitleRegister');
    return t('login.defaultSubtitleReset');
  }, [mode, t]);

  const primaryBtnLabel =
    mode === 'login' ? t('login.defaultSignIn') : submitLabel;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <DefaultAuthBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, safeAreaPadding]}
      >
        <ScrollView
          {...scrollWebProps}
          style={scrollWebProps.style}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { width: contentWidth }]}>
            <DefaultAuthEmblem />

            {mode === 'reset' ? (
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => switchMode('login')}
                activeOpacity={0.7}
                disabled={submitting}
              >
                <Text style={styles.backLinkText}>{t('login.backToLogin')}</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.title}>{titleText}</Text>
            <Text style={styles.subtitle}>{subtitleText}</Text>

            {inviteBannerText ? (
              <View
                style={[
                  styles.inviteBanner,
                  invitePreview?.activity_status === 'ended' && styles.inviteBannerEnded,
                ]}
              >
                <Text style={styles.inviteBannerText}>{inviteBannerText}</Text>
              </View>
            ) : null}

            <AuthForm onSubmit={onSubmit} style={styles.authForm}>
              <View style={styles.fields}>
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
                  label={mode === 'reset' ? t('login.newPassword') : t('login.password')}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('login.passwordPlaceholder')}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  footer={
                    mode === 'login' ? (
                      <DefaultAuthRememberRow
                        rememberLabel={t('login.rememberMe')}
                        forgotLabel={t('login.defaultForgotPassword')}
                        checked={rememberMe}
                        onToggleRemember={toggleRememberMe}
                        onForgotPassword={() => switchMode('reset')}
                        disabled={submitting}
                      />
                    ) : undefined
                  }
                />

                {mode !== 'login' ? (
                  <DefaultAuthField
                    label={t('login.confirmPassword')}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t('login.confirmPassword')}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!submitting}
                  />
                ) : null}

                {mode === 'register' ? (
                  <DefaultAuthField
                    label={t('referral.inviteCode')}
                    value={inviteCode}
                    onChangeText={(v) => setInviteCode(v.toUpperCase())}
                    placeholder={t('referral.inviteCodePlaceholder')}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!submitting}
                  />
                ) : null}

                {mode !== 'login' ? (
                  <DefaultAuthCodeField
                    label={t('login.code')}
                    value={code}
                    onChangeText={setCode}
                    placeholder={t('login.codePlaceholder')}
                    onSendCode={handleSendCode}
                    sending={sendingCode}
                    codeSent={codeSent}
                    cooldownSeconds={cooldown}
                    cooldownLabel={tp('login.resendCooldown', { seconds: cooldown })}
                    sendLabel={t('login.sendCode')}
                    resendLabel={t('login.resend')}
                    disabled={submitting}
                  />
                ) : null}
              </View>

              <DefaultAuthPrimaryButton
                label={submitting ? submitLoadingLabel : primaryBtnLabel}
                onPress={handleSubmit}
                disabled={submitting}
                loading={submitting}
              />
            </AuthForm>

            {mode !== 'reset' ? (
              <Pressable
                style={styles.termsRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
                disabled={submitting || !VIP_LEGAL_READY}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: termsAccepted }}
              >
                <Ionicons
                  name={termsAccepted ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={termsAccepted ? TOKENS.colors.accent : TOKENS.colors.textMuted}
                />
                <Text style={styles.termsText}>
                  {t('login.termsAgreePrefix')}{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      VIP_TERMS_URL && void Linking.openURL(VIP_TERMS_URL);
                    }}
                  >
                    {t('login.termsOfUse')}
                  </Text>{' '}
                  {t('login.termsAgreeAnd')}{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      VIP_PRIVACY_URL && void Linking.openURL(VIP_PRIVACY_URL);
                    }}
                  >
                    {t('login.privacyPolicy')}
                  </Text>
                  {!VIP_LEGAL_READY ? `\n${t('login.legalConfigMissing')}` : ''}
                </Text>
              </Pressable>
            ) : null}

            {mode !== 'reset' ? (
              <DefaultAuthSocialSection
                dividerLabel={t('login.defaultOr')}
                onGoogleCredential={handleGoogleCredential}
                onAppleCredential={handleAppleCredential}
                onAppleError={handleAppleError}
                onTelegramCredential={handleTelegramCredential}
                onTelegramError={handleTelegramError}
                disabled={submitting}
              />
            ) : null}

            {mode !== 'reset' ? (
              <View style={styles.footerRow}>
                <Text style={styles.footerMuted}>
                  {mode === 'login' ? t('login.defaultNoAccount') : t('login.defaultHasAccount')}{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  <Text style={styles.footerLink}>
                    {mode === 'login' ? t('login.defaultCreateThread') : t('login.defaultSignIn')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ThemedGeneralConfirmModal
        visible={passwordNotSetVisible}
        icon="warning"
        title={t('login.passwordNotSet')}
        hideCancel
        confirmLabel={t('system.ok')}
        onCancel={() => setPasswordNotSetVisible(false)}
        onConfirm={() => {
          setPasswordNotSetVisible(false);
          switchMode('reset');
        }}
      />

      {turnstileGate}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.colors.bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    maxWidth: '100%',
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as object)
      : {}),
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backLinkText: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 13,
      fontWeight: '500',
    },
    'sans',
  ),
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 34,
      lineHeight: 40,
      textAlign: 'center',
      marginBottom: 10,
    },
    'serif',
  ),
  subtitle: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: 28,
      maxWidth: 320,
      alignSelf: 'center',
    },
    'sans',
  ),
  fields: {
    gap: 18,
    marginBottom: 22,
  },
  authForm: {
    width: '100%',
  },
  inviteBanner: {
    backgroundColor: TOKENS.colors.inviteBanner,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    borderRadius: TOKENS.radius.input,
    padding: 12,
    marginBottom: 18,
  },
  inviteBannerEnded: {
    backgroundColor: TOKENS.colors.inviteBannerEnded,
    borderColor: TOKENS.colors.inviteBannerEndedBorder,
  },
  inviteBannerText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
    'sans',
  ),
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  termsText: Typo(
    {
      flex: 1,
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    'sans',
  ),
  termsLink: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 12,
      lineHeight: 18,
      textDecorationLine: 'underline',
    },
    'sans',
  ),
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  footerMuted: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    'sans',
  ),
  footerLink: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    'sans',
  ),
});
