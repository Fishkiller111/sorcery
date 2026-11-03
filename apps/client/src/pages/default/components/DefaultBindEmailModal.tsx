import React, { useMemo } from 'react';
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
import { Typo } from '../../../theme/typography';
import { themedScrollViewProps } from '../../../theme/webScrollbar';
import { MessageHost } from '../../../components/ui/Message';
import { DefaultAuthField } from './DefaultAuthField';
import { DefaultConfirmModalPanel } from './DefaultGeneralConfirmModal';
import { TOKENS } from '../theme/tokens';
import { useBindEmailForm } from '../../../hooks/useBindEmailForm';

type DefaultBindEmailModalProps = {
  visible: boolean;
  initialEmail?: string;
  emailBound?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function DefaultBindEmailModal({
  visible,
  initialEmail = '',
  emailBound = false,
  onClose,
  onSuccess,
}: DefaultBindEmailModalProps) {
  const { t, tp } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const form = useBindEmailForm({
    visible,
    initialEmail,
    emailBound,
    onClose,
    onSuccess,
    t,
  });

  const cardWidth = Math.min(Math.round(windowWidth * 0.92), 520);
  const sendCodeLabel =
    form.cooldown > 0
      ? tp('login.resendCooldown', { seconds: form.cooldown })
      : form.codeSent
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
      <Text style={styles.hint}>{t('settings.bindEmailHint')}</Text>
      <DefaultAuthField
        label={t('login.email')}
        value={form.email}
        onChangeText={form.setEmail}
        placeholder={t('login.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        editable={!form.submitting}
      />
      <DefaultAuthField
        label={t('settings.verificationCode')}
        value={form.code}
        onChangeText={form.setCode}
        placeholder={t('settings.enter6DigitCode')}
        keyboardType="number-pad"
        maxLength={6}
        editable={!form.submitting}
        footer={
          <Pressable
            onPress={() => void form.handleSendCode()}
            disabled={form.sendingCode || form.submitting || form.cooldown > 0}
            style={({ pressed }) => [
              styles.sendCodeBtn,
              (form.sendingCode || form.cooldown > 0) && styles.sendCodeBtnDisabled,
              pressed && !form.sendingCode && form.cooldown === 0 && styles.sendCodeBtnPressed,
            ]}
          >
            {form.sendingCode ? (
              <ActivityIndicator size="small" color={TOKENS.colors.text} />
            ) : (
              <Text style={styles.sendCodeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {sendCodeLabel}
              </Text>
            )}
          </Pressable>
        }
      />
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <DefaultConfirmModalPanel
          icon="warning"
          title={t('settings.bindEmailModalTitle')}
          bodyMaxHeight={320}
          bodyContent={bodyContent}
          cardWidth={cardWidth}
          cancelLabel={t('settings.resetBtnCancel')}
          confirmLabel={t('settings.bindEmailSubmit')}
          onCancel={onClose}
          onConfirm={() => void form.handleSubmit()}
          loading={form.submitting}
        />
      </View>
      {visible ? <MessageHost /> : null}
    </Modal>
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
