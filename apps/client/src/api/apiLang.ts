import { toBackendLang } from '../utils/userLang';
import type { Lang } from '../i18n/types';

let resolveLang: () => Lang = () => 'en';

export function setApiLangResolver(fn: () => Lang) {
  resolveLang = fn;
}

export function getApiAcceptLanguage(): string {
  return toBackendLang(resolveLang());
}
