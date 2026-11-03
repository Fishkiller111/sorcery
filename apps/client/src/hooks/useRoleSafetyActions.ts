import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  blockCommunityUser,
  createContentReport,
  type ContentReportReason,
} from '../api/community';
import { useI18n } from '../i18n/I18nContext';
import { useAuthStore } from '../stores/authStore';
import { formatApiError } from '../utils/apiError';
import { notifyError, notifySuccess } from '../utils/notify';
import { requireLoginForAction } from '../utils/requireLogin';

type UseRoleSafetyActionsOptions = {
  roleId: string;
  creatorUserId?: string;
  onBlocked?: () => void;
};

/** 角色主页举报 / 拉黑：复用社区 UGC 安全接口。 */
export function useRoleSafetyActions({
  roleId,
  creatorUserId,
  onBlocked,
}: UseRoleSafetyActionsOptions) {
  const { t } = useI18n();
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const openReport = useCallback(() => {
    if (!roleId) return;
    if (!requireLoginForAction(isLoggedIn, router, t('social.loginToComment'))) return;
    setReportOpen(true);
  }, [isLoggedIn, roleId, router, t]);

  const openBlock = useCallback(() => {
    if (!roleId) return;
    if (!requireLoginForAction(isLoggedIn, router, t('social.loginToComment'))) return;
    setBlockOpen(true);
  }, [isLoggedIn, roleId, router, t]);

  const submitReport = useCallback(
    async (reason: ContentReportReason) => {
      setReportOpen(false);
      if (!roleId) return;
      try {
        await createContentReport({
          target_type: 'role',
          target_id: roleId,
          reason_code: reason,
        });
        notifySuccess(t('social.reportSubmitted'));
      } catch (err) {
        notifyError(t('social.reportFailed'), formatApiError(t, err));
      }
    },
    [roleId, t],
  );

  const confirmBlock = useCallback(async () => {
    setBlockOpen(false);
    if (!roleId) return;
    try {
      await blockCommunityUser({
        role_id: roleId,
        user_id: creatorUserId || undefined,
        reason_code: 'harassment',
      });
      notifySuccess(t('social.blockOk'));
      onBlocked?.();
    } catch (err) {
      notifyError(t('social.blockFailed'), formatApiError(t, err));
    }
  }, [creatorUserId, onBlocked, roleId, t]);

  return {
    reportOpen,
    blockOpen,
    setReportOpen,
    setBlockOpen,
    openReport,
    openBlock,
    submitReport,
    confirmBlock,
  };
}
