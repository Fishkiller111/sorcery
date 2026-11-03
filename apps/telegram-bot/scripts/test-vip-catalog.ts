import assert from "node:assert/strict";
import { makeT } from "../src/i18n/index.js";
import { buildVipCatalogText } from "../src/bot/commands/vip.js";
import type { VipPlan } from "../src/services/soulthread-api.js";

function plan(partial: Partial<VipPlan> & Pick<VipPlan, "id" | "code" | "name">): VipPlan {
  return {
    productType: "entitlement",
    billingType: "recurring",
    durationUnit: "month",
    durationValue: 1,
    priceCents: 1199,
    chargeCents: 1199,
    promoPercent: 0,
    currency: "USD",
    grantPoints: 0,
    isCustomRecharge: false,
    customMinPoints: 0,
    customStepPoints: 0,
    ...partial,
  };
}

const t = makeT("zh-Hans");
const text = buildVipCatalogText(t, {
  vipPlans: [
    plan({ id: "p-m", code: "premium_month", name: "PREMIUM", durationUnit: "month", priceCents: 1199 }),
    plan({ id: "p-y", code: "premium_year", name: "PREMIUM", durationUnit: "year", priceCents: 8390 }),
    plan({ id: "u-m", code: "ultimate_month", name: "ULTIMATE", durationUnit: "month", priceCents: 1999, chargeCents: 1999 }),
    plan({ id: "u-y", code: "ultimate_year", name: "ULTIMATE", durationUnit: "year", priceCents: 15900, chargeCents: 15900 }),
  ],
  oneTimePlans: [
    plan({
      id: "q1",
      code: "quota_pack_chat_100",
      name: "能量电池",
      productType: "quota_pack",
      billingType: "one_time",
      priceCents: 299,
      chargeCents: 239,
      promoPercent: 20,
      grantRewardType: "chat_quota",
      grantRewardAmount: 100,
      description: "立马获得 100 对话配额",
    }),
    plan({
      id: "w1",
      code: "welfare_long_endurance",
      name: "长续航套餐",
      productType: "welfare",
      billingType: "one_time",
      priceCents: 1499,
      chargeCents: 1499,
      grantPoints: 5000,
      description: "一个月 PREMIUM VIP + 赠送 5000 Soul",
    }),
  ],
  soulPlan: plan({
    id: "soul",
    code: "soul_custom",
    name: "Soul",
    productType: "points_pack",
    billingType: "one_time",
    isCustomRecharge: true,
    customMinPoints: 5000,
    priceCents: 1500,
  }),
});

assert.match(text, /PREMIUM/);
assert.match(text, /ULTIMATE/);
assert.match(text, /无限对话配额/);
assert.match(text, /故事模式/);
assert.match(text, /能量电池/);
assert.match(text, /100 对话配额/);
assert.match(text, /仅银行卡/);
assert.match(text, /长续航/);
assert.match(text, /Soul Coin/);
assert.match(text, /不可提现/);
assert.ok(text.length < 4096);
console.log("ok vip-catalog", text.length);
