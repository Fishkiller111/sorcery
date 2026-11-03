import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';

type MatureConfirmModalProps = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function MatureConfirmModal({ visible, onConfirm, onCancel }: MatureConfirmModalProps) {
  const { t } = useI18n();

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="warning"
      title={t('matureGate.confirmTitle')}
      subtitle={t('matureGate.warning')}
      cancelLabel={t('matureGate.back')}
      confirmLabel={t('matureGate.confirm')}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
