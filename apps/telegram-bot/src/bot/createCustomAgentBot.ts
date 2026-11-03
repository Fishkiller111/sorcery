import { Bot, InlineKeyboard } from "grammy";
import type { LanguageCode } from "grammy/types";
import type { AppConfig } from "../config.js";
import { telegramLanguageCode } from "../i18n/index.js";
import type { BotContext, BotServices } from "./context.js";
import { attachCommonMiddleware, telegramClientOptions } from "./createBot.js";
import {
  CUSTOM_LOCALES,
  CUSTOM_LOCALE_LABELS,
  ct,
  customCommandDescriptions,
  resolveCustomLocale,
  type CustomLocale,
} from "../custom-agent/i18n.js";
import { downloadTelegramFile } from "../custom-agent/tgFile.js";
import { ApiError } from "../services/soulthread-api.js";
import type { CustomAgentOrder } from "../services/soulthread-api.js";
import type { LocaleCode } from "../i18n/index.js";

type ProductKind = "character" | "world";
type WizardStep = "name" | "appearance" | "personality" | "background" | "plot" | "notes" | "photos" | "confirm";

const CHAR_STEPS: WizardStep[] = ["name", "appearance", "personality", "background", "notes", "photos", "confirm"];
const WORLD_STEPS: WizardStep[] = ["name", "background", "personality", "plot", "notes", "photos", "confirm"];
const MAX_REFS = 3;

function loc(ctx: BotContext): CustomLocale {
  return resolveCustomLocale(ctx.session.locale ?? ctx.from?.language_code);
}

function productKind(ctx: BotContext): ProductKind {
  return ctx.session.customProductKind === "world" ? "world" : "character";
}

function wizardSteps(ctx: BotContext): WizardStep[] {
  return productKind(ctx) === "world" ? WORLD_STEPS : CHAR_STEPS;
}

function uAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function homeKb(locale: CustomLocale): InlineKeyboard {
  return new InlineKeyboard()
    .text(ct(locale, "kb.custom"), "cao:custom")
    .row()
    .text(ct(locale, "kb.language"), "cao:lang")
    .text(ct(locale, "kb.orders"), "cao:orders");
}

function wizardKb(locale: CustomLocale, step: WizardStep): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (step === "photos") {
    kb.text(ct(locale, "kb.skip"), "cao:skip").text(ct(locale, "kb.photosDone"), "cao:photosdone").row();
  } else if (step === "name" || step === "notes") {
    kb.text(ct(locale, "kb.skip"), "cao:skip").row();
  }
  if (step !== "name") {
    kb.text(ct(locale, "kb.back"), "cao:back");
  }
  kb.text(ct(locale, "kb.cancel"), "cao:cancel");
  return kb;
}

async function startText(locale: CustomLocale, ctx: BotContext): Promise<string> {
  let char = "4.99";
  let world = "9.99";
  let extra = "0.99";
  let free = 3;
  try {
    const cfg = await ctx.services.api.getCustomAgentConfig();
    char = uAmount(cfg.price_cents);
    world = uAmount(cfg.world_price_cents || 999);
    extra = uAmount(cfg.extra_revision_cents || 99);
    free = cfg.max_revisions;
  } catch {
    // keep catalog defaults
  }
  return [
    ct(locale, "start.title"),
    "",
    ct(locale, "start.body"),
    "",
    ct(locale, "start.prices"),
    ct(locale, "start.priceChar", { amount: char }),
    ct(locale, "start.priceWorld", { amount: world }),
    "",
    ct(locale, "start.revisions", { free, extra }),
    "",
    ct(locale, "start.how"),
    ct(locale, "start.how1"),
    ct(locale, "start.how2"),
    ct(locale, "start.how3"),
    ct(locale, "start.how4"),
  ].join("\n");
}

