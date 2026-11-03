import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang } from './types';
import { getCommon, getCommonParams } from './common';
import { isAppLang, nextAppLang } from './langs';
import { getDeviceAppLang } from '../utils/deviceLang';
import { setApiLangResolver } from '../api/apiLang';

const LANG_STORAGE_KEY = '@soulthread_scene_lang';

interface I18nContextValue {
  lang: Lang;
  loaded: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string) => string;
  tp: (key: string, params: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  loaded: false,
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string) => key,
  tp: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LANG_STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        if (stored && isAppLang(stored)) {
          setLangState(stored);
        } else {
          setLangState(getDeviceAppLang());
        }
        setLoaded(true);
      })
      .catch(() => {
        if (mounted) {
          setLangState(getDeviceAppLang());
          setLoaded(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setApiLangResolver(() => lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(LANG_STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleLang = useCallback(() => {
    setLang(nextAppLang(lang));
  }, [lang, setLang]);

  const t = useCallback((key: string) => getCommon(key, lang), [lang]);
  const tp = useCallback(
    (key: string, params: Record<string, string | number>) => getCommonParams(key, lang, params),
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, loaded, setLang, toggleLang, t, tp }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
