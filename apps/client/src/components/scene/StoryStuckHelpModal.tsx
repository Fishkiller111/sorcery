import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { GeneralConfirmModal } from '../ui/GeneralConfirmModal';

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function StoryStuckHelpModal({ visible, onAccept, onDecline }: Props) {
  const { t } = useI18n();

  return (
    <GeneralConfirmModal
      visible={visible}
      icon="star"
      title={t('scene.stuckHelpTitle')}
      subtitle={t('scene.stuckHelpSubtitle')}
      subtitleTone="body"
      cancelLabel={t('scene.stuckHelpDecline')}
      confirmLabel={t('scene.stuckHelpConfirm')}
      onCancel={onDecline}
      onConfirm={onAccept}
      dismissOnBackdrop={false}
    />
  );
}
