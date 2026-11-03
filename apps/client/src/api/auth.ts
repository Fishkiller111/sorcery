import { apiFetch } from './client';
import type {
  AppleAuthReq,
  AppleAuthResp,
  GoogleAuthReq,
  GoogleAuthResp,
  LoginReq,
  LoginResp,
  RegisterReq,
  RegisterResp,
  ResetPasswordReq,
  ResetPasswordResp,
  SendCodeReq,
  SendCodeResp,
  TelegramAuthReq,
  TelegramAuthResp,
  TelegramWidgetAuthReq,
  UserInfo,
  UserProfileResp,
} from '../types/api';

export async function sendCode(
  email: string,
  type: 'register' | 'reset',
  turnstileToken?: string,
): Promise<SendCodeResp> {
  const body: SendCodeReq = { email, type };
  if (turnstileToken) body.turnstile_token = turnstileToken;
  return apiFetch<SendCodeResp>('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function register(req: RegisterReq): Promise<RegisterResp> {
  return apiFetch<RegisterResp>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function login(
  email: string,
  password: string,
  turnstileToken?: string,
): Promise<LoginResp> {
  const body: LoginReq = { email, password };
  if (turnstileToken) body.turnstile_token = turnstileToken;
  return apiFetch<LoginResp>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function loginWithGoogle(
  idToken: string,
  inviteCode?: string,
  aff?: string,
): Promise<GoogleAuthResp> {
  const body: GoogleAuthReq = { id_token: idToken };
  if (inviteCode) body.invite_code = inviteCode;
  if (aff) body.aff = aff;
  return apiFetch<GoogleAuthResp>('/auth/google', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function loginWithApple(
  req: AppleAuthReq,
): Promise<AppleAuthResp> {
  return apiFetch<AppleAuthResp>('/auth/apple', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function loginWithTelegram(
  initData: string,
  aff?: string,
  inviteCode?: string,
): Promise<TelegramAuthResp> {
  const body: TelegramAuthReq = { init_data: initData };
  if (aff) body.aff = aff;
  if (inviteCode) body.invite_code = inviteCode;
  return apiFetch<TelegramAuthResp>('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function loginWithTelegramWidget(
  req: TelegramWidgetAuthReq,
): Promise<TelegramAuthResp> {
  return apiFetch<TelegramAuthResp>('/auth/telegram/widget', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function resetPassword(req: ResetPasswordReq): Promise<ResetPasswordResp> {
  return apiFetch<ResetPasswordResp>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getMe(): Promise<UserInfo> {
  return apiFetch<UserInfo>('/users/me');
}

export async function getUserProfile(): Promise<UserProfileResp> {
  return apiFetch<UserProfileResp>('/users/profile');
}
