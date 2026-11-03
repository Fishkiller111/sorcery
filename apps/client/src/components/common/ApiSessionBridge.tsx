import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { setApiLangResolver } from '../../api/apiLang';
import { setUnauthorizedHandler } from '../../api/unauthorized';
import { useI18n } from '../../i18n/I18nContext';
import { useAuthStore } from '../../stores/authStore';
import { notifyWarning } from '../../utils/notify';

/** Wire API client to current UI language and global 401 handling. */
export function ApiSessionBridge() {
  const { lang, t } = useI18n();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  useEffect(() => {
    setApiLangResolver(() => lang);
  }, [lang]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      notifyWarning(t('auth.sessionExpired'));
      router.replace('/login');
    });
  }, [logout, router, t]);

  return null;
}
