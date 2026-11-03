import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';

type ChatSoftUpsellModalProps = {
  visible: boolean;
  onLater: () => void;
  onSubscribe: () => void;
};

/** 免费用户本会话发送超过 10 条时的软提醒（可稍后再说继续聊） */
export function ChatSoftUpsellModal({ visible, onLater, onSubscribe }: ChatSoftUpsellModalProps) {
  const { t } = useI18n();

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="star"
      title={t('chat.softUpsellTitle')}
      subtitle={t('chat.softUpsellMessage')}
      subtitleTone="body"
      bodyMaxHeight={160}
      cancelLabel={t('chat.softUpsellLater')}
      confirmLabel={t('chat.softUpsellSubscribe')}
      dismissOnBackdrop
      onCancel={onLater}
      onConfirm={onSubscribe}
    />
  );
}
