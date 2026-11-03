import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { ConfirmModalPanel } from '../ui/GeneralConfirmModal';

interface MatureGateProps {
  visible: boolean;
  onSelect: (mature: boolean) => void;
}

export function MatureGate({ visible, onSelect }: MatureGateProps) {
  const { t } = useI18n();
  const [confirmMature, setConfirmMature] = useState(false);

  useEffect(() => {
    if (!visible) setConfirmMature(false);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        {confirmMature ? (
          <ConfirmModalPanel
            icon="warning"
            title={t('matureGate.confirmTitle')}
            subtitle={t('matureGate.warning')}
            cancelLabel={t('matureGate.back')}
            confirmLabel={t('matureGate.confirm')}
            onCancel={() => setConfirmMature(false)}
            onConfirm={() => onSelect(true)}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>{t('matureGate.title')}</Text>
            <Text style={styles.subtitle}>{t('matureGate.subtitle')}</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => onSelect(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{t('matureGate.standardTitle')}</Text>
              <Text style={styles.hint}>{t('matureGate.standardHint')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.matureButton]}
              onPress={() => setConfirmMature(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.matureText]}>{t('matureGate.matureTitle')}</Text>
              <Text style={[styles.hint, styles.matureHint]}>{t('matureGate.matureHint')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.bg.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
  },
  title: Typo(
    {
      color: COLORS.text.primary,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 6,
    },
    'display',
  ),
  subtitle: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 13,
      marginBottom: 18,
    },
    'sans',
  ),
  button: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  matureButton: {
    borderColor: COLORS.accent.red,
    backgroundColor: 'rgba(196, 30, 58, 0.1)',
  },
  buttonText: Typo(
    {
      color: COLORS.text.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    'sans',
  ),
  matureText: {
    color: COLORS.accent.red,
  },
  hint: Typo(
    {
      color: COLORS.text.muted,
      fontSize: 11,
      marginTop: 4,
    },
    'sans',
  ),
  matureHint: {
    color: 'rgba(196, 30, 58, 0.7)',
  },
});
