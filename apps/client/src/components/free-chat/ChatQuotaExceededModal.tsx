import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';

type ChatQuotaExceededModalProps = {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

/** 对话配额耗尽硬拦截：仅「订阅会员」，无取消按钮 */
export function ChatQuotaExceededModal({ visible, onClose, onUpgrade }: ChatQuotaExceededModalProps) {
  const { t } = useI18n();

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="star"
      title={t('chat.quotaExceededTitle')}
      subtitle={t('chat.quotaExceededMessage')}
      subtitleTone="body"
      bodyMaxHeight={160}
      confirmLabel={t('chat.quotaUpgrade')}
      hideCancel
      dismissOnBackdrop={false}
      onCancel={onClose}
      onConfirm={onUpgrade}
    />
  );
}
