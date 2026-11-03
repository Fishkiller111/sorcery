import { useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { useAuthStore } from '../../stores/authStore';
import { toAppLang } from '../../utils/userLang';

/** Apply backend user.system_lang to local UI language after auth restore / login. */
export function UserLangSync() {
  const isRestored = useAuthStore((s) => s.isRestored);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const systemLang = useAuthStore((s) => s.user?.system_lang);
  const { lang, loaded, setLang } = useI18n();

  useEffect(() => {
    if (!loaded || !isRestored || !isLoggedIn || !systemLang) return;
    const appLang = toAppLang(systemLang);
    if (appLang !== lang) {
      setLang(appLang);
    }
  }, [loaded, isRestored, isLoggedIn, systemLang, lang, setLang]);

  return null;
}
