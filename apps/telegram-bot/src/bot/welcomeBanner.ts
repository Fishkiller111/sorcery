import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { InputFile } from "grammy";
import type { InlineKeyboard } from "grammy";
import type { BotContext } from "./context.js";

/** Cached Telegram file_id after first upload (process lifetime). */
let cachedVideoFileId: string | undefined;

function bannerPath(): string {
  return path.join(process.cwd(), "assets", "welcome-banner.mp4");
}

/**
 * Send the Soulthread welcome banner video (Lucid Dreams–style header media).
 * Falls back to false so caller can send text-only welcome.
 */
export async function sendWelcomeBanner(
  ctx: BotContext,
  caption: string,
  replyMarkup: InlineKeyboard,
): Promise<boolean> {
  const file = bannerPath();
  if (!existsSync(file) && !cachedVideoFileId) {
    console.warn("[welcome] banner missing:", file);
    return false;
  }

  // Telegram caption limit
  const safeCaption = caption.length > 1024 ? `${caption.slice(0, 1021)}…` : caption;

  try {
    const msg = cachedVideoFileId
      ? await ctx.replyWithVideo(cachedVideoFileId, {
          caption: safeCaption,
          reply_markup: replyMarkup,
          supports_streaming: true,
        })
      : await ctx.replyWithVideo(new InputFile(createReadStream(file), "welcome-banner.mp4"), {
          caption: safeCaption,
          reply_markup: replyMarkup,
          supports_streaming: true,
        });

    const id = msg.video?.file_id;
    if (id) cachedVideoFileId = id;
    return true;
  } catch (err) {
    console.warn("[welcome] send banner video failed", err);
    cachedVideoFileId = undefined;
    return false;
  }
}
