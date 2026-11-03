import type { TelegramWidgetAuthReq } from '../../types/api';

type Props = {
  onCredential: (payload: TelegramWidgetAuthReq) => void;
  disabled?: boolean;
  onReadyChange?: (ready: boolean) => void;
  onError?: (error: unknown) => void;
};

/** Native: Telegram Login Widget is web-only — never render. */
export function TelegramSignInButton(_props: Props) {
  return null;
}
