import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import type { Lang } from '../i18n/types';
import { toAppLang } from './userLang';

/**
 * Default UI language when the user has no stored preference.
 * Web always starts in English (directory listings / reviewers often use non-EN OS locales).
 * Native apps still follow the device locale.
 */
export function getDeviceAppLang(): Lang {
  if (Platform.OS === 'web') return 'en';
  const code = getLocales()[0]?.languageCode;
  return toAppLang(code);
}
