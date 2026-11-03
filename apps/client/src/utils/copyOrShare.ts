import { Platform, Share } from 'react-native';

let webShareInFlight: Promise<CopyOrShareResult> | null = null;

export type CopyOrShareResult = 'shared' | 'copied' | false;

function isAbortLike(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === 'AbortError' || /abort|cancel/i.test(err.message);
}

function isShareBusy(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === 'InvalidStateError' ||
    /earlier share has not yet completed|share.*not yet completed/i.test(err.message)
  );
}

async function copyTextWeb(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

/** 仅复制到剪贴板（不唤起系统分享面板）。Web 用 Clipboard API；Native 回落 Share。 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  if (Platform.OS === 'web') {
    return copyTextWeb(text);
  }
  try {
    const result = await Share.share({ message: text });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

/**
 * Web: prefer system share sheet; if share is busy/unsupported, copy to clipboard.
 * Native: RN Share sheet.
 * Returns 'shared' | 'copied' | false (cancelled / unsupported).
 */
export async function copyOrShareText(
  text: string,
  dialogTitle?: string,
): Promise<CopyOrShareResult> {
  if (!text) return false;
  if (Platform.OS === 'web') {
    const run = async (): Promise<CopyOrShareResult> => {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: dialogTitle || 'Soulthread', text });
          return 'shared';
        } catch (err: unknown) {
          if (isAbortLike(err)) return false;
          const copied = await copyTextWeb(text);
          if (copied) return 'copied';
          if (isShareBusy(err)) return false;
          throw err;
        }
      }
      return (await copyTextWeb(text)) ? 'copied' : false;
    };

    if (webShareInFlight) {
      try {
        await webShareInFlight;
      } catch {
        /* ignore */
      }
      return (await copyTextWeb(text)) ? 'copied' : false;
    }

    webShareInFlight = run().finally(() => {
      webShareInFlight = null;
    });
    return webShareInFlight;
  }

  const result = await Share.share(
    Platform.OS === 'ios'
      ? {
          // iOS：message 必填才能弹出面板；url 单独传更易被系统识别为链接
          message: text,
          title: dialogTitle,
        }
      : { message: text, title: dialogTitle },
  );
  if (result.action === Share.sharedAction) return 'shared';
  return false;
}

/** 任务分享：仅在用户完成系统分享面板操作后才返回 true */
export async function shareTaskLink(opts: {
  url: string;
  text?: string;
  title?: string;
}): Promise<boolean> {
  const url = opts.url?.trim();
  if (!url) return false;
  const text = opts.text?.trim();
  const title = opts.title?.trim() || 'Soulthread';
  const message = [text, url].filter(Boolean).join('\n');

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: text || undefined,
          url,
        });
        return true;
      } catch (err: unknown) {
        if (isAbortLike(err) || isShareBusy(err)) return false;
        throw err;
      }
    }
    return false;
  }

  const result = await Share.share(
    Platform.OS === 'ios'
      ? { message: message || url, url, title }
      : { message, title },
  );
  return result.action === Share.sharedAction;
}
