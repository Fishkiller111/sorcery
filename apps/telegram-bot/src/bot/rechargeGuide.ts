import { existsSync } from "node:fs";
import path from "node:path";
import { InputFile } from "grammy";
import type { LocaleCode, MessageKey } from "../i18n/index.js";
import type { BotContext } from "./context.js";

type PhotoPack = "zh" | "en";

type RechargeStep = {
  file: string;
  captionKey: MessageKey;
  /** Wallet UI screenshots have zh / en packs; payment-page shots are shared. */
  localized?: boolean;
};

const STEPS: RechargeStep[] = [
  { file: "00-choose-usdt.png", captionKey: "support.rechargeStepChoose" },
  { file: "01-wallet-send.png", captionKey: "support.rechargeStepWallet", localized: true },
  { file: "02-select-network.png", captionKey: "support.rechargeStepNetwork", localized: true },
  { file: "03-pay-qr.png", captionKey: "support.rechargeStepPay" },
];

/** Cached Telegram file_id after first upload (process lifetime). */
const cachedFileIds = new Map<string, string>();

function photoPack(locale: LocaleCode): PhotoPack {
  return locale.startsWith("zh") ? "zh" : "en";
}

function cacheKey(pack: PhotoPack, step: RechargeStep): string {
  return step.localized ? `${pack}/${step.file}` : step.file;
}

function stepPath(pack: PhotoPack, step: RechargeStep): string {
  const root = path.join(process.cwd(), "assets", "recharge");
  if (step.localized) return path.join(root, pack, step.file);
  return path.join(root, step.file);
}

/**
 * Illustrated crypto top-up. Wallet screenshots follow the user locale
 * (zh vs en); payment-page shots are shared. Captions always use ctx.t.
 */
export async function sendRechargeGuidePhotos(ctx: BotContext): Promise<void> {
  const pack = photoPack(ctx.locale);
  for (const step of STEPS) {
    const key = cacheKey(pack, step);
    const file = stepPath(pack, step);
    const cached = cachedFileIds.get(key);
    if (!cached && !existsSync(file)) {
      console.warn("[recharge-guide] missing screenshot:", file);
      continue;
    }

    const caption = ctx.t(step.captionKey);
    try {
      const msg = cached
        ? await ctx.replyWithPhoto(cached, { caption })
        : await ctx.replyWithPhoto(new InputFile(file, step.file), { caption });
      const id = msg.photo?.at(-1)?.file_id;
      if (id) cachedFileIds.set(key, id);
    } catch (err) {
      console.warn("[recharge-guide] send photo failed", key, err);
      cachedFileIds.delete(key);
    }
  }
}
