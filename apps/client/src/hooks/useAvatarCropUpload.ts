import { useCallback } from 'react';
import { getMe } from '../api/auth';
import { uploadUserAvatar } from '../api/user';
import { useI18n } from '../i18n/I18nContext';
import { useAuthStore } from '../stores/authStore';
import { Message } from '../components/ui/Message';
import { pickUserAvatarImage } from '../utils/pickRoleImage';
import { AVATAR_CROP_OUTPUT } from '../utils/cropAvatarImage';
import { useCropUpload } from './useCropUpload';

type UseAvatarCropUploadOptions = {
  onUserUpdated?: (user: Awaited<ReturnType<typeof getMe>>) => void;
};

/** 个人中心头像上传。 */
export function useAvatarCropUpload(options: UseAvatarCropUploadOptions = {}) {
  const { t } = useI18n();
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const upload = useCallback(
    async (file: Parameters<typeof uploadUserAvatar>[0], filename: string) => {
      await uploadUserAvatar(file, filename);
      const meData = await getMe();
      options.onUserUpdated?.(meData);
      await refreshUser();
      Message.success(t('profile.avatarUpdated'));
      return meData;
    },
    [options, refreshUser, t],
  );

  const onError = useCallback(() => {
    Message.error(t('profile.avatarUploadFailed'));
  }, [t]);

  const { cropPick, uploading, handlePick, handleCropCancel, handleCropConfirm } = useCropUpload({
    pick: pickUserAvatarImage,
    output: AVATAR_CROP_OUTPUT,
    upload,
    onError,
  });

  return {
    cropPick,
    avatarUploading: uploading,
    handleAvatarPress: handlePick,
    handleCropCancel,
    handleCropConfirm,
  };
}
