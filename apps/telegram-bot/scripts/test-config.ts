import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";
import { welcomeKeyboard } from "../src/bot/keyboards.js";
import { handleStart } from "../src/bot/commands/start.js";
import { makeT } from "../src/i18n/index.js";
import { mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const env: NodeJS.ProcessEnv = {
  BOT_TOKEN: "123:test",
  WEB_APP_URL: "https://app.example.invalid/",
  MARKETING_URL: "https://website.example.invalid/",
  API_BASE_URL: "http://127.0.0.1:8888/api/v1/",
};
for (const key of ["WEB_APP_URL", "MARKETING_URL", "API_BASE_URL"]) {
  const missing = { ...env }; delete missing[key];
  assert.throws(() => loadConfig(missing), new RegExp(key), `${key} should be required`);
}
const config = loadConfig(env);
assert.equal(config.apiBaseUrl, "http://127.0.0.1:8888/api/v1");
assert.equal(config.staticBaseUrl, "http://127.0.0.1:8888");
assert.equal(config.tgChannelUrl, "");
assert.equal(config.tgGroupUrl, "");
assert.equal(config.customAgentBotUsername, "");
const buttons = welcomeKeyboard(config).inline_keyboard.flat();
assert.equal(buttons.filter((b) => "url" in b).length, 0, "no implicit production links");
const configured = loadConfig({ ...env, TG_CHANNEL_URL: "https://t.me/example_channel", TG_GROUP_URL: "https://t.me/example_group", CUSTOM_AGENT_BOT_USERNAME: "@example_bot" });
const configuredButtons = welcomeKeyboard(configured).inline_keyboard.flat();
assert.equal(configuredButtons.filter((b) => "url" in b).length, 3);
assert.throws(() => loadConfig({ ...env, BOT_MODE: "webhook", WEBHOOK_DOMAIN: "" }), /WEBHOOK_DOMAIN/);
for (const secret of ["with/slash", "with space", "x".repeat(257)]) {
  assert.throws(() => loadConfig({ ...env, WEBHOOK_SECRET: secret }), /WEBHOOK_SECRET/);
}
for (const secret of ["support", "a-Z_0123", "x".repeat(256)]) {
  assert.equal(loadConfig({ ...env, WEBHOOK_SECRET: secret }).webhookSecret, secret);
}
const derived = loadConfig(env).webhookSecret;
assert.match(derived, /^[a-z0-9_-]{1,256}$/i);
assert.equal(loadConfig({ ...env, WEBHOOK_SECRET: "" }).webhookSecret, derived);
for (const optional of ["TG_CHANNEL_URL", "TG_GROUP_URL", "CUSTOM_AGENT_BOT_USERNAME"] as const) {
  const one = loadConfig({ ...env, [optional]: optional === "CUSTOM_AGENT_BOT_USERNAME" ? "example_bot" : "https://t.me/example" });
  assert.equal(welcomeKeyboard(one).inline_keyboard.flat().filter((b) => "url" in b).length, 1, `${optional} independently optional`);
}
for (const key of ["WEB_APP_URL", "MARKETING_URL", "API_BASE_URL", "TG_CHANNEL_URL", "TG_GROUP_URL"] as const) {
  for (const value of ["javascript:alert(1)", "ftp://example.invalid/", "https://user:pass@example.invalid/"]) {
    assert.throws(() => loadConfig({ ...env, [key]: value }), new RegExp(key));
  }
}
for (const key of ["WEB_APP_URL", "MARKETING_URL", "API_BASE_URL"] as const) {
  for (const value of ["https://example.invalid/?query=1", "https://example.invalid/#hash"]) {
    assert.throws(() => loadConfig({ ...env, [key]: value }), new RegExp(key));
  }
}
for (const domain of ["http://example.invalid", "https://user:pass@example.invalid", "https://example.invalid/?query=1", "https://example.invalid/#hash", "not a URL"]) {
  assert.throws(() => loadConfig({ ...env, BOT_MODE: "webhook", WEBHOOK_DOMAIN: domain }), /WEBHOOK_DOMAIN/);
}
assert.equal(loadConfig({ ...env, BOT_MODE: "webhook", WEBHOOK_DOMAIN: "https://example.invalid/prefix/" }).webhookDomain, "https://example.invalid/prefix");
// Exercise /start text fallback, including each optional link, without Telegram or backend.
const cwd = process.cwd();
const isolated = mkdtempSync(path.join(tmpdir(), "bot-start-test-"));
try {
  process.chdir(isolated); // no optional banner file
  for (const current of [config, configured]) {
    let caption = "";
    const ctx = {
      config: current, locale: "en", t: makeT("en"), session: {},
      services: { events: { track: async () => {} }, api: { getRecommendedRoles: async () => [] } },
      reply: async (text: string) => { caption = text; },
    };
    await handleStart(ctx as never);
    assert(caption.includes(current.marketingUrl));
    assert(!caption.includes("undefined") && !caption.includes("{{"));
    for (const optionalUrl of [configured.tgChannelUrl, configured.tgGroupUrl, `https://t.me/${configured.customAgentBotUsername}`]) {
      assert.equal(caption.includes(optionalUrl), current === configured, "optional welcome links follow config");
    }
  }
} finally {
  process.chdir(cwd);
  rmdirSync(isolated);
}
console.log("PASS bot configuration and optional links");
