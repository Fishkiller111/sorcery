import { isOpsUser } from "../../config.js";
import type { BotContext } from "../context.js";
import { openAppKeyboard } from "../keyboards.js";

const OPS_HELP = [
  "",
  "Ops:",
  "/drop <roleId> [aff] — Channel Character Drop pack",
  "/aff <affCode> — RevShare share links",
  "/stats [YYYY-MM-DD] — Funnel from event logs",
].join("\n");

export async function handleHelp(ctx: BotContext): Promise<void> {
  let text = ctx.t("help.body");
  if (isOpsUser(ctx.config, ctx.from?.id)) {
    text = `${text}${OPS_HELP}`;
  }

  await ctx.reply(text, {
    reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    link_preview_options: { is_disabled: true },
  });
}
