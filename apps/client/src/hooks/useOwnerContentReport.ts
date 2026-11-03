import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { createContentReport, type ContentReportReason } from '../api/community';
import { useI18n } from '../i18n/I18nContext';
import { useAuthStore } from '../stores/authStore';
import { formatApiError } from '../utils/apiError';
import { notifyError, notifySuccess } from '../utils/notify';
import { requireLoginForAction } from '../utils/requireLogin';

type Options = {
  ownerUserId?: string;
  /** Optional moderator context, e.g. world play session path. */
  detail?: string;
};

/** Report play-session content via the creator account (UGC safety API). */
export function useOwnerContentReport({ ownerUserId, detail }: Options) {
  const { t } = useI18n();
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [reportOpen, setReportOpen] = useState(false);

  const openReport = useCallback(() => {
    if (!ownerUserId) return;
    if (!requireLoginForAction(isLoggedIn, router, t('social.loginToComment'))) return;
    setReportOpen(true);
  }, [isLoggedIn, ownerUserId, router, t]);

  const submitReport = useCallback(
    async (reason: ContentReportReason) => {
      setReportOpen(false);
      if (!ownerUserId) return;
      try {
        await createContentReport({
          target_type: 'user',
          target_id: ownerUserId,
          reason_code: reason,
          detail: detail?.trim() || undefined,
        });
        notifySuccess(t('social.reportSubmitted'));
      } catch (err) {
        notifyError(t('social.reportFailed'), formatApiError(t, err));
      }
    },
    [detail, ownerUserId, t],
  );

  return {
    reportOpen,
    setReportOpen,
    openReport,
    submitReport,
    canReport: Boolean(ownerUserId),
  };
}
