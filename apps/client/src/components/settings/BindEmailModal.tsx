import React, { useMemo } from 'react';
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
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../theme/system/ThemeContext';
import { DefaultBindEmailModal } from '../../pages/default/components/DefaultBindEmailModal';
import { useBindEmailForm } from '../../hooks/useBindEmailForm';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { MessageHost } from '../ui/Message';
import { DividerStar } from '../ui/DividerStar';

const FRAME_CAP = { left: 100, top: 88, right: 100, bottom: 88 };
const BTN_CANCEL_CAP = { left: 52, top: 30, right: 52, bottom: 30 };
const BTN_SUBMIT_CAP = { left: 52, top: 30, right: 52, bottom: 30 };
const BTN_SEND_CAP = { left: 28, top: 28, right: 28, bottom: 28 };
const RED = '#c43e3e';
const GOLD = '#c9a86c';
const LABEL = '#8a8278';

type BindEmailModalProps = {
  visible: boolean;
  initialEmail?: string;
  emailBound?: boolean;
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
          <Text style={[styles.modalBtnText, { color: labelColor, fontSize }]} numberOfLines={1}>
            {label}
          </Text>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}

export function BindEmailModal({
  visible,
  initialEmail = '',
  emailBound = false,
  onClose,
  onSuccess,
}: BindEmailModalProps) {
  const { themeId, loaded } = useTheme();
  if (themeId === 'default' && loaded) {
    return (
      <DefaultBindEmailModal
        visible={visible}
        initialEmail={initialEmail}
        emailBound={emailBound}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }
  return (
    <SovietBindEmailModal
      visible={visible}
      initialEmail={initialEmail}
      emailBound={emailBound}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function SovietBindEmailModal({
  visible,
  initialEmail = '',
  emailBound = false,
  onClose,
  onSuccess,
}: BindEmailModalProps) {
  const { t, tp } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const form = useBindEmailForm({
    visible,
    initialEmail,
    emailBound,
    onClose,
    onSuccess,
    t,
  });

  const cardWidth = useMemo(() => Math.min(Math.round(windowWidth * 0.9), 620), [windowWidth]);
  const cardHeight = Math.min(Math.round(cardWidth * 0.78), 520);
  const padH = 36;
  const padTop = 28;
  const padBottom = 22;
  const titleFontSize = 18;
  const sendBtnWidth = 118;
  const sendBtnHeight = 44;
  const sendBtnFontSize = 10;
  const footerBtnHeight = 48;
  const modalBtnFontSize = 12;

  return (
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
                  {t('settings.bindEmailModalTitle')}
                </Text>
                <View style={styles.titleDivider} />
                <Text style={styles.subtitle}>{t('settings.bindEmailHint')}</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>{t('login.email')}</Text>
                  <TextInput
                    style={styles.input}
                    value={form.email}
                    onChangeText={form.setEmail}
                    placeholder={t('login.emailPlaceholder')}
                    placeholderTextColor={COLORS.text.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    editable={!form.submitting}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>{t('settings.verificationCode')}</Text>
                  <View style={styles.codeRow}>
                    <TextInput
                      style={[styles.input, styles.codeInput]}
                      value={form.code}
                      onChangeText={form.setCode}
                      placeholder={t('settings.enter6DigitCode')}
                      placeholderTextColor={COLORS.text.muted}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!form.submitting}
                    />
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() => void form.handleSendCode()}
                      disabled={form.sendingCode || form.submitting || form.cooldown > 0}
                      style={{
                        width: sendBtnWidth,
                        height: sendBtnHeight,
                        opacity: form.sendingCode || form.cooldown > 0 ? 0.6 : 1,
                      }}
                    >
                      <ImageBackground
                        source={require('../../../assets/images/ui/setting/reset_btn_send_code.png')}
                        style={styles.sendBtnBg}
                        imageStyle={styles.stretchImage}
                        resizeMode="stretch"
                        capInsets={BTN_SEND_CAP}
                      >
                        {form.sendingCode ? (
                          <ActivityIndicator size="small" color={GOLD} />
                        ) : (
                          <Text
                            style={[styles.sendBtnText, { fontSize: sendBtnFontSize }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.82}
                          >
                            {form.cooldown > 0
                              ? tp('login.resendCooldown', { seconds: form.cooldown })
                              : form.codeSent
                                ? t('settings.resetBtnResendCode')
                                : t('settings.resetBtnSendCode')}
                          </Text>
                        )}
                      </ImageBackground>
                    </TouchableOpacity>
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
                  disabled={form.submitting}
                />
                <ModalButton
                  source={require('../../../assets/images/ui/setting/reset_btn_submit.png')}
                  capInsets={BTN_SUBMIT_CAP}
                  height={footerBtnHeight}
                  label={t('settings.bindEmailSubmit')}
                  labelColor={RED}
                  fontSize={modalBtnFontSize}
                  onPress={() => void form.handleSubmit()}
                  disabled={form.submitting}
                  loading={form.submitting}
                />
              </View>
            </View>
          </ImageBackground>
        </View>
      </View>
      {visible ? <MessageHost /> : null}
    </Modal>
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
