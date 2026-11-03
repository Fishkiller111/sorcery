/** Shared Telegram WebApp + Login Widget typings for web. */

export type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    start_param?: string;
  };
  ready?: () => void;
  expand?: () => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
};

export type TelegramLoginUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export type TelegramLoginApi = {
  auth: (
    options: { bot_id: number; request_access?: boolean },
    callback: (user: TelegramLoginUser | false) => void,
  ) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
      Login?: TelegramLoginApi;
    };
  }
}

export {};
