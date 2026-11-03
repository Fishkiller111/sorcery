import { Platform } from 'react-native';
import { getApiBase } from '../constants/config';
import { getApiAcceptLanguage } from './apiLang';
import { handleUnauthorized } from './unauthorized';
import { matureOptInHeaderValue } from '../utils/matureOptIn';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Maps React Native Platform.OS to backend X-Client-Platform (web|ios|android). */
export function getClientPlatformHeader(): string {
  switch (Platform.OS) {
    case 'ios':
      return 'ios';
    case 'android':
      return 'android';
    default:
      return 'web';
  }
}

export function applyClientHeaders(headers: Record<string, string>) {
  headers['X-Client-Platform'] = getClientPlatformHeader();
  const matureOptIn = matureOptInHeaderValue();
  if (matureOptIn) {
    headers['X-Mature-Opt-In'] = matureOptIn;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 401 codes that mean the current session/token is invalid (logout). */
const SESSION_EXPIRED_CODES = new Set(['AUTH_005', 'AUTH_006', 'AUTH_008', 'AUTH_EXPIRED']);

async function parseErrorBody(res: Response): Promise<{ message: string; code?: string }> {
  let message = `API error ${res.status}`;
  let code: string | undefined;
  try {
    const errBody = await res.json();
    // 后端可能返回 message 或 error_message（如 IMGGEN_007 内容审核）
    if (typeof errBody.error_message === 'string' && errBody.error_message.trim()) {
      message = errBody.error_message.trim();
    } else if (typeof errBody.message === 'string' && errBody.message.trim()) {
      message = errBody.message.trim();
    }
    if (typeof errBody.error_code === 'string' && errBody.error_code.trim()) {
      code = errBody.error_code.trim();
    } else if (typeof errBody.code === 'string' && errBody.code.trim()) {
      code = errBody.code.trim();
    }
  } catch {
    const text = await res.text().catch(() => '');
    if (text) message = text;
  }
  return { message, code };
}

/**
 * Clear local session only for authenticated calls whose 401 means token/session death.
 * Login/register/reset return 401 for wrong password / bad code — those must NOT logout.
 */
function maybeHandleSessionExpiry(status: number, code: string | undefined) {
  if (status !== 401 || !authToken) return;
  if (!code || SESSION_EXPIRED_CODES.has(code)) {
    handleUnauthorized();
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': getApiAcceptLanguage(),
  };
  applyClientHeaders(headers);

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (options?.headers) {
    const extra = options.headers as Record<string, string>;
    for (const key of Object.keys(extra)) {
      headers[key] = extra[key];
    }
  }

  const url = `${getApiBase()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ApiError(
      `Network error: cannot reach API (${getApiBase()}). ${detail}`,
      0,
      'NETWORK_ERROR',
    );
  }

  if (!res.ok) {
    const { message, code: parsedCode } = await parseErrorBody(res);
    let code = parsedCode;
    if (res.status === 401 && authToken && !code) {
      code = 'AUTH_EXPIRED';
    }
    maybeHandleSessionExpiry(res.status, code);
    throw new ApiError(message, res.status, code);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }

  return {} as T;
}