function briefSummary(ctx: BotContext, brief: NonNullable<BotContext["session"]["customBrief"]>): string {
  if (productKind(ctx) === "world") {
    return [
      brief.name ? `Name: ${brief.name}` : null,
      brief.background ? `Setting: ${brief.background}` : null,
      brief.personality ? `Rules: ${brief.personality}` : null,
      brief.plot ? `Plot: ${brief.plot}` : null,
      brief.notes ? `Notes: ${brief.notes}` : null,
      brief.references?.length ? `Photos: ${brief.references.length}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    brief.name ? `Name: ${brief.name}` : null,
    brief.appearance ? `Look: ${brief.appearance}` : null,
    brief.personality ? `Personality: ${brief.personality}` : null,
    brief.background ? `Story: ${brief.background}` : null,
    brief.notes ? `Notes: ${brief.notes}` : null,
    brief.references?.length ? `Photos: ${brief.references.length}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendStart(ctx: BotContext): Promise<void> {
  const locale = loc(ctx);
  await ctx.reply(await startText(locale, ctx), { reply_markup: homeKb(locale) });
}

async function beginWizard(ctx: BotContext): Promise<void> {
  const locale = loc(ctx);
  try {
    const cfg = await ctx.services.api.getCustomAgentConfig();
    if (!cfg.is_enabled) {
      await ctx.reply(ct(locale, "paused"), { reply_markup: homeKb(locale) });
      return;
    }
  } catch (err) {
    console.warn("[custom-agent] config", err);
    await ctx.reply(ct(locale, "err"), { reply_markup: homeKb(locale) });
    return;
  }
  ctx.session.customStep = undefined;
  ctx.session.customProductKind = undefined;
  ctx.session.customBrief = {};
  await ctx.reply(ct(locale, "pick.kind"), {
    reply_markup: new InlineKeyboard()
      .text(ct(locale, "kb.kindChar"), "cao:kind:character")
      .row()
      .text(ct(locale, "kb.kindWorld"), "cao:kind:world")
      .row()
      .text(ct(locale, "kb.cancel"), "cao:cancel"),
  });
}

async function startKindWizard(ctx: BotContext, kind: ProductKind): Promise<void> {
  ctx.session.customProductKind = kind;
  ctx.session.customStep = "name";
  ctx.session.customBrief = {};
  await promptStep(ctx, "name");
}

async function showConfirm(ctx: BotContext): Promise<void> {
  const locale = loc(ctx);
  const brief = ctx.session.customBrief ?? {};
  const kind = productKind(ctx);
  let price = "";
  try {
    const cfg = await ctx.services.api.getCustomAgentConfig();
    const cents = kind === "world" ? cfg.world_price_cents || 999 : cfg.price_cents;
    price = ct(locale, "priceLine", {
      amount: uAmount(cents),
      max: cfg.max_revisions,
    });
  } catch {
    price = "";
  }
  ctx.session.customStep = "confirm";
  await ctx.reply(
    ct(locale, "wiz.confirm", { summary: briefSummary(ctx, brief), price }),
    {
      reply_markup: new InlineKeyboard()
        .text(ct(locale, "kb.pay"), "cao:pay")
        .row()
        .text(ct(locale, "kb.back"), "cao:back")
        .text(ct(locale, "kb.cancel"), "cao:cancel"),
    },
  );
}

function briefReady(ctx: BotContext): boolean {
  const brief = ctx.session.customBrief;
  if (!brief) return false;
  if (productKind(ctx) === "world") {
    return Boolean(brief.background && brief.personality && brief.plot);
  }
  return Boolean(brief.appearance && brief.personality && brief.background);
}

async function submitOrder(ctx: BotContext): Promise<void> {
  const locale = loc(ctx);
  const from = ctx.from;
  const brief = ctx.session.customBrief;
  if (!from || !briefReady(ctx) || !brief) {
    await ctx.reply(ct(locale, "wiz.needText"));
    return;
  }
  try {
    const res = await ctx.services.api.createCustomAgentOrder({
      telegramUserId: from.id,
      telegramUsername: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      languageCode: from.language_code,
      locale,
      productKind: productKind(ctx),
      brief: {
        name: brief.name,
        appearance: brief.appearance,
        personality: brief.personality,
        background: brief.background,
        plot: brief.plot,
        notes: brief.notes,
        references: brief.references ?? [],
      },
    });
    ctx.session.customStep = undefined;
    ctx.session.customBrief = undefined;
    ctx.session.customProductKind = undefined;
    await ctx.reply(ct(locale, "pay.sent"), {
      reply_markup: new InlineKeyboard()
        .url(ct(locale, "kb.pay"), res.checkout_url)
        .row()
        .text(ct(locale, "kb.verify"), `cao:verify:${res.order.id}`)
        .text(ct(locale, "kb.cancelOrder"), `cao:cancelorder:${res.order.id}`),
    });
  } catch (err) {
    console.warn("[custom-agent] create", err);
    const paused = err instanceof ApiError && err.status === 403;
    await ctx.reply(ct(locale, paused ? "paused" : "err"), { reply_markup: homeKb(locale) });
  }
}

function statusLabel(locale: CustomLocale, status: string): string {
  return ct(locale, `status.${status}`) || status;
}

async function showOrders(ctx: BotContext): Promise<void> {
  const locale = loc(ctx);
  const from = ctx.from;
  if (!from) return;
  try {
    const res = await ctx.services.api.listCustomAgentOrders(from.id);
    if (!res.items.length) {
      await ctx.reply(ct(locale, "orders.empty"), { reply_markup: homeKb(locale) });
      return;
    }
    const kb = new InlineKeyboard();
    for (const order of res.items.slice(0, 10)) {
      const kind = ct(locale, `order.kind.${order.product_kind === "world" ? "world" : "character"}`);
      kb.text(`${statusLabel(locale, order.status)} · ${kind} · ${order.id.slice(0, 8)}`, `cao:open:${order.id}`).row();
    }
    await ctx.reply(ct(locale, "orders.header"), { reply_markup: kb });
  } catch (err) {
    console.warn("[custom-agent] list", err);
    await ctx.reply(ct(locale, "err"), { reply_markup: homeKb(locale) });
  }
}

function orderKb(locale: CustomLocale, order: CustomAgentOrder, webAppUrl: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  const extraDue = order.extra_due_cents ?? 0;
  if (order.status === "awaiting_payment") {
    kb.text(ct(locale, "kb.repay"), `cao:repay:${order.id}`).text(ct(locale, "kb.verify"), `cao:verify:${order.id}`).row();
    kb.text(ct(locale, "kb.cancelOrder"), `cao:cancelorder:${order.id}`).row();
  }
  if (order.status === "awaiting_review") {
    if (order.role_id) {
      kb.url(ct(locale, "kb.preview"), `${webAppUrl}/free-chat/${encodeURIComponent(order.role_id)}`).row();
    }
    if (extraDue > 0) {
      kb.text(ct(locale, "kb.extraPay"), `cao:repay:${order.id}`).text(ct(locale, "kb.verify"), `cao:verify:${order.id}`).row();
    }
    kb.text(ct(locale, "kb.accept"), `cao:accept:${order.id}`).row();
    kb.text(ct(locale, "kb.revise"), `cao:revise:${order.id}`).row();
  }
  kb.text(ct(locale, "kb.orders"), "cao:orders");
  return kb;
}

async function showOrder(ctx: BotContext, orderId: string): Promise<void> {
  const locale = loc(ctx);
  const from = ctx.from;
  if (!from) return;
  try {
    const order = await ctx.services.api.getCustomAgentOrder(orderId, from.id);
    const kind = ct(locale, `order.kind.${order.product_kind === "world" ? "world" : "character"}`);
    const lines = [
      ct(locale, "order.detail", {
        id: order.id,
        kind,
        status: statusLabel(locale, order.status),
        rev: order.revision_count,
        max: order.max_revisions,
      }),
    ];
    if ((order.extra_due_cents ?? 0) > 0) {
      lines.push(ct(locale, "order.extraDue", { amount: uAmount(order.extra_due_cents ?? 0) }));
    }
    if (order.status === "awaiting_payment") {
      lines.push(ct(locale, "order.payTimeout"));
    }
    if (order.role?.name) lines.push(`\n${order.role.name}`);
    if (order.worldview?.name) lines.push(`\n${order.worldview.name}`);
    await ctx.reply(lines.join("\n"), { reply_markup: orderKb(locale, order, ctx.config.webAppUrl) });
  } catch (err) {
    console.warn("[custom-agent] get", err);
    await ctx.reply(ct(locale, "err"), { reply_markup: homeKb(locale) });
  }
}

async function handleCustomCallback(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data ?? "";
  const locale = loc(ctx);
  await ctx.answerCallbackQuery().catch(() => undefined);

  if (data === "cao:custom") {
    await beginWizard(ctx);
    return;
  }
  if (data === "cao:kind:character") {
    await startKindWizard(ctx, "character");
    return;
  }
  if (data === "cao:kind:world") {
    await startKindWizard(ctx, "world");
    return;
  }
  if (data === "cao:orders") {
    await showOrders(ctx);
    return;
  }
  if (data === "cao:lang") {
    const kb = new InlineKeyboard();
    for (const code of CUSTOM_LOCALES) {
      kb.text(CUSTOM_LOCALE_LABELS[code], `cao:setlang:${code}`).row();
    }
    await ctx.reply(ct(locale, "lang.prompt"), { reply_markup: kb });
    return;
  }
  if (data.startsWith("cao:setlang:")) {
    const code = data.slice("cao:setlang:".length) as CustomLocale;
    if (CUSTOM_LOCALES.includes(code)) {
      ctx.session.locale = code as LocaleCode;
      ctx.locale = code as LocaleCode;
      if (ctx.from) void ctx.services.localePrefs.set(ctx.from.id, code as LocaleCode);
    }
    await sendStart(ctx);
    return;
  }
  if (data === "cao:cancel") {
    ctx.session.customStep = undefined;
    ctx.session.customBrief = undefined;
    ctx.session.customProductKind = undefined;
    await ctx.reply(ct(locale, "wiz.cancelled"), { reply_markup: homeKb(locale) });
    return;
  }
  if (data === "cao:skip") {
    if (ctx.session.customStep === "photos") {
      await showConfirm(ctx);
      return;
    }
    await advanceWizard(ctx, "");
    return;
  }
  if (data === "cao:back") {
    const step = ctx.session.customStep;
    const steps = wizardSteps(ctx);
    const idx = steps.indexOf(step as WizardStep);
    if (idx > 0) {
      const prev = steps[idx - 1];
      ctx.session.customStep = prev;
      await promptStep(ctx, prev);
    }
    return;
  }
  if (data === "cao:pay") {
    await submitOrder(ctx);
    return;
  }
  if (data.startsWith("cao:open:")) {
    await showOrder(ctx, data.slice("cao:open:".length));
    return;
  }
  if (data.startsWith("cao:verify:")) {
    await verifyOrder(ctx, data.slice("cao:verify:".length));
    return;
  }
  if (data.startsWith("cao:repay:")) {
    await repayOrder(ctx, data.slice("cao:repay:".length));
    return;
  }
  if (data.startsWith("cao:cancelorder:")) {
    await confirmCancelOrder(ctx, data.slice("cao:cancelorder:".length));
    return;
  }
  if (data.startsWith("cao:confirmcancel:")) {
    await cancelOrder(ctx, data.slice("cao:confirmcancel:".length));
    return;
  }
  if (data.startsWith("cao:accept:")) {
    await acceptOrder(ctx, data.slice("cao:accept:".length));
    return;
  }
  if (data.startsWith("cao:revise:")) {
    ctx.session.pendingReviseOrderId = data.slice("cao:revise:".length);
    await ctx.reply(ct(locale, "revise.prompt"));
    return;
  }
  if (data === "cao:photosdone") {
    await showConfirm(ctx);
  }
}

async function promptStep(ctx: BotContext, step: WizardStep): Promise<void> {
  const locale = loc(ctx);
  if (step === "confirm") {
    await showConfirm(ctx);
    return;
  }
  const key = productKind(ctx) === "world" ? `wiz.world.${step}` : `wiz.${step}`;
  const text = ct(locale, key);
  await ctx.reply(text === key ? ct(locale, `wiz.${step}`) : text, {
    reply_markup: wizardKb(locale, step),
  });
}

async function advanceWizard(ctx: BotContext, text: string): Promise<void> {
  const locale = loc(ctx);
  const step = ctx.session.customStep;
  if (!step) return;
  const brief = ctx.session.customBrief ?? {};
  const trimmed = text.trim();
  const required =
    step === "appearance" ||
    step === "personality" ||
    step === "background" ||
    step === "plot";
  if (required && !trimmed) {
    await ctx.reply(ct(locale, "wiz.needText"));
    return;
  }
  if (step === "name") brief.name = trimmed;
  else if (step === "appearance") brief.appearance = trimmed;
  else if (step === "personality") brief.personality = trimmed;
  else if (step === "background") brief.background = trimmed;
  else if (step === "plot") brief.plot = trimmed;
  else if (step === "notes") brief.notes = trimmed;
  else if (step === "photos") {
    await ctx.reply(ct(locale, productKind(ctx) === "world" ? "wiz.world.photos" : "wiz.photos"), {
      reply_markup: wizardKb(locale, "photos"),
    });
    return;
  }
  ctx.session.customBrief = brief;
  const steps = wizardSteps(ctx);
  const idx = steps.indexOf(step);
  const next = steps[idx + 1];
  if (!next) {
    await showConfirm(ctx);
    return;
  }
  ctx.session.customStep = next;
  await promptStep(ctx, next);
}

async function verifyOrder(ctx: BotContext, orderId: string): Promise<void> {
  const locale = loc(ctx);
  const from = ctx.from;
  if (!from) return;
  try {
    const res = await ctx.services.api.customAgentOrderAction(orderId, "verify", from.id);
    const order = "order" in res && res.order ? res.order : (res as CustomAgentOrder);
    if (order.status === "awaiting_payment") {
      await ctx.reply(ct(locale, "pay.wait"), { reply_markup: orderKb(locale, order, ctx.config.webAppUrl) });
      return;
    }
    if (order.status === "awaiting_review" && (order.extra_due_cents ?? 0) > 0) {
      await ctx.reply(ct(locale, "pay.extraWait"), { reply_markup: orderKb(locale, order, ctx.config.webAppUrl) });
      return;
    }
    if (order.status === "awaiting_review" && (order.extra_due_cents ?? 0) === 0 && (order.extra_paid_cents ?? 0) > 0) {
      await ctx.reply(ct(locale, "pay.extraOk"), { reply_markup: orderKb(locale, order, ctx.config.webAppUrl) });
      return;
    }
    await ctx.reply(ct(locale, "pay.ok"), { reply_markup: homeKb(locale) });
  } catch (err) {
    console.warn("[custom-agent] verify", err);
    await ctx.reply(ct(locale, "err"));
  }
}

async function repayOrder(ctx: BotContext, orderId: string): Promise<void> {
  const locale = loc(ctx);
  const from = ctx.from;
  if (!from) return;
  try {
    const res = await ctx.services.api.customAgentOrderAction(orderId, "checkout", from.id);
    const url = "checkout_url" in res ? res.checkout_url : "";
    const order = "order" in res ? res.order : (res as CustomAgentOrder);
    if (!url) {
      await ctx.reply(ct(locale, "err"));
      return;
    }
    await ctx.reply(ct(locale, "pay.sent"), {
      reply_markup: new InlineKeyboard()
        .url(ct(locale, "kb.pay"), url)
        .row()
        .text(ct(locale, "kb.verify"), `cao:verify:${order.id}`)
        .text(
          order.status === "awaiting_payment" ? ct(locale, "kb.cancelOrder") : ct(locale, "kb.orders"),
          order.status === "awaiting_payment" ? `cao:cancelorder:${order.id}` : "cao:orders",
        ),
    });
  } catch (err) {
    console.warn("[custom-agent] checkout", err);
    await ctx.reply(ct(locale, "err"));
  }
}

async function confirmCancelOrder(ctx: BotContext, orderId: string): Promise<void> {
  const locale = loc(ctx);
  await ctx.reply(ct(locale, "order.cancelConfirm"), {
    reply_markup: new InlineKeyboard()
      .text(ct(locale, "kb.confirmCancel"), `cao:confirmcancel:${orderId}`)
      .text(ct(locale, "kb.orders"), `cao:open:${orderId}`),
  });
}

async function cancelOrder(ctx: BotContext, orderId: string): Promise<void> {
  const locale = loc(ctx);
  const from = ctx.from;
  if (!from) return;
  try {
    await ctx.services.api.customAgentOrderAction(orderId, "cancel", from.id);
    await ctx.reply(ct(locale, "order.cancelled"), { reply_markup: homeKb(locale) });
  } catch (err) {
    console.warn("[custom-agent] cancel", err);
    await ctx.reply(ct(locale, "err"));
  }
}

async function acceptOrder(ctx: BotContext, orderId: string): Promise<void> {
  const locale = loc(ctx);
  const from = ctx.from;
  if (!from) return;
  try {
    const res = await ctx.services.api.customAgentOrderAction(orderId, "accept", from.id);
    const order = "order" in res && res.order ? res.order : (res as CustomAgentOrder);
    const url = "checkout_url" in res ? res.checkout_url : order.checkout_url;
    if (url) {
      await ctx.reply(ct(locale, "accept.needExtra"), {
        reply_markup: new InlineKeyboard()
          .url(ct(locale, "kb.extraPay"), url)
          .row()
          .text(ct(locale, "kb.verify"), `cao:verify:${order.id}`),
      });
      return;
    }
    const world = order.product_kind === "world";
    await ctx.reply(ct(locale, world ? "accept.world.ok" : "accept.ok"), { reply_markup: homeKb(locale) });
  } catch (err) {
    console.warn("[custom-agent] accept", err);
    await ctx.reply(ct(locale, "err"));
  }
}

async function saveReferencePhoto(ctx: BotContext, fileId: string, filename: string): Promise<void> {
  const locale = loc(ctx);
  const from = ctx.from;
  if (!from || ctx.session.customStep !== "photos") return;
  const brief = ctx.session.customBrief ?? {};
  const refs = brief.references ?? [];
  if (refs.length >= MAX_REFS) {
    await ctx.reply(ct(locale, "photos.max"), { reply_markup: wizardKb(locale, "photos") });
    return;
  }
  try {
    const file = await ctx.api.getFile(fileId);
    if (!file.file_path) throw new Error("no file_path");
    const url = `https://api.telegram.org/file/bot${ctx.config.customAgentBotToken}/${file.file_path}`;
    const bytes = await downloadTelegramFile(url, ctx.config.telegramProxyUrl);
    const uploaded = await ctx.services.api.uploadCustomAgentReference(from.id, bytes, filename);
    refs.push(uploaded.url);
    brief.references = refs;
    ctx.session.customBrief = brief;
    if (refs.length >= MAX_REFS) {
      await ctx.reply(ct(locale, "photos.max"), { reply_markup: wizardKb(locale, "photos") });
      return;
    }
    await ctx.reply(ct(locale, "photos.ok", { n: refs.length }), { reply_markup: wizardKb(locale, "photos") });
  } catch (err) {
    console.warn("[custom-agent] photo", err);
    await ctx.reply(ct(locale, "photos.fail"), { reply_markup: wizardKb(locale, "photos") });
  }
}

export function createCustomAgentBot(
  config: AppConfig,
  services: BotServices,
): Bot<BotContext> | null {
  if (!config.customAgentBotToken) return null;

  const bot = new Bot<BotContext>(config.customAgentBotToken, {
    client: telegramClientOptions(config),
  });

  attachCommonMiddleware(bot, config, services, "custom");

  bot.command("start", async (ctx) => {
    const match = typeof ctx.match === "string" ? ctx.match.trim() : "";
    if (match.startsWith("paid_")) {
      await verifyOrder(ctx, match.slice("paid_".length));
      return;
    }
    if (match.startsWith("paycancel_")) {
      await showOrder(ctx, match.slice("paycancel_".length));
      return;
    }
    await sendStart(ctx);
  });
  bot.command("help", (ctx) => sendStart(ctx));
  bot.command("custom", (ctx) => beginWizard(ctx));
  bot.command("orders", (ctx) => showOrders(ctx));
  bot.command("language", async (ctx) => {
    const locale = loc(ctx);
    const kb = new InlineKeyboard();
    for (const code of CUSTOM_LOCALES) {
      kb.text(CUSTOM_LOCALE_LABELS[code], `cao:setlang:${code}`).row();
    }
    await ctx.reply(ct(locale, "lang.prompt"), { reply_markup: kb });
  });

  bot.on("callback_query:data", (ctx) => handleCustomCallback(ctx));
  bot.on("message:photo", async (ctx) => {
    if (ctx.session.customStep !== "photos") return;
    const photo = ctx.message?.photo?.at(-1);
    if (!photo) return;
    await saveReferencePhoto(ctx, photo.file_id, "photo.jpg");
  });
  bot.on("message:document", async (ctx) => {
    if (ctx.session.customStep !== "photos") return;
    const doc = ctx.message?.document;
    if (!doc?.mime_type?.startsWith("image/") || !doc.file_id) {
      await ctx.reply(ct(loc(ctx), "photos.fail"), { reply_markup: wizardKb(loc(ctx), "photos") });
      return;
    }
    await saveReferencePhoto(ctx, doc.file_id, doc.file_name || "photo.jpg");
  });
  bot.on("message:text", async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text || text.startsWith("/")) return;
    if (ctx.session.pendingReviseOrderId && ctx.from) {
      const orderId = ctx.session.pendingReviseOrderId;
      ctx.session.pendingReviseOrderId = undefined;
      const locale = loc(ctx);
      try {
        await ctx.services.api.customAgentOrderAction(orderId, "revise", ctx.from.id, text);
        await ctx.reply(ct(locale, "revise.ok"), { reply_markup: homeKb(locale) });
      } catch (err) {
        const max = err instanceof ApiError && err.status === 409;
        await ctx.reply(ct(locale, max ? "revise.max" : "err"));
      }
      return;
    }
    if (ctx.session.customStep && ctx.session.customStep !== "confirm") {
      await advanceWizard(ctx, text);
    }
  });

  bot.catch((err) => {
    console.error("[custom-agent-bot] error", err.error);
  });

  return bot;
}

export async function setupCustomAgentBotCommands(bot: Bot<BotContext>): Promise<void> {
  await bot.api.deleteMyCommands();
  await bot.api.setMyCommands(customCommandDescriptions("en"));
  for (const locale of CUSTOM_LOCALES) {
    const languageCode = telegramLanguageCode(locale);
    if (!languageCode || languageCode === "en") continue;
    try {
      await bot.api.setMyCommands(customCommandDescriptions(locale), {
        language_code: languageCode as LanguageCode,
      });
    } catch (err) {
      console.warn(`[boot] custom setMyCommands(${languageCode}) failed`, err);
    }
  }
}
