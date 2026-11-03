import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { MessageHost } from '../ui/Message';

export const FIGURE_REGENERATE_PROMPT_MAX = 150;

type FigureRegenerateModalProps = {
  visible: boolean;
  accentColor?: string;
  costLabel?: string;
  onClose: () => void;
  onConfirm: (prompt: string) => void;
};

/** 立绘重绘：自定义提示词弹层 */
export function FigureRegenerateModal({
  visible,
  accentColor = '#BA3C47',
  costLabel,
  onClose,
  onConfirm,
}: FigureRegenerateModalProps) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const cost = costLabel ?? t('createAgent.wizard.previewFree');

  useEffect(() => {
    if (visible) setPrompt('');
  }, [visible]);

  const trimmed = prompt.trim();
  const overLimit = prompt.length > FIGURE_REGENERATE_PROMPT_MAX;
  const canSubmit = !overLimit;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={styles.card}>
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('confirmModal.cancel')}
          >
            <Ionicons name="close" size={18} color="#F2F2F4" />
          </Pressable>

          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: `${accentColor}33` }]}>
              <Ionicons name="sync" size={18} color="#F2F2F4" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('createAgent.wizard.regenerateTitle')}</Text>
              <Text style={styles.subtitle}>{t('createAgent.wizard.regenerateSubtitle')}</Text>
            </View>
          </View>

          <View style={styles.promptHeader}>
            <View style={styles.promptLabelRow}>
              <Ionicons name="sparkles-outline" size={14} color="#E8C56A" />
              <Text style={styles.promptLabel}>{t('createAgent.wizard.regeneratePromptLabel')}</Text>
            </View>
            <Text style={[styles.counter, overLimit && { color: accentColor }]}>
              {prompt.length}/{FIGURE_REGENERATE_PROMPT_MAX}
            </Text>
          </View>

          <TextInput
            style={styles.input}
            value={prompt}
            onChangeText={setPrompt}
            placeholder={t('createAgent.wizard.regeneratePromptPlaceholder')}
            placeholderTextColor="rgba(132,132,132,0.75)"
            multiline
            maxLength={FIGURE_REGENERATE_PROMPT_MAX + 20}
            textAlignVertical="top"
          />

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: accentColor },
              !canSubmit && styles.submitDisabled,
              pressed && canSubmit && styles.submitPressed,
            ]}
            disabled={!canSubmit}
            onPress={() => {
              if (!canSubmit) return;
              onConfirm(trimmed);
            }}
          >
            <Ionicons name="sync" size={18} color="#fff" />
            <Text style={styles.submitText}>{t('createAgent.wizard.regenerateAction')}</Text>
            <View style={styles.submitDivider} />
            <Text style={styles.submitCost}>{cost}</Text>
          </Pressable>
        </View>
        {visible ? <MessageHost /> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 5, 8, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: '#12151c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    gap: 14,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 16px 48px rgba(0,0,0,0.45)' } as object)
      : { elevation: 12 }),
  },
  closeBtn: {
    position: 'absolute',
    top: -40,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: Typo(
    {
      color: '#F2F2F4',
      fontSize: 18,
      fontWeight: '700',
    },
    'sans',
  ),
  subtitle: Typo(
    {
      color: 'rgba(132,132,132,0.9)',
      fontSize: 13,
      lineHeight: 18,
    },
    'sans',
  ),
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promptLabel: Typo(
    {
      color: '#F2F2F4',
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
  counter: Typo(
    {
      color: 'rgba(132,132,132,0.75)',
      fontSize: 12,
    },
    'mono',
  ),
  input: {
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(8,10,15,0.9)',
    color: '#F2F2F4',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  submitBtn: {
    marginTop: 4,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitPressed: {
    transform: [{ scale: 0.98 }],
  },
  submitText: Typo(
    {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    'sans',
  ),
  submitDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: 2,
  },
  submitCost: Typo(
    {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    'mono',
  ),
});
