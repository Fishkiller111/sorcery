import type { AppConfig } from "../config.js";

export type ExploreRole = {
  id: string;
  name: string;
  avatarUrl?: string;
  introduction?: string;
};

export type ChatQuota = {
  unlimited: boolean;
  remainingHint: number;
  planCode?: string;
};

export type ChatStreamEvent = {
  type: string;
  content?: string;
  message_id?: string;
  user_message_id?: string;
  code?: string;
  message?: string;
};

export type CustomAgentOrder = {
  id: string;
  status: string;
  product_kind?: string;
  price_cents: number;
  currency: string;
  max_revisions: number;
  revision_count: number;
  can_revise: boolean;
  extra_revision_cents?: number;
  extra_paid_cents?: number;
  extra_due_cents?: number;
  role_id?: string;
  role?: { role_id: string; name: string; avatar_url?: string; introduction?: string };
  worldview_id?: string;
  worldview?: { worldview_id: string; name: string; summary?: string };
  checkout_url?: string;
  created_at: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ExploreRoleListResp = {
  roles?: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    introduction?: string;
  }>;
};

export type VipPlan = {
  id: string;
  code: string;
  name: string;
  description?: string;
  productType: string;
  billingType: string;
  durationUnit: string;
  durationValue: number;
  priceCents: number;
  chargeCents: number;
  promoPercent: number;
  currency: string;
  grantPoints: number;
  grantRewardType?: string;
  grantRewardAmount?: number;
  isCustomRecharge: boolean;
  customMinPoints: number;
  customStepPoints: number;
};

export function vipApiLang(locale?: string): string {
  if (!locale) return "en";
  if (locale.startsWith("zh")) return "zh";
  if (locale === "es" || locale === "ru") return locale;
  return "en";
}

