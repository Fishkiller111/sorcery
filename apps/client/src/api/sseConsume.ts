import { Platform } from 'react-native';
import { ApiError } from './client';
import { handleUnauthorized } from './unauthorized';

/** RN/Hermes has no DOMException — use Error with name AbortError instead. */
export function createAbortError(): Error {
  const err = new Error('Aborted');
  err.name = 'AbortError';
  return err;
}

export function isAbortError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'name' in err && (err as Error).name === 'AbortError') {
    return true;
  }
  if (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') {
    return true;
  }
  return false;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

export function feedSSEBuffer(buffer: string, onData: (raw: string) => void): string {
  let rest = buffer;
  let lineBreak = rest.indexOf('\n\n');
  while (lineBreak >= 0) {
    const block = rest.slice(0, lineBreak);
    rest = rest.slice(lineBreak + 2);
    for (const line of block.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const raw = trimmed.slice(5).trim();
      if (raw) onData(raw);
    }
    lineBreak = rest.indexOf('\n\n');
  }
  return rest;
}

function supportsFetchEventStream(): boolean {
  return Platform.OS === 'web';
}

export async function readFetchEventStream(
  res: Response,
  onData: (raw: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new ApiError('No response body', res.status);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();
      if (done) break;
      buffer = feedSSEBuffer(buffer + decoder.decode(value, { stream: true }), onData);
    }
    feedSSEBuffer(buffer, onData);
  } catch (err) {
    if (signal?.aborted || isAbortError(err)) {
      throw err;
    }
    throw new ApiError('SSE connection lost', 0, 'SSE_DISCONNECTED');
  }
}

export async function postXhrEventStream(
  url: string,
  headers: Record<string, string>,
  body: string,
  onData: (raw: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let offset = 0;
    let buffer = '';
    let settled = false;

    const finish = (err?: unknown) => {
      if (settled) return;
      settled = true;
      if (err) {
        reject(err);
        return;
      }
      feedSSEBuffer(buffer, onData);
      resolve();
    };

    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };

    xhr.open('POST', url);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.onprogress = () => {
      const chunk = xhr.responseText.slice(offset);
      offset = xhr.responseText.length;
      if (!chunk) return;
      buffer = feedSSEBuffer(buffer + chunk, onData);
    };

    xhr.onload = () => {
      cleanup();
      const status = xhr.status;
      if (status === 401) {
        handleUnauthorized();
        finish(new ApiError('Unauthorized', 401, 'AUTH_EXPIRED'));
        return;
      }
      if (status < 200 || status >= 300) {
        let message = `API error ${status}`;
        let code: string | undefined;
        try {
          const errBody = JSON.parse(xhr.responseText) as { message?: string; error_code?: string; code?: string | number };
          if (errBody.message) message = errBody.message;
          if (errBody.error_code) code = errBody.error_code;
          else if (errBody.code != null) code = String(errBody.code);
        } catch {
          if (xhr.responseText) message = xhr.responseText;
        }
        finish(new ApiError(message, status, code));
        return;
      }

      const chunk = xhr.responseText.slice(offset);
      offset = xhr.responseText.length;
      if (chunk) {
        buffer = feedSSEBuffer(buffer + chunk, onData);
      }
      finish();
    };

    xhr.onerror = () => {
      cleanup();
      finish(new ApiError('SSE connection lost', 0, 'SSE_DISCONNECTED'));
    };

    xhr.onabort = () => {
      cleanup();
      finish(createAbortError());
    };

    xhr.send(body);
  });
}

export async function postEventStream(
  url: string,
  headers: Record<string, string>,
  body: string,
  onData: (raw: string) => void,
  signal?: AbortSignal,
): Promise<Response | null> {
  if (!supportsFetchEventStream()) {
    await postXhrEventStream(url, headers, body, onData, signal);
    return null;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal,
  });
  if (!res.ok) {
    return res;
  }
  await readFetchEventStream(res, onData, signal);
  return res;
}
