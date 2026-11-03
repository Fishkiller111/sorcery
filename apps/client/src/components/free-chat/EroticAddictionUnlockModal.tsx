import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import type { EroticAddictionUnlockedPayload } from '../../api/eroticKinks';

type Props = {
  visible: boolean;
  payload: EroticAddictionUnlockedPayload | null;
  onClose: () => void;
  onViewKinks: () => void;
};

const PANEL = {
  bg: '#0B0D18',
  text: '#F7F8FC',
  muted: '#7E879E',
  accent: '#E84B6A',
  line: 'rgba(255,255,255,0.08)',
} as const;

export function EroticAddictionUnlockModal({ visible, payload, onClose, onViewKinks }: Props) {
  const { t, tp } = useI18n();
  if (!payload) return null;

  const name =
    t(`freeChat.kinkAddiction.${payload.category}` as 'freeChat.kinkAddiction.anal') ||
    payload.label;
  const all9 = payload.all9_achieved;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>
            {all9 ? t('freeChat.kinkAll9Title') : t('freeChat.kinkUnlockTitle')}
          </Text>
          <Text style={styles.body}>
            {all9
              ? t('freeChat.kinkAll9Body')
              : tp('freeChat.kinkUnlockBody', { name })}
          </Text>
          {all9 && payload.reward_points > 0 ? (
            <Text style={styles.reward}>
              {tp('freeChat.kinkAll9Reward', { points: String(payload.reward_points) })}
            </Text>
          ) : (
            <Text style={styles.hint}>{t('freeChat.kinkUnlockHint')}</Text>
          )}
          <View style={styles.row}>
            <Pressable style={styles.secondary} onPress={onViewKinks}>
              <Text style={styles.secondaryText}>{t('freeChat.kinkUnlockView')}</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={onClose}>
              <Text style={styles.primaryText}>{t('freeChat.kinkUnlockDismiss')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 28,
  },
  sheet: {
    backgroundColor: PANEL.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PANEL.line,
    padding: 22,
  },
  title: { ...Typo({ fontSize: 18, fontWeight: '600' }), color: PANEL.text, marginBottom: 10 },
  body: { ...Typo({ fontSize: 15 }), color: PANEL.text, marginBottom: 8 },
  hint: { ...Typo({ fontSize: 12 }), color: PANEL.muted, marginBottom: 16 },
  reward: { ...Typo({ fontSize: 13, fontWeight: '600' }), color: PANEL.accent, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  secondary: { paddingVertical: 10, paddingHorizontal: 14 },
  secondaryText: { ...Typo({ fontSize: 13, fontWeight: '600' }), color: PANEL.muted },
  primary: {
    backgroundColor: PANEL.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryText: { ...Typo({ fontSize: 13, fontWeight: '600' }), color: '#fff' },
});
