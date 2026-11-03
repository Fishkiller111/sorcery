import { InlineKeyboard } from "grammy";
import type { BotContext } from "../context.js";
import type { VipPlan } from "../../services/soulthread-api.js";
import { ApiError } from "../../services/soulthread-api.js";
import type { TranslateFn } from "../../i18n/index.js";

/** Soul custom recharge floor (matches API DefaultCustomMinPoints). */
export const SOUL_MIN_USD = 5;
/** User must pick whole-dollar amounts ($1 = 1000 Soul). */
export const SOUL_STEP_USD = 1;
/** Rate: 10000 Soul = $10 → $1 = 1000 Soul. */
const SOUL_PER_USD = 1000;

const PRESET_USD = [5, 10, 15, 20, 25, 30, 50, 100] as const;

function apiErrorCode(err: ApiError): string {
  const body = err.body;
  if (!body || typeof body !== "object") return "";
  const rec = body as { error_code?: unknown };
  return typeof rec.error_code === "string" ? rec.error_code : "";
}

/** VIP entitlement plans sellable in the bot (Stripe + NOWPayments; excludes Soul custom). */
export function isTelegramVipPlan(plan: VipPlan): boolean {
  if (plan.isCustomRecharge) return false;
  if (plan.productType === "points_pack") return false;
  if (plan.priceCents <= 0) return false;
  return plan.productType === "entitlement" || !plan.productType;
}

/** Shop one-time packs: quota batteries + welfare (Long Endurance). */
export function isTelegramOneTimePlan(plan: VipPlan): boolean {
  if (plan.isCustomRecharge) return false;
  if (plan.priceCents <= 0) return false;
  return plan.productType === "quota_pack" || plan.productType === "welfare";
}

export function isTelegramBuyablePlan(plan: VipPlan): boolean {
  return isTelegramVipPlan(plan) || isTelegramOneTimePlan(plan);
}

/** Quota packs are Stripe-only on the API. */
export function planAllowsCrypto(plan: VipPlan): boolean {
  return plan.productType !== "quota_pack";
}

export function planChargeCents(plan: VipPlan): number {
  if (plan.chargeCents > 0) return plan.chargeCents;
  return plan.priceCents;
}

export function findCustomSoulPlan(plans: VipPlan[]): VipPlan | undefined {
  return plans.find(
    (p) =>
      p.isCustomRecharge &&
      p.productType === "points_pack" &&
      p.billingType === "one_time",
  );
}

export function usdToSoul(usd: number): number {
  return Math.round(usd * SOUL_PER_USD);
}

export function soulToUsd(soul: number): number {
  return soul / SOUL_PER_USD;
}

/** Min USD from plan (floor $5); step always $1 for bot UX. */
export function soulMinUsd(plan: VipPlan): number {
  const fromPlan =
    plan.customMinPoints > 0 ? soulToUsd(plan.customMinPoints) : SOUL_MIN_USD;
  return Math.max(SOUL_MIN_USD, Math.ceil(fromPlan));
}

