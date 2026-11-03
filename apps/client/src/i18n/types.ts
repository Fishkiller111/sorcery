export type Lang = 'zh' | 'en' | 'jp' | 'ru' | 'es';

export interface LocalizedString {
  zh: string;
  en: string;
  jp?: string;
  ru?: string;
  es?: string;
}

export type Localized = string | LocalizedString;
