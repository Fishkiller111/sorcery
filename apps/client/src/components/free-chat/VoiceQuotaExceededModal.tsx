import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { DismissTodayCheckbox } from '../common/DismissTodayCheckbox';
import {
  isDismissedToday,
  saveDismissToday,
  VOICE_QUOTA_DISMISS_TODAY_KEY,
} from '../../utils/dismissTodayStorage';
import type { FreeChatUiVariant } from './freeChatUi';

type VoiceQuotaExceededModalProps = {
  visible: boolean;
  variant?: FreeChatUiVariant;
  onClose: () => void;
  onUpgrade: () => void;
};

export async function shouldShowVoiceQuotaExceededModal(): Promise<boolean> {
  return !(await isDismissedToday(VOICE_QUOTA_DISMISS_TODAY_KEY));
}

/** 语音配额不足：按当前主题切换 Default / Soviet 确认框 */
export function VoiceQuotaExceededModal({
  visible,
  variant = 'soviet',
  onClose,
  onUpgrade,
}: VoiceQuotaExceededModalProps) {
  const { t } = useI18n();
  const [dismissToday, setDismissToday] = useState(false);
  const checkboxVariant = variant === 'default' ? 'default' : 'soviet';

  useEffect(() => {
    if (visible) setDismissToday(false);
  }, [visible]);

  const finish = useCallback(
    async (next: () => void) => {
      if (dismissToday) {
        await saveDismissToday(VOICE_QUOTA_DISMISS_TODAY_KEY);
      }
      setDismissToday(false);
      next();
    },
    [dismissToday],
  );

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="warning"
      title={t('chat.voiceQuotaExceededTitle')}
      subtitle={t('chat.voiceQuotaExceededMessage')}
      subtitleTone="body"
      cancelLabel={t('confirmModal.cancel')}
      confirmLabel={t('chat.quotaUpgrade')}
      onCancel={() => void finish(onClose)}
      onConfirm={() => void finish(onUpgrade)}
      footerExtra={
        <View style={styles.footerExtra}>
          <DismissTodayCheckbox
            label={t('announcement.dismissToday')}
            checked={dismissToday}
            onToggle={() => setDismissToday((v) => !v)}
            variant={checkboxVariant}
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footerExtra: {
    alignItems: 'center',
  },
});
