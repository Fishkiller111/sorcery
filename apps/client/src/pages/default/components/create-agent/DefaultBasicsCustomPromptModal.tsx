import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { useI18n } from '../../../../i18n/I18nContext';
import { MessageHost } from '../../../../components/ui/Message';

type DefaultBasicsCustomPromptModalProps = {
  visible: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
};

export function DefaultBasicsCustomPromptModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  onClose,
  onConfirm,
}: DefaultBasicsCustomPromptModalProps) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{t('createAgent.wizard.basicsCustomHint')}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={TOKENS.colors.textMuted}
            multiline
            textAlignVertical="top"
            style={styles.input}
            autoFocus
          />
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.btnPressed]}
              onPress={onClose}
            >
              <Text style={styles.btnGhostText}>{t('chat.close')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                !canSave && styles.btnDisabled,
                pressed && canSave && styles.btnPressed,
              ]}
              disabled={!canSave}
              onPress={() => onConfirm(trimmed)}
            >
              <Text style={[styles.btnPrimaryText, !canSave && styles.btnDisabledText]}>
                {t('createAgent.wizard.basicsCustomConfirm')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      {visible ? <MessageHost /> : null}
    </Modal>
  );
}

const glass =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      } as object)
    : {};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    padding: 18,
    gap: 12,
    ...glass,
  },
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    'serif',
  ),
  hint: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    'sans',
  ),
  input: {
    minHeight: 120,
    maxHeight: 200,
    borderRadius: TOKENS.radius.input,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    color: TOKENS.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: TOKENS.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnPrimary: {
    backgroundColor: TOKENS.colors.accent,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
  },
  btnGhostText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  btnPrimaryText: Typo(
    {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    'sans',
  ),
  btnDisabledText: {
    color: 'rgba(255,255,255,0.7)',
  },
});
