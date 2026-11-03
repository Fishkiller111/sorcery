import React from 'react';
import { DefaultCreationCenterPage } from '../../src/pages/default/CreationCenter';
import { useI18n } from '../../src/i18n/I18nContext';

export default function CreationCenterVoicePage() {
  const { t } = useI18n();
  return <DefaultCreationCenterPage initialTab="voice" title={t('createEntry.voiceDesign')} />;
}
