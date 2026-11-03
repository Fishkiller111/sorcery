import React, { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../i18n/I18nContext';
import { GeneralConfirmModal } from '../ui/GeneralConfirmModal';
import type { SurveyItem } from '../../types/api';

type SurveyPromptModalProps = {
  survey: SurveyItem | null;
};

export function SurveyPromptModal({ survey }: SurveyPromptModalProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  const pending = survey != null && !survey.submitted;

  useFocusEffect(
    useCallback(() => {
      if (pending) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    }, [pending]),
  );

  if (!pending || !survey) return null;

  const subtitle = survey.description?.trim() || t('survey.promptBody');

  return (
    <GeneralConfirmModal
      visible={visible}
      icon="star"
      title={survey.title || t('survey.menuTitle')}
      subtitle={subtitle}
      subtitleTone="body"
      confirmLabel={t('survey.promptGo')}
      cancelLabel={t('survey.promptLater')}
      dismissOnBackdrop={false}
      onCancel={() => setVisible(false)}
      onConfirm={() => {
        setVisible(false);
        router.push(`/survey/${survey.survey_id}`);
      }}
    />
  );
}