export function parseSoulUsdInput(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace(/,/g, "");
  const m = t.match(/^(?:\$|usd\s*)?(\d+(?:\.\d+)?)\s*(?:usd|\$)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function isValidSoulUsd(usd: number, minUsd: number): boolean {
  if (!Number.isFinite(usd)) return false;
  if (usd < minUsd - 1e-9) return false;
  // whole dollars only
  return Math.abs(usd - Math.round(usd)) < 1e-9;
}

function formatPrice(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return `${currency} ${amount}`;
}

function prettyPlanName(plan: Pick<VipPlan, "name" | "code">): string {
  const raw = (plan.name || plan.code || "VIP").trim();
  if (raw === "ultimate_year" || raw.toLowerCase() === "ultimate") return "ULTIMATE";
  if (raw === plan.code && raw.includes("_")) {
    return raw.replace(/_/g, " ");
  }
  return raw;
}

function durationTag(t: TranslateFn, plan: VipPlan): string {
  if (isTelegramOneTimePlan(plan)) return "";
  if (plan.durationUnit === "year") return t("vip.durYear");
  if (plan.durationUnit === "month") return t("vip.durMonth");
  return "";
}

function planButtonLabel(ctx: BotContext, plan: VipPlan): string {
  const tag = durationTag(ctx.t, plan);
  const title = tag ? `${prettyPlanName(plan)} · ${tag}` : prettyPlanName(plan);
  const charge = planChargeCents(plan);
  const promo =
    plan.promoPercent > 0 && charge < plan.priceCents ? ` · -${plan.promoPercent}%` : "";
  return `${title} · ${formatPrice(charge, plan.currency)}${promo}`;
}

function inferVipGroup(plan: VipPlan): "premium" | "ultimate" | "other" {
  const s = `${plan.code} ${plan.name}`.toLowerCase();
  if (s.includes("ultimate") || s.includes("all_access")) return "ultimate";
  if (
    s.includes("premium") ||
    s.includes("chat_monthly") ||
    s.includes("chat_yearly")
  ) {
    return "premium";
  }
  return "other";
}

function formatPlanCharge(t: TranslateFn, plan: VipPlan): string {
  const charge = planChargeCents(plan);
  const list = formatPrice(plan.priceCents, plan.currency);
  const now = formatPrice(charge, plan.currency);
  if (plan.promoPercent > 0 && charge < plan.priceCents) {
    return t("vip.promoPrice", { charge: now, pct: plan.promoPercent, list });
  }
  return now;
}

function vipGroupPriceLine(t: TranslateFn, plans: VipPlan[]): string {
  const ordered = [...plans].sort((a, b) => {
    const ya = a.durationUnit === "year" ? 1 : 0;
    const yb = b.durationUnit === "year" ? 1 : 0;
    return ya - yb;
  });
  return ordered
    .map((p) => {
      const tag = durationTag(t, p);
      const price = formatPlanCharge(t, p);
      return tag ? `${tag} ${price}` : price;
    })
    .join(" · ");
}

function oneTimeBlock(t: TranslateFn, plan: VipPlan): string {
  const lines: string[] = [prettyPlanName(plan)];
  const desc = plan.description?.trim();
  if (desc) {
    lines.push(desc);
  } else if (plan.grantRewardType === "chat_quota") {
    lines.push(t("vip.quotaChatDetail", { n: plan.grantRewardAmount ?? 0 }));
  } else if (plan.grantRewardType === "voice_quota") {
    lines.push(t("vip.quotaVoiceDetail", { n: plan.grantRewardAmount ?? 0 }));
  } else if (plan.productType === "welfare") {
    lines.push(t("vip.welfareDetail"));
  }
  if (plan.productType === "quota_pack") {
    lines.push(t("vip.quotaRepeat"));
  }
  lines.push(formatPlanCharge(t, plan));
  return lines.join("\n");
}

const TG_TEXT_MAX = 4096;

export function buildVipCatalogText(
  t: TranslateFn,
  input: {
    vipPlans: VipPlan[];
    oneTimePlans: VipPlan[];
    soulPlan?: VipPlan;
  },
): string {
  const parts: string[] = [t("vip.header")];

  if (input.vipPlans.length > 0) {
    const premium = input.vipPlans.filter((p) => inferVipGroup(p) === "premium");
    const ultimate = input.vipPlans.filter((p) => inferVipGroup(p) === "ultimate");
    const other = input.vipPlans.filter((p) => inferVipGroup(p) === "other");
    const vipBits: string[] = [t("vip.sectionVip")];
    if (premium.length > 0) {
      vipBits.push(
        `${t("vip.premiumTitle")}\n${t("vip.premiumBody")}\n${vipGroupPriceLine(t, premium)}`,
      );
    }
    if (ultimate.length > 0) {
      vipBits.push(
        `${t("vip.ultimateTitle")}\n${t("vip.ultimateBody")}\n${vipGroupPriceLine(t, ultimate)}`,
      );
    }
    for (const plan of other) {
      vipBits.push(
        `${prettyPlanName(plan)}\n${vipGroupPriceLine(t, [plan])}`,
      );
    }
    parts.push(vipBits.join("\n\n"));
  }

  if (input.oneTimePlans.length > 0) {
    parts.push(
      [t("vip.sectionOneTime"), ...input.oneTimePlans.map((p) => oneTimeBlock(t, p))].join(
        "\n\n",
      ),
    );
  }

  if (input.soulPlan) {
    const min = soulMinUsd(input.soulPlan);
    parts.push(
      `${t("vip.sectionSoul")}\n${t("vip.soulCatalog", { rate: SOUL_PER_USD, min, step: SOUL_STEP_USD })}`,
    );
  }

  parts.push(t("vip.footerPick"));
  const text = parts.join("\n\n");
  if (text.length <= TG_TEXT_MAX) return text;
  return text.slice(0, TG_TEXT_MAX - 1);
}

function clearSoulAwait(ctx: BotContext): void {
  ctx.session.awaitingSoulUsd = false;
  ctx.session.soulPlanId = undefined;
}

function clearPendingCheckout(ctx: BotContext): void {
  ctx.session.pendingCheckoutPlanId = undefined;
  ctx.session.pendingCheckoutGrantPoints = undefined;
  ctx.session.pendingCheckoutLabel = undefined;
}

function resetVipFlow(ctx: BotContext): void {
  clearSoulAwait(ctx);
  clearPendingCheckout(ctx);
}

type CheckoutProvider = "stripe" | "nowpayments";

function payMethodKeyboard(ctx: BotContext, stripeOnly = false): InlineKeyboard {
  const kb = new InlineKeyboard().text(ctx.t("vip.payButtonStripe"), "vip:pay:stripe");
  if (!stripeOnly) {
    kb.text(ctx.t("vip.payButtonCrypto"), "vip:pay:crypto");
  }
  return kb.row().text(ctx.t("vip.soulBack"), "vip:menu");
}

async function promptPayMethod(
  ctx: BotContext,
  planId: string,
  label: string,
  grantPoints?: number,
  stripeOnly = false,
): Promise<void> {
  ctx.session.pendingCheckoutPlanId = planId;
  ctx.session.pendingCheckoutGrantPoints =
    grantPoints != null && grantPoints > 0 ? grantPoints : undefined;
  ctx.session.pendingCheckoutLabel = label;
  await ctx.reply(
    ctx.t(stripeOnly ? "vip.choosePayStripeOnly" : "vip.choosePay", { name: label }),
    { reply_markup: payMethodKeyboard(ctx, stripeOnly) },
  );
}

async function getAuthToken(ctx: BotContext): Promise<string | null> {
  if (!ctx.from) return null;
  try {
    const auth = await ctx.services.auth.getTokenForTelegramUser({
      telegramId: ctx.from.id,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      languageCode: ctx.from.language_code,
      aff: ctx.session.pendingAffCode,
      channelCode: ctx.session.pendingChannelCode,
      startPayload: ctx.session.pendingStartPayload,
      entry: "bot",
    });
    return auth.token;
  } catch (err) {
    const body = err instanceof ApiError ? err.body : undefined;
    console.error("[vip] auth failed", err, body ?? "");
    await ctx.reply(ctx.t("vip.authFailed"));
    return null;
  }
}

function soulAmountKeyboard(
  ctx: BotContext,
  minUsd: number,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  const presets = PRESET_USD.filter((u) => u >= minUsd);
  for (let i = 0; i < presets.length; i += 3) {
    const row = presets.slice(i, i + 3);
    for (const usd of row) {
      kb.text(`$${usd}`, `vip:soul:amt:${usd}`);
    }
    kb.row();
  }
  kb.text(ctx.t("vip.soulCustomButton"), "vip:soul:custom").row();
  kb.text(ctx.t("vip.soulBack"), "vip:menu");
  return kb;
}

async function replyPayLink(
  ctx: BotContext,
  checkout: {
    checkoutUrl: string;
    planName: string;
    orderId: string;
    planId: string;
    amountCents: number;
    currency: string;
    grantPoints?: number;
  },
  label: string,
  provider: CheckoutProvider,
): Promise<void> {
  const isStripe = provider === "stripe";
  const kb = new InlineKeyboard().url(
    ctx.t(isStripe ? "vip.stripePayButton" : "vip.payButton"),
    checkout.checkoutUrl,
  );
  await ctx.reply(
    ctx.t(isStripe ? "vip.stripePayLink" : "vip.payLink", { name: label }),
    { reply_markup: kb },
  );
  await ctx.services.events.track({
    name: "tg_bot_vip_invoice",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    meta: {
      orderId: checkout.orderId,
      planId: checkout.planId,
      amountCents: checkout.amountCents,
      currency: checkout.currency,
      grantPoints: checkout.grantPoints ?? 0,
      provider,
    },
  });
}

async function checkoutVipOrder(
  ctx: BotContext,
  planId: string,
  provider: CheckoutProvider,
  grantPoints?: number,
  displayLabel?: string,
): Promise<boolean> {
  const run = async (fresh: boolean): Promise<"ok" | "retry" | "fail"> => {
    if (fresh && ctx.from) ctx.services.auth.clear(ctx.from.id);
    const token = await getAuthToken(ctx);
    if (!token) return "fail";
    try {
      const checkout =
        provider === "stripe"
          ? await ctx.services.api.checkoutVipStripe({
              token,
              planId,
              grantPoints,
            })
          : await ctx.services.api.checkoutVipNowPayments({
              token,
              planId,
              grantPoints,
            });
      if (!checkout.checkoutUrl) {
        await ctx.reply(ctx.t("vip.checkoutFailed"));
        return "fail";
      }
      const soul =
        grantPoints && grantPoints > 0
          ? grantPoints
          : Math.round((checkout.amountCents / 100) * SOUL_PER_USD);
      const label =
        displayLabel ||
        (grantPoints && grantPoints > 0
          ? ctx.t("vip.soulPayLabel", {
              soul,
              usd: (checkout.amountCents / 100).toFixed(0),
            })
          : prettyPlanName({ name: checkout.planName, code: checkout.planId }));
      await replyPayLink(ctx, { ...checkout, grantPoints }, label, provider);
      return "ok";
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (!fresh && status === 401) {
        console.warn("[vip] checkout 401, reminting telegram session");
        return "retry";
      }
      console.error("[vip] checkout failed", err, err instanceof ApiError ? err.body : "");
      if (err instanceof ApiError && err.status === 409) {
        await ctx.reply(ctx.t("vip.alreadyActive"));
        return "fail";
      }
      if (err instanceof ApiError && apiErrorCode(err) === "VIP_024") {
        await ctx.reply(ctx.t("vip.cryptoMinAmount"));
        return "fail";
      }
      await ctx.reply(ctx.t("vip.checkoutFailed"));
      return "fail";
    }
  };

  const first = await run(false);
  if (first === "retry") {
    return (await run(true)) === "ok";
  }
  return first === "ok";
}

export async function handleVipCommand(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;
  resetVipFlow(ctx);

  const token = await getAuthToken(ctx);
  if (!token) return;

  let plans: VipPlan[];
  try {
    plans = await ctx.services.api.listVipPlans(ctx.locale);
  } catch (err) {
    console.error("[vip] list plans failed", err);
    await ctx.reply(ctx.t("vip.loadFailed"));
    return;
  }

  const vipPlans = plans.filter(isTelegramVipPlan);
  const oneTimePlans = plans.filter(isTelegramOneTimePlan);
  const soulPlan = findCustomSoulPlan(plans);
  if (vipPlans.length === 0 && oneTimePlans.length === 0 && !soulPlan) {
    await ctx.reply(ctx.t("vip.empty"));
    return;
  }

  const kb = new InlineKeyboard();
  for (const plan of vipPlans.slice(0, 8)) {
    kb.text(planButtonLabel(ctx, plan), `vip:buy:${plan.id}`).row();
  }
  for (const plan of oneTimePlans.slice(0, 8)) {
    kb.text(planButtonLabel(ctx, plan), `vip:buy:${plan.id}`).row();
  }
  if (soulPlan) {
    kb.text(ctx.t("vip.soulButton"), "vip:soul").row();
  }

  await ctx.services.events.track({
    name: "tg_bot_vip_open",
    at: new Date().toISOString(),
    telegramUserId: ctx.from.id,
    telegramUsername: ctx.from.username,
    chatId: ctx.chat?.id,
    meta: {
      planCount: vipPlans.length,
      oneTimeCount: oneTimePlans.length,
      soul: Boolean(soulPlan),
      locale: ctx.locale,
      providers: ["stripe", "nowpayments"],
    },
  });

  await ctx.reply(
    buildVipCatalogText(ctx.t, { vipPlans, oneTimePlans, soulPlan }),
    { reply_markup: kb },
  );
}

export async function handleVipMenuCallback(ctx: BotContext): Promise<void> {
  await handleVipCommand(ctx);
}

export async function handleSoulMenuCallback(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;
  clearSoulAwait(ctx);

  let plans: VipPlan[];
  try {
    plans = await ctx.services.api.listVipPlans(ctx.locale);
  } catch (err) {
    console.error("[vip] list plans failed", err);
    await ctx.reply(ctx.t("vip.loadFailed"));
    return;
  }

  const soulPlan = findCustomSoulPlan(plans);
  if (!soulPlan) {
    await ctx.reply(ctx.t("vip.soulUnavailable"));
    return;
  }

  ctx.session.soulPlanId = soulPlan.id;
  const minUsd = soulMinUsd(soulPlan);
  await ctx.reply(
    ctx.t("vip.soulHeader", {
      min: minUsd,
      step: SOUL_STEP_USD,
      rate: SOUL_PER_USD,
    }),
    { reply_markup: soulAmountKeyboard(ctx, minUsd) },
  );
}

export async function handleSoulAmountCallback(
  ctx: BotContext,
  usdRaw: string,
): Promise<void> {
  if (!ctx.from) return;
  const usd = Number(usdRaw);
  if (!Number.isFinite(usd)) {
    await ctx.reply(ctx.t("vip.soulInvalidAmount"));
    return;
  }

  let plans: VipPlan[];
  try {
    plans = await ctx.services.api.listVipPlans(ctx.locale);
  } catch (err) {
    console.error("[vip] list plans failed", err);
    await ctx.reply(ctx.t("vip.loadFailed"));
    return;
  }
  const soulPlan =
    (ctx.session.soulPlanId
      ? plans.find((p) => p.id === ctx.session.soulPlanId)
      : undefined) ?? findCustomSoulPlan(plans);
  if (!soulPlan) {
    await ctx.reply(ctx.t("vip.soulUnavailable"));
    return;
  }

  const minUsd = soulMinUsd(soulPlan);
  if (!isValidSoulUsd(usd, minUsd)) {
    await ctx.reply(
      ctx.t("vip.soulInvalidAmount", { min: minUsd, step: SOUL_STEP_USD }),
    );
    return;
  }

  clearSoulAwait(ctx);
  const grantPoints = usdToSoul(Math.round(usd));
  const label = ctx.t("vip.soulPayLabel", {
    soul: grantPoints,
    usd: String(Math.round(usd)),
  });
  await promptPayMethod(ctx, soulPlan.id, label, grantPoints);
}

export async function handleSoulCustomCallback(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;

  let plans: VipPlan[];
  try {
    plans = await ctx.services.api.listVipPlans(ctx.locale);
  } catch (err) {
    console.error("[vip] list plans failed", err);
    await ctx.reply(ctx.t("vip.loadFailed"));
    return;
  }
  const soulPlan =
    (ctx.session.soulPlanId
      ? plans.find((p) => p.id === ctx.session.soulPlanId)
      : undefined) ?? findCustomSoulPlan(plans);
  if (!soulPlan) {
    await ctx.reply(ctx.t("vip.soulUnavailable"));
    return;
  }

  ctx.session.soulPlanId = soulPlan.id;
  ctx.session.awaitingSoulUsd = true;
  const minUsd = soulMinUsd(soulPlan);
  const kb = new InlineKeyboard().text(ctx.t("vip.soulCancel"), "vip:soul");
  await ctx.reply(ctx.t("vip.soulAskAmount", { min: minUsd, step: SOUL_STEP_USD }), {
    reply_markup: kb,
  });
}

/** Intercept typed USD while awaiting custom Soul amount. Returns true if handled. */
export async function tryHandleSoulUsdMessage(ctx: BotContext): Promise<boolean> {
  if (!ctx.session.awaitingSoulUsd || !ctx.from) return false;
  const text = ctx.message?.text?.trim();
  if (!text || text.startsWith("/")) return false;

  const usd = parseSoulUsdInput(text);
  let plans: VipPlan[];
  try {
    plans = await ctx.services.api.listVipPlans(ctx.locale);
  } catch (err) {
    console.error("[vip] list plans failed", err);
    await ctx.reply(ctx.t("vip.loadFailed"));
    return true;
  }
  const soulPlan =
    (ctx.session.soulPlanId
      ? plans.find((p) => p.id === ctx.session.soulPlanId)
      : undefined) ?? findCustomSoulPlan(plans);
  if (!soulPlan) {
    clearSoulAwait(ctx);
    await ctx.reply(ctx.t("vip.soulUnavailable"));
    return true;
  }

  const minUsd = soulMinUsd(soulPlan);
  if (usd == null || !isValidSoulUsd(usd, minUsd)) {
    await ctx.reply(
      ctx.t("vip.soulInvalidAmount", { min: minUsd, step: SOUL_STEP_USD }),
    );
    return true;
  }

  clearSoulAwait(ctx);
  const grantPoints = usdToSoul(Math.round(usd));
  const label = ctx.t("vip.soulPayLabel", {
    soul: grantPoints,
    usd: String(Math.round(usd)),
  });
  await promptPayMethod(ctx, soulPlan.id, label, grantPoints);
  return true;
}

export async function handleVipBuyCallback(ctx: BotContext, planId: string): Promise<void> {
  if (!ctx.from || !planId) return;
  clearSoulAwait(ctx);

  let plans: VipPlan[];
  try {
    plans = await ctx.services.api.listVipPlans(ctx.locale);
  } catch (err) {
    console.error("[vip] list plans failed", err);
    await ctx.reply(ctx.t("vip.loadFailed"));
    return;
  }
  const plan = plans.find((p) => p.id === planId);
  if (!plan || !isTelegramBuyablePlan(plan)) {
    await ctx.reply(ctx.t("vip.checkoutFailed"));
    return;
  }
  await promptPayMethod(
    ctx,
    plan.id,
    prettyPlanName(plan),
    undefined,
    !planAllowsCrypto(plan),
  );
}

export async function handleVipPayCallback(
  ctx: BotContext,
  provider: CheckoutProvider,
): Promise<void> {
  if (!ctx.from) return;
  const planId = ctx.session.pendingCheckoutPlanId?.trim();
  const grantPoints = ctx.session.pendingCheckoutGrantPoints;
  const displayLabel = ctx.session.pendingCheckoutLabel;
  if (!planId) {
    await ctx.reply(ctx.t("vip.payExpired"));
    return;
  }
  if (provider === "nowpayments") {
    try {
      const plans = await ctx.services.api.listVipPlans(ctx.locale);
      const plan = plans.find((p) => p.id === planId);
      if (plan && !planAllowsCrypto(plan)) {
        await ctx.reply(ctx.t("vip.stripeOnly"));
        return;
      }
    } catch (err) {
      console.error("[vip] list plans for pay method failed", err);
    }
  }
  clearPendingCheckout(ctx);
  await checkoutVipOrder(ctx, planId, provider, grantPoints, displayLabel);
}
