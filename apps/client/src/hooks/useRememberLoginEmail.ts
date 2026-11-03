import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBER_KEY = '@soulthread_login_remember';
const EMAIL_KEY = '@soulthread_login_email';

export function useRememberLoginEmail() {
  const [rememberMe, setRememberMe] = useState(true);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.multiGet([REMEMBER_KEY, EMAIL_KEY])
      .then((pairs) => {
        if (!mounted) return;
        const remember = pairs[0]?.[1] !== '0';
        const email = pairs[1]?.[1]?.trim() || null;
        setRememberMe(remember);
        setSavedEmail(remember ? email : null);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleRememberMe = useCallback(() => {
    setRememberMe((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(REMEMBER_KEY, next ? '1' : '0');
      if (!next) {
        void AsyncStorage.removeItem(EMAIL_KEY);
        setSavedEmail(null);
      }
      return next;
    });
  }, []);

  const persistEmail = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      if (!rememberMe || !trimmed) {
        await AsyncStorage.removeItem(EMAIL_KEY);
        return;
      }
      await AsyncStorage.setItem(EMAIL_KEY, trimmed);
      await AsyncStorage.setItem(REMEMBER_KEY, '1');
      setSavedEmail(trimmed);
    },
    [rememberMe],
  );

  return {
    rememberMe,
    ready,
    savedEmail,
    toggleRememberMe,
    persistEmail,
  };
}
