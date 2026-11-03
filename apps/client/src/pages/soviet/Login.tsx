import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  useWindowDimensions,
  Linking,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLoginScreen } from '../../hooks/useLoginScreen';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { GrainOverlay } from '../../components/common/GrainOverlay';
import { AuthField } from '../../components/auth/AuthField';
import { AuthCodeField } from '../../components/auth/AuthCodeField';
import { AuthForm } from '../../components/auth/AuthForm';
import { AuthPrimaryButton } from '../../components/auth/AuthPrimaryButton';
import { AuthModeTabs } from '../../components/auth/AuthModeTabs';
import { AuthTitleHeader } from '../../components/auth/AuthTitleHeader';
import { AuthSocialSection } from '../../components/auth/AuthSocialSection';
import { GeneralConfirmModal } from '../../components/ui/GeneralConfirmModal';
import { VIP_PRIVACY_URL, VIP_TERMS_URL, VIP_LEGAL_READY } from '../../components/vip/VipSubscriptionLegalLinks';
import { AUTH_ASSETS, AUTH_RED } from '../../components/auth/authTheme';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';

export function SovietLoginScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth - 40, 440);
  const safeAreaPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('soviet'), []);

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
    inviteBannerText,
    submitLabel,
    submitLoadingLabel,
    turnstileGate,
  } = useLoginScreen();

  const titleText =
    mode === 'login'
      ? t('login.title')
      : mode === 'register'
        ? t('login.register')
        : t('login.resetPassword');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['#141210', '#0a0b0f', '#050508']} style={StyleSheet.absoluteFill} />
      <GrainOverlay />

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
          <View style={[styles.form, { width: contentWidth }]}>
            <Image
              source={AUTH_ASSETS.formPanelBg}
              style={styles.formBgImage}
              resizeMode="stretch"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <View style={styles.formInner}>
              <Image source={AUTH_ASSETS.emblem} style={styles.formEmblem} resizeMode="contain" />

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

              <AuthTitleHeader title={titleText} subtitle={t('login.subtitle')} />

              {mode !== 'reset' ? (
                <AuthModeTabs
                  mode={mode}
                  loginLabel={t('login.login')}
                  registerLabel={t('login.register')}
                  onChange={(next) => switchMode(next)}
                  disabled={submitting}
                />
              ) : null}

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

              <AuthForm onSubmit={handleSubmit} style={styles.authForm}>
                <View style={styles.fields}>
                  <AuthField
                    label={t('login.email')}
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('login.emailPlaceholder')}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    editable={!submitting}
                  />

                  <AuthField
                    label={mode === 'reset' ? t('login.newPassword') : t('login.password')}
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('login.passwordPlaceholder')}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!submitting}
                    footer={
                      mode === 'login' ? (
                        <TouchableOpacity
                          style={styles.forgotLink}
                          onPress={() => switchMode('reset')}
                          activeOpacity={0.7}
                          disabled={submitting}
                        >
                          <Text style={styles.forgotLinkText}>{t('login.resetPassword')}</Text>
                        </TouchableOpacity>
                      ) : undefined
                    }
                  />

                  {mode !== 'login' ? (
                    <AuthField
                      label={t('login.confirmPassword')}
                      icon="lock-closed-outline"
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
                    <AuthField
                      label={t('referral.inviteCode')}
                      icon="ticket-outline"
                      value={inviteCode}
                      onChangeText={(v) => setInviteCode(v.toUpperCase())}
                      placeholder={t('referral.inviteCodePlaceholder')}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!submitting}
                    />
                  ) : null}

                  {mode !== 'login' ? (
                    <AuthCodeField
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

                <AuthPrimaryButton
                  label={submitting ? submitLoadingLabel : submitLabel}
                  onPress={handleSubmit}
                  disabled={submitting}
                  loading={submitting}
                  style={styles.primaryBtn}
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
                    color={termsAccepted ? AUTH_RED : COLORS.text.muted}
                  />
                  <Text style={styles.termsText}>
                    {t('login.termsAgreePrefix')}{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => VIP_TERMS_URL && void Linking.openURL(VIP_TERMS_URL)}
                    >
                      {t('login.termsOfUse')}
                    </Text>{' '}
                    {t('login.termsAgreeAnd')}{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => VIP_PRIVACY_URL && void Linking.openURL(VIP_PRIVACY_URL)}
                    >
                      {t('login.privacyPolicy')}
                    </Text>
                  {!VIP_LEGAL_READY ? `\n${t('login.legalConfigMissing')}` : ''}
                  </Text>
                </Pressable>
              ) : null}

              {mode !== 'reset' ? (
                <AuthSocialSection
                  label={t('login.orContinueWith')}
                  onGoogleCredential={handleGoogleCredential}
                  onAppleCredential={handleAppleCredential}
                  onAppleError={handleAppleError}
                  disabled={submitting}
                />
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <GeneralConfirmModal
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
    backgroundColor: COLORS.bg.primary,
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
  form: {
    maxWidth: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 6,
  },
  formBgImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    borderRadius: 6,
    ...(Platform.OS === 'web'
      ? ({
          objectFit: 'fill',
        } as object)
      : {}),
  },
  formInner: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 32,
  },
  formEmblem: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 52,
    height: 52,
    opacity: 0.95,
    zIndex: 1,
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backLinkText: Typo(
    {
      color: AUTH_RED,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    'mono',
  ),
  fields: {
    gap: 16,
    marginBottom: 20,
  },
  authForm: {
    width: '100%',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  termsText: Typo(
    {
      flex: 1,
      color: COLORS.text.secondary,
      fontSize: 12,
      lineHeight: 18,
    },
    'sans',
  ),
  termsLink: Typo(
    {
      color: AUTH_RED,
      fontSize: 12,
      lineHeight: 18,
      textDecorationLine: 'underline',
    },
    'sans',
  ),
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingVertical: 2,
  },
  forgotLinkText: Typo(
    {
      color: AUTH_RED,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    'mono',
  ),
  inviteBanner: {
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.35)',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  inviteBannerEnded: {
    backgroundColor: 'rgba(158, 27, 27, 0.15)',
    borderColor: 'rgba(158, 27, 27, 0.4)',
  },
  inviteBannerText: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
    'sans',
  ),
  primaryBtn: {
    marginTop: 4,
  },
});
