import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import type { ContentReportReason } from '../../../api/community';
import { SOCIAL } from './socialTokens';

const REASONS: ContentReportReason[] = [
  'spam',
  'harassment',
  'hate',
  'sexual',
  'illegal',
  'ip',
  'other',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (reason: ContentReportReason) => void;
};

export function SocialReportReasonModal({ visible, onClose, onSelect }: Props) {
  const { t } = useI18n();
  const label = (code: ContentReportReason) => {
    switch (code) {
      case 'spam':
        return t('social.reportReasonSpam');
      case 'harassment':
        return t('social.reportReasonHarassment');
      case 'hate':
        return t('social.reportReasonHate');
      case 'sexual':
        return t('social.reportReasonSexual');
      case 'illegal':
        return t('social.reportReasonIllegal');
      case 'ip':
        return t('social.reportReasonIp');
      default:
        return t('social.reportReasonOther');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{t('social.reportTitle')}</Text>
          {REASONS.map((code) => (
            <Pressable
              key={code}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => onSelect(code)}
            >
              <Text style={styles.itemText}>{label(code)}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>{t('menu.back')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  title: {
    color: SOCIAL.name,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  itemText: {
    color: SOCIAL.name,
    fontSize: 15,
  },
  cancel: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cancelText: {
    color: SOCIAL.handle,
    fontSize: 14,
    textAlign: 'center',
  },
});
