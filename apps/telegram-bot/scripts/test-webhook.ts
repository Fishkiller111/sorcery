import assert from "node:assert/strict";
import net from "node:net";
import { loadConfig } from "../src/config.js";
import { startWebhookServer } from "../src/server/webhook.js";

const probe = net.createServer();
await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
const address = probe.address();
assert(address && typeof address !== "string");
const port = address.port;
await new Promise<void>((resolve, reject) => probe.close((e) => e ? reject(e) : resolve()));
// "support" intentionally matches the support-path prefix and verifies exact routing.
const cfg = loadConfig({ BOT_TOKEN: "123:test", SUPPORT_BOT_TOKEN: "456:support", CUSTOM_AGENT_BOT_TOKEN: "789:custom", BOT_MODE: "webhook", WEBHOOK_DOMAIN: "https://example.invalid", WEBHOOK_SECRET: "support", PORT: String(port), WEB_APP_URL: "https://app.example.invalid", MARKETING_URL: "https://site.example.invalid", API_BASE_URL: "http://127.0.0.1:8888/api/v1", BOT_API_KEY: "unit-test-key", EVENTS_DIR: "" });
const calls: Record<string, number> = { main: 0, support: 0, custom: 0 };
const registrations: Array<{url: string; secret: string}> = [];
// Stub external Bot methods: this test sends no Telegram request.
const makeBot = (name: keyof typeof calls) => ({
  isRunning: () => false,
  init: async () => {},
  handleUpdate: async () => { calls[name] += 1; },
  api: { setWebhook: async (url: string, opts: {secret_token: string}) => { registrations.push({ url, secret: opts.secret_token }); return true; } },
});
try {
  await startWebhookServer(makeBot("main") as never, cfg, makeBot("support") as never, makeBot("custom") as never);
  const endpoints = [
    { path: `/telegram/webhook/${cfg.webhookSecret}`, secret: cfg.webhookSecret, name: "main" },
    { path: `/telegram/webhook/support/${cfg.supportWebhookSecret}`, secret: cfg.supportWebhookSecret, name: "support" },
    { path: `/telegram/webhook/custom/${cfg.customAgentWebhookSecret}`, secret: cfg.customAgentWebhookSecret, name: "custom" },
  ] as const;
  assert.equal(registrations.length, 3);
  for (const endpoint of endpoints) {
    assert(registrations.some((r) => r.url === cfg.webhookDomain + endpoint.path && r.secret === endpoint.secret));
    const url = `http://127.0.0.1:${port}${endpoint.path}`;
    const post = (secret?: string) => fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(secret ? { "X-Telegram-Bot-Api-Secret-Token": secret } : {}) }, body: JSON.stringify({ update_id: 1 }) });
    assert.equal((await post()).status, 401, `${endpoint.name} missing header`);
    assert.equal((await post("incorrect")).status, 401, `${endpoint.name} incorrect header`);
    assert.equal(calls[endpoint.name], 0);
    assert.equal((await post(endpoint.secret)).status, 200, `${endpoint.name} correct header`);
    assert.equal(calls[endpoint.name], 1);
    assert.equal((await fetch(url)).status, 404, `${endpoint.name} must reject GET`);
    assert.equal((await fetch(`${url}/extra`, { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": endpoint.secret }, body: "{}" })).status, 404, `${endpoint.name} must reject path suffix`);
  }
  assert.deepEqual(calls, { main: 1, support: 1, custom: 1 });
  const ops = `http://127.0.0.1:${port}/ops/funnel`;
  assert.equal((await fetch(ops)).status, 401, "missing ops key rejected");
  assert.equal((await fetch(`${ops}?secret=${cfg.webhookSecret}`)).status, 401, "query secret rejected");
  assert.equal((await fetch(ops, { headers: { "X-Soulthread-Bot-Key": "incorrect" } })).status, 401);
  const headers = { "X-Soulthread-Bot-Key": "unit-test-key" };
  assert.equal((await fetch(`${ops}?day=2026-11-03`, { headers })).status, 200);
  assert.equal((await fetch(`${ops}?day=2026-02-30`, { headers })).status, 400);
  assert.equal((await fetch(`${ops}?day=../../private`, { headers })).status, 400);
  console.log("PASS main/support/custom exact routes, registration and webhook secret checks");
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