/** 响应体只能消费一次：优先按文本读取，再尝试解析 JSON。 */
async function readErrorBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function createSoulthreadApi(config: AppConfig) {
  function absolutize(url: string | undefined): string | undefined {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `${config.staticBaseUrl}${url}`;
    return `${config.staticBaseUrl}/${url}`;
  }

  function authHeaders(token: string): Record<string, string> {
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-Client-Platform": "web",
    };
  }

  async function listExploreRoles(opts?: {
    page?: number;
    pageSize?: number;
    sort?: string;
  }): Promise<ExploreRole[]> {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 5;
    const sort = opts?.sort ?? "hot";
    const url = new URL(`${config.apiBaseUrl}/explore/roles`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("sort", sort);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Client-Platform": "web",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      throw new ApiError(`explore/roles HTTP ${res.status}`, res.status);
    }
    const data = (await res.json()) as ExploreRoleListResp;
    return (data.roles ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: absolutize(r.avatar_url),
      introduction: r.introduction,
    }));
  }

  async function getExploreRole(
    roleId: string,
    token?: string,
  ): Promise<ExploreRole | null> {
    const url = `${config.apiBaseUrl}/explore/roles/${encodeURIComponent(roleId)}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Client-Platform": "web",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 404) return null;
    // Detail endpoint requires JWT; fall back to public hot list when unauthenticated.
    if (res.status === 401 || res.status === 403) {
      try {
        const listed = await listExploreRoles({ page: 1, pageSize: 50, sort: "hot" });
        const hit = listed.find((r) => r.id === roleId);
        if (hit) return hit;
      } catch {
        /* ignore */
      }
      return null;
    }
    if (!res.ok) {
      throw new ApiError(`explore/roles/${roleId} HTTP ${res.status}`, res.status);
    }
    const data = (await res.json()) as {
      id: string;
      name: string;
      avatar_url?: string;
      introduction?: string;
    };
    return {
      id: data.id,
      name: data.name,
      avatarUrl: absolutize(data.avatar_url),
      introduction: data.introduction,
    };
  }

  async function getRecommendedRoles(limit = 5): Promise<ExploreRole[]> {
    // Prefer admin-curated TG Bot featured list.
    try {
      const url = new URL(`${config.apiBaseUrl}/bot/featured-roles`);
      url.searchParams.set("limit", String(limit));
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Client-Platform": "web",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          roles?: Array<{
            id: string;
            name: string;
            avatar_url?: string;
            introduction?: string;
          }>;
          source?: string;
        };
        const curated = (data.roles ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          avatarUrl: absolutize(r.avatar_url),
          introduction: r.introduction,
        }));
        if (curated.length > 0) return curated.slice(0, limit);
      }
    } catch (err) {
      console.warn("[api] bot/featured-roles failed", err);
    }

    try {
      const roles = await listExploreRoles({ page: 1, pageSize: limit, sort: "hot" });
      if (roles.length > 0) return roles.slice(0, limit);
    } catch (err) {
      console.warn("[api] listExploreRoles failed", err);
    }

    const featured: ExploreRole[] = [];
    for (const id of config.featuredRoleIds.slice(0, limit)) {
      try {
        const role = await getExploreRole(id);
        if (role) featured.push(role);
      } catch {
        featured.push({ id, name: `Character ${id.slice(0, 8)}` });
      }
    }
    return featured;
  }

  /** Exchange Telegram identity for JWT via bot shared secret. */
  async function authTelegramBot(input: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
    aff?: string;
    channelCode?: string;
    startPayload?: string;
    entry?: string;
  }): Promise<{ token: string; expiresAt: number; isNewUser: boolean }> {
    if (!config.botApiKey) {
      throw new ApiError("BOT_API_KEY not configured", 503);
    }
    const res = await fetch(`${config.apiBaseUrl}/auth/telegram/bot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Soulthread-Bot-Key": config.botApiKey,
        "X-Client-Platform": "web",
      },
      body: JSON.stringify({
        telegram_id: input.telegramId,
        username: input.username ?? "",
        first_name: input.firstName ?? "",
        last_name: input.lastName ?? "",
        language_code: input.languageCode ?? "",
        aff: input.aff ?? "",
        channel_code: input.channelCode ?? "",
        start_payload: input.startPayload ?? "",
        entry: input.entry ?? "bot",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await readErrorBody(res);
      throw new ApiError(`auth/telegram/bot HTTP ${res.status}`, res.status, body);
    }
    const data = (await res.json()) as {
      token: string;
      expires_at: number;
      is_new_user?: boolean;
    };
    return {
      token: data.token,
      expiresAt: data.expires_at,
      isNewUser: Boolean(data.is_new_user),
    };
  }

  async function getOrCreateChatSession(token: string, roleId: string): Promise<string> {
    const url = new URL(`${config.apiBaseUrl}/chat/messages`);
    url.searchParams.set("role_id", roleId);
    url.searchParams.set("skip_welcome", "1");
    const res = await fetch(url, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      throw new ApiError(`chat/messages HTTP ${res.status}`, res.status);
    }
    const data = (await res.json()) as { session_id?: string };
    if (!data.session_id) {
      throw new ApiError("chat/messages missing session_id", 500);
    }
    return data.session_id;
  }

  async function getChatQuota(token: string): Promise<ChatQuota> {
    const res = await fetch(`${config.apiBaseUrl}/chat/quota`, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new ApiError(`chat/quota HTTP ${res.status}`, res.status);
    }
    const data = (await res.json()) as {
      unlimited?: boolean;
      remaining_messages_hint?: number;
      plan_code?: string;
    };
    return {
      unlimited: Boolean(data.unlimited),
      remainingHint: data.remaining_messages_hint ?? 0,
      planCode: data.plan_code,
    };
  }

  async function sendChatText(input: {
    token: string;
    sessionId: string;
    roleId: string;
    content: string;
  }): Promise<{ reply: string; events: ChatStreamEvent[] }> {
    const res = await fetch(`${config.apiBaseUrl}/chat/send`, {
      method: "POST",
      headers: {
        ...authHeaders(input.token),
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        role_id: input.roleId,
        content: input.content,
        type: "text",
      }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!res.ok) {
      const body = await readErrorBody(res);
      throw new ApiError(`chat/send HTTP ${res.status}`, res.status, body);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new ApiError("chat/send empty body", 500);
    }

    const decoder = new TextDecoder();
    let buffer = "";
    const events: ChatStreamEvent[] = [];
    let reply = "";

    const push = (ev: ChatStreamEvent) => {
      events.push(ev);
      // Free Chat SSE uses text_delta chunks; keep "text" for older payloads.
      if (
        (ev.type === "text_delta" || ev.type === "text") &&
        typeof ev.content === "string" &&
        ev.content.length > 0
      ) {
        reply += ev.content;
      }
      if (ev.type === "error") {
        throw new ApiError(ev.message || ev.code || "chat stream error", 502, ev);
      }
    };

    const processBlock = (block: string) => {
      for (const line of block.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const raw = trimmed.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw) as unknown;
        } catch {
          // 仅忽略无效 JSON；业务 error 事件必须向调用者抛出。
          continue;
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
        push(parsed as ChatStreamEvent);
      }
    };
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      // 同时支持 LF 和跨块到达的 CRLF 帧分隔符。
      buffer = buffer.replace(/\r\n/g, "\n");
      let idx = buffer.indexOf("\n\n");
      while (idx >= 0) {
        processBlock(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
        idx = buffer.indexOf("\n\n");
      }
      if (done) {
        if (buffer.trim()) processBlock(buffer);
        break;
      }
    }

    return { reply: reply.trim(), events };
  }

  async function previewVoice(input: {
    token: string;
    voiceId: string;
    language?: string;
  }): Promise<{ format: string; dataBase64: string }> {
    const res = await fetch(`${config.apiBaseUrl}/voices/preview`, {
      method: "POST",
      headers: {
        ...authHeaders(input.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice_id: input.voiceId,
        language: input.language ?? "en",
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      throw new ApiError(`voices/preview HTTP ${res.status}`, res.status);
    }
    const data = (await res.json()) as { format?: string; data?: string };
    if (!data.data) {
      throw new ApiError("voices/preview empty audio", 502);
    }
    return { format: data.format ?? "mp3", dataBase64: data.data };
  }

  async function listVipPlans(locale?: string): Promise<VipPlan[]> {
    const lang = vipApiLang(locale);
    const qs = lang ? `?lang=${encodeURIComponent(lang)}` : "";
    const res = await fetch(`${config.apiBaseUrl}/vip/plans${qs}`, {
      headers: {
        Accept: "application/json",
        "X-Client-Platform": "web",
        ...(lang ? { "Accept-Language": lang } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new ApiError(`vip/plans HTTP ${res.status}`, res.status);
    }
    const data = (await res.json()) as {
      plans?: Array<{
        id: string;
        code: string;
        name: string;
        description?: string;
        product_type?: string;
        billing_type?: string;
        duration_unit?: string;
        duration_value?: number;
        price_cents?: number;
        charge_cents?: number;
        promo_percent?: number;
        currency?: string;
        grant_points?: number;
        grant_reward_type?: string;
        grant_reward_amount?: number;
        is_custom_recharge?: boolean;
        custom_min_points?: number;
        custom_step_points?: number;
      }>;
    };
    return (data.plans ?? []).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      productType: p.product_type ?? "entitlement",
      billingType: p.billing_type ?? "one_time",
      durationUnit: p.duration_unit ?? "month",
      durationValue: p.duration_value ?? 1,
      priceCents: p.price_cents ?? 0,
      chargeCents: p.charge_cents && p.charge_cents > 0 ? p.charge_cents : (p.price_cents ?? 0),
      promoPercent: p.promo_percent ?? 0,
      currency: (p.currency ?? "USD").toUpperCase(),
      grantPoints: p.grant_points ?? 0,
      grantRewardType: p.grant_reward_type,
      grantRewardAmount: p.grant_reward_amount,
      isCustomRecharge: Boolean(p.is_custom_recharge),
      customMinPoints: p.custom_min_points ?? 0,
      customStepPoints: p.custom_step_points ?? 0,
    }));
  }

  async function checkoutVipTelegram(input: {
    token: string;
    planId: string;
  }): Promise<{
    orderId: string;
    provider: string;
    expiresAt: number;
    amountCents: number;
    currency: string;
    planId: string;
    planName: string;
  }> {
    return checkoutVip(input.token, input.planId, "telegram");
  }

  async function checkoutVipNowPayments(input: {
    token: string;
    planId: string;
    grantPoints?: number;
  }): Promise<{
    orderId: string;
    provider: string;
    expiresAt: number;
    amountCents: number;
    currency: string;
    planId: string;
    planName: string;
    checkoutUrl: string;
  }> {
    const result = await checkoutVip(
      input.token,
      input.planId,
      "nowpayments",
      input.grantPoints,
    );
    return { ...result, checkoutUrl: result.checkoutUrl };
  }

  async function checkoutVipStripe(input: {
    token: string;
    planId: string;
    grantPoints?: number;
  }): Promise<{
    orderId: string;
    provider: string;
    expiresAt: number;
    amountCents: number;
    currency: string;
    planId: string;
    planName: string;
    checkoutUrl: string;
  }> {
    const result = await checkoutVip(
      input.token,
      input.planId,
      "stripe",
      input.grantPoints,
    );
    return { ...result, checkoutUrl: result.checkoutUrl };
  }

  async function checkoutVip(
    token: string,
    planId: string,
    paymentProvider: "telegram" | "nowpayments" | "stripe",
    grantPoints?: number,
  ): Promise<{
    orderId: string;
    provider: string;
    expiresAt: number;
    amountCents: number;
    currency: string;
    planId: string;
    planName: string;
    checkoutUrl: string;
  }> {
    const body: Record<string, unknown> = {
      plan_id: planId,
      payment_provider: paymentProvider,
    };
    if (grantPoints != null && grantPoints > 0) {
      body.grant_points = grantPoints;
    }
    const res = await fetch(`${config.apiBaseUrl}/vip/checkout`, {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const body = await readErrorBody(res);
      throw new ApiError(`vip/checkout HTTP ${res.status}`, res.status, body);
    }
    const data = (await res.json()) as {
      order_id: string;
      provider?: string;
      expires_at?: number;
      amount_cents?: number;
      currency?: string;
      plan_id?: string;
      plan_name?: string;
      checkout_url?: string;
    };
    return {
      orderId: data.order_id,
      provider: data.provider ?? paymentProvider,
      expiresAt: data.expires_at ?? 0,
      amountCents: data.amount_cents ?? 0,
      currency: (data.currency ?? "USD").toUpperCase(),
      planId: data.plan_id ?? planId,
      planName: data.plan_name ?? "",
      checkoutUrl: data.checkout_url ?? "",
    };
  }

  async function confirmTelegramPayment(input: {
    orderId: string;
    telegramPaymentChargeId: string;
    telegramUserId: number;
    totalAmount: number;
    currency: string;
  }): Promise<{
    orderId: string;
    status: string;
    productType: string;
    planId: string;
  }> {
    if (!config.botApiKey) {
      throw new ApiError("BOT_API_KEY not configured", 503);
    }
    const res = await fetch(`${config.apiBaseUrl}/vip/telegram/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Soulthread-Bot-Key": config.botApiKey,
        "X-Client-Platform": "web",
      },
      body: JSON.stringify({
        order_id: input.orderId,
        telegram_payment_charge_id: input.telegramPaymentChargeId,
        telegram_user_id: input.telegramUserId,
        total_amount: input.totalAmount,
        currency: input.currency,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const body = await readErrorBody(res);
      throw new ApiError(`vip/telegram/confirm HTTP ${res.status}`, res.status, body);
    }
    const data = (await res.json()) as {
      order_id: string;
      status: string;
      product_type?: string;
      plan_id?: string;
    };
    return {
      orderId: data.order_id,
      status: data.status,
      productType: data.product_type ?? "entitlement",
      planId: data.plan_id ?? "",
    };
  }

  async function getReferralMe(token: string): Promise<{
    inviteCode: string;
    shareUrl: string;
    activityStatus: string;
    totalInvites: number;
    pointsEarnedFromReferral: number;
    inviteePoints: number;
    inviterPointsPerInvite: number;
  }> {
    const res = await fetch(`${config.apiBaseUrl}/referral/me`, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      throw new ApiError(`referral/me HTTP ${res.status}`, res.status);
    }
    const data = (await res.json()) as {
      invite_code?: string;
      share_url?: string;
      activity_status?: string;
      total_invites?: number;
      points_earned_from_referral?: number;
      invitee_points?: number;
      inviter_points_per_invite?: number;
    };
    return {
      inviteCode: data.invite_code ?? "",
      shareUrl: data.share_url ?? "",
      activityStatus: data.activity_status ?? "",
      totalInvites: data.total_invites ?? 0,
      pointsEarnedFromReferral: data.points_earned_from_referral ?? 0,
      inviteePoints: data.invitee_points ?? 0,
      inviterPointsPerInvite: data.inviter_points_per_invite ?? 0,
    };
  }

  async function listReferralInvites(
    token: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: Array<{
      inviteeEmailMasked: string;
      status: string;
      createdAt: number;
      completedAt: number;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const url = new URL(`${config.apiBaseUrl}/referral/invites`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    const res = await fetch(url, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      throw new ApiError(`referral/invites HTTP ${res.status}`, res.status);
    }
    const data = (await res.json()) as {
      items?: Array<{
        invitee_email_masked?: string;
        status?: string;
        created_at?: number;
        completed_at?: number;
      }>;
      total?: number;
      page?: number;
      limit?: number;
    };
    return {
      items: (data.items ?? []).map((row) => ({
        inviteeEmailMasked: row.invitee_email_masked ?? "***",
        status: row.status ?? "",
        createdAt: row.created_at ?? 0,
        completedAt: row.completed_at ?? 0,
      })),
      total: data.total ?? 0,
      page: data.page ?? page,
      limit: data.limit ?? limit,
    };
  }

  async function previewTgChannelAnnounce(roleId: string): Promise<{
    roleId: string;
    roleName: string;
    fullText: string;
    caption: string;
    needsFollowup: boolean;
    imageUrl?: string;
    miniappUrl: string;
    botDeepLink: string;
    tokenEstimate: number;
  } | null> {
    if (!config.botApiKey) return null;
    const res = await fetch(`${config.apiBaseUrl}/bot/tg-channel-announce/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Soulthread-Bot-Key": config.botApiKey,
      },
      body: JSON.stringify({ role_id: roleId }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      role_id: string;
      role_name: string;
      full_text: string;
      caption: string;
      needs_followup?: boolean;
      image_url?: string;
      miniapp_url: string;
      bot_deep_link: string;
      token_estimate?: number;
    };
    return {
      roleId: data.role_id,
      roleName: data.role_name,
      fullText: data.full_text,
      caption: data.caption,
      needsFollowup: Boolean(data.needs_followup),
      imageUrl: data.image_url,
      miniappUrl: data.miniapp_url,
      botDeepLink: data.bot_deep_link,
      tokenEstimate: data.token_estimate ?? 0,
    };
  }

  async function listTasks(token: string): Promise<{
    systemEnabled: boolean;
    dailyActivity?: {
      current: number;
      max: number;
      milestones: Array<{
        threshold: number;
        rewardPoints: number;
        reached: boolean;
        claimed: boolean;
        claimable: boolean;
      }>;
    };
    items: Array<{
      taskId: string;
      code: string;
      taskType: string;
      title: string;
      description: string;
      rewardPoints: number;
      activityPoints: number;
      status: string;
      progressValue: number;
      progressTarget: number;
      claimable: boolean;
      claimed: boolean;
      targetUrl: string;
      shareText: string;
      inviteUrl: string;
    }>;
  }> {
    const res = await fetch(`${config.apiBaseUrl}/tasks`, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new ApiError(`tasks HTTP ${res.status}`, res.status);
    }
    const data = (await res.json()) as {
      system_enabled?: boolean;
      daily_activity?: {
        current?: number;
        max?: number;
        milestones?: Array<{
          threshold?: number;
          reward_points?: number;
          reached?: boolean;
          claimed?: boolean;
          claimable?: boolean;
        }>;
      };
      items?: Array<{
        task_id?: string;
        code?: string;
        task_type?: string;
        title?: string;
        description?: string;
        reward_points?: number;
        activity_points?: number;
        status?: string;
        progress_value?: number;
        progress_target?: number;
        claimable?: boolean;
        claimed?: boolean;
        target_url?: string;
        share_text?: string;
        invite_url?: string;
      }>;
    };
    const activity = data.daily_activity;
    return {
      systemEnabled: data.system_enabled !== false,
      dailyActivity: activity
        ? {
            current: activity.current ?? 0,
            max: activity.max ?? 0,
            milestones: (activity.milestones ?? []).map((m) => ({
              threshold: m.threshold ?? 0,
              rewardPoints: m.reward_points ?? 0,
              reached: Boolean(m.reached),
              claimed: Boolean(m.claimed),
              claimable: Boolean(m.claimable),
            })),
          }
        : undefined,
      items: (data.items ?? []).map((t) => ({
        taskId: t.task_id ?? "",
        code: t.code ?? "",
        taskType: t.task_type ?? "",
        title: t.title ?? "",
        description: t.description ?? "",
        rewardPoints: t.reward_points ?? 0,
        activityPoints: t.activity_points ?? 0,
        status: t.status ?? "in_progress",
        progressValue: t.progress_value ?? 0,
        progressTarget: t.progress_target ?? 1,
        claimable: Boolean(t.claimable),
        claimed: Boolean(t.claimed),
        targetUrl: t.target_url ?? "",
        shareText: t.share_text ?? "",
        inviteUrl: t.invite_url ?? "",
      })),
    };
  }

  async function claimTask(
    token: string,
    taskId: string,
  ): Promise<{ pointsGranted: number; balanceAfter: number }> {
    const res = await fetch(
      `${config.apiBaseUrl}/tasks/${encodeURIComponent(taskId)}/claim`,
      {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) {
      const body = await readErrorBody(res);
      throw new ApiError(`tasks/claim HTTP ${res.status}`, res.status, body);
    }
    const data = (await res.json()) as {
      points_granted?: number;
      balance_after?: number;
    };
    return {
      pointsGranted: data.points_granted ?? 0,
      balanceAfter: data.balance_after ?? 0,
    };
  }

  async function claimActivityMilestone(
    token: string,
    threshold: number,
  ): Promise<{ pointsGranted: number; balanceAfter: number }> {
    const res = await fetch(`${config.apiBaseUrl}/tasks/activity-milestones/claim`, {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ threshold }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await readErrorBody(res);
      throw new ApiError(`tasks/milestone/claim HTTP ${res.status}`, res.status, body);
    }
    const data = (await res.json()) as {
      points_granted?: number;
      balance_after?: number;
    };
    return {
      pointsGranted: data.points_granted ?? 0,
      balanceAfter: data.balance_after ?? 0,
    };
  }

  async function ackTask(token: string, taskId: string): Promise<void> {
    const res = await fetch(
      `${config.apiBaseUrl}/tasks/${encodeURIComponent(taskId)}/ack`,
      {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!res.ok) {
      throw new ApiError(`tasks/ack HTTP ${res.status}`, res.status);
    }
  }

  async function ingestBotTranscript(input: {
    botKind: "main" | "support";
    telegramUserId: number;
    telegramUsername?: string;
    chatId?: number;
    locale?: string;
    turns: Array<{ direction: "user" | "bot"; eventName: string; content: string }>;
  }): Promise<void> {
    if (!config.botApiKey || !input.turns.length) return;
    const res = await fetch(`${config.apiBaseUrl}/bot/transcripts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Soulthread-Bot-Key": config.botApiKey,
      },
      body: JSON.stringify({
        bot_kind: input.botKind,
        telegram_user_id: input.telegramUserId,
        telegram_username: input.telegramUsername ?? "",
        chat_id: input.chatId ?? 0,
        locale: input.locale ?? "",
        turns: input.turns.map((t) => ({
          direction: t.direction,
          event_name: t.eventName,
          content: t.content,
        })),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      throw new ApiError(`bot/transcripts HTTP ${res.status}`, res.status);
    }
  }

  async function customAgentBotFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!config.botApiKey) {
      throw new ApiError("BOT_API_KEY not configured", 503);
    }
    const res = await fetch(`${config.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Soulthread-Bot-Key": config.botApiKey,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      throw new ApiError(`custom-agent ${res.status}`, res.status, data);
    }
    return data as T;
  }

  async function getCustomAgentConfig() {
    return customAgentBotFetch<{
      is_enabled: boolean;
      price_cents: number;
      world_price_cents: number;
      extra_revision_cents: number;
      currency: string;
      max_revisions: number;
    }>("/bot/custom-agent/config");
  }

  async function createCustomAgentOrder(input: {
    telegramUserId: number;
    telegramUsername?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
    locale?: string;
    productKind?: "character" | "world";
    brief: {
      name?: string;
      appearance?: string;
      personality?: string;
      background?: string;
      plot?: string;
      notes?: string;
      references?: string[];
    };
  }) {
    return customAgentBotFetch<{
      checkout_url: string;
      order: CustomAgentOrder;
    }>("/bot/custom-agent/orders", {
      method: "POST",
      body: JSON.stringify({
        telegram_user_id: input.telegramUserId,
        telegram_username: input.telegramUsername ?? "",
        first_name: input.firstName ?? "",
        last_name: input.lastName ?? "",
        language_code: input.languageCode ?? "",
        locale: input.locale ?? "en",
        product_kind: input.productKind ?? "character",
        brief: input.brief,
      }),
    });
  }

  async function listCustomAgentOrders(telegramUserId: number) {
    return customAgentBotFetch<{ items: CustomAgentOrder[]; total: number }>(
      `/bot/custom-agent/orders?telegram_user_id=${telegramUserId}`,
    );
  }

  async function getCustomAgentOrder(orderId: string, telegramUserId: number) {
    return customAgentBotFetch<CustomAgentOrder>(
      `/bot/custom-agent/orders/${encodeURIComponent(orderId)}?telegram_user_id=${telegramUserId}`,
    );
  }

  async function customAgentOrderAction(
    orderId: string,
    action: "checkout" | "verify" | "accept" | "revise" | "cancel",
    telegramUserId: number,
    comment?: string,
  ) {
    return customAgentBotFetch<CustomAgentOrder | { checkout_url: string; order: CustomAgentOrder }>(
      `/bot/custom-agent/orders/${encodeURIComponent(orderId)}/${action}`,
      {
        method: "POST",
        body: JSON.stringify({
          telegram_user_id: telegramUserId,
          comment: comment ?? "",
        }),
      },
    );
  }

  async function uploadCustomAgentReference(telegramUserId: number, bytes: Buffer, filename: string) {
    if (!config.botApiKey) {
      throw new ApiError("BOT_API_KEY not configured", 503);
    }
    const form = new FormData();
    form.set("telegram_user_id", String(telegramUserId));
    form.set("file", new Blob([new Uint8Array(bytes)]), filename || "photo.jpg");
    const res = await fetch(`${config.apiBaseUrl}/bot/custom-agent/upload`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "X-Soulthread-Bot-Key": config.botApiKey,
      },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      throw new ApiError(`custom-agent upload ${res.status}`, res.status, data);
    }
    return data as { url: string };
  }

  return {
    listExploreRoles,
    getExploreRole,
    getRecommendedRoles,
    previewTgChannelAnnounce,
    getReferralMe,
    listReferralInvites,
    listTasks,
    claimTask,
    claimActivityMilestone,
    ackTask,
    ingestBotTranscript,
    authTelegramBot,
    getOrCreateChatSession,
    getChatQuota,
    sendChatText,
    previewVoice,
    listVipPlans,
    checkoutVipTelegram,
    checkoutVipNowPayments,
    checkoutVipStripe,
    confirmTelegramPayment,
    getCustomAgentConfig,
    createCustomAgentOrder,
    listCustomAgentOrders,
    getCustomAgentOrder,
    customAgentOrderAction,
    uploadCustomAgentReference,
  };
}

export type SoulthreadApi = ReturnType<typeof createSoulthreadApi>;
