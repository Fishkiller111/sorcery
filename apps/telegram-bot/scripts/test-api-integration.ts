import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { loadConfig } from "../src/config.js";
import { ApiError, createSoulthreadApi } from "../src/services/soulthread-api.js";

const seen: Array<{path: string; key?: string; authorization?: string; body?: unknown}> = [];
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url ?? "/", "http://127.0.0.1");
  const parts: Buffer[] = [];
  for await (const part of req) parts.push(Buffer.from(part));
  const raw = Buffer.concat(parts).toString();
  seen.push({path: u.pathname, key: req.headers["x-soulthread-bot-key"] as string | undefined,
    authorization: req.headers.authorization, body: raw ? JSON.parse(raw) : undefined});
  const json = (v: unknown) => { res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify(v)); };
  if (u.pathname === "/api/v1/auth/telegram/bot") {
    const data = raw ? JSON.parse(raw) as {telegram_id?: number} : {};
    if (data.telegram_id === 0) { res.writeHead(401, {"Content-Type":"text/plain"}); res.end("invalid identity"); return; }
    json({token:"unit-jwt", expires_at:12345, is_new_user:true}); return;
  }
  if (u.pathname === "/api/v1/explore/roles") { json({roles:[{id:"role-1", name:"Test", avatar_url:"/a.png"}]}); return; }
  if (u.pathname === "/api/v1/chat/messages") { json({session_id:"session-1"}); return; }
  if (u.pathname === "/api/v1/chat/quota") { json({unlimited:false, remaining_messages_hint:7, plan_code:"test"}); return; }
  if (u.pathname === "/api/v1/chat/send") {
    const data = JSON.parse(raw) as {content?: string};
    res.writeHead(200, {"Content-Type":"text/event-stream"});
    if (data.content === "error") { res.end('data: {"type":"error","message":"simulated failure"}\n\n'); return; }
    res.write('data: null\n\n' + 'data: {"type":"text_delta","content":"Hello"}\r');
    res.write('\n\r\n' + 'data: {"type":"text_delta","content":" world"}\n\n');
    res.end('data: {"type":"done"}'); return;
  }
  res.writeHead(404); res.end();
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const port = (server.address() as AddressInfo).port;
  const config = loadConfig({BOT_TOKEN:"123:test", BOT_API_KEY:"mock-key", WEB_APP_URL:"https://app.example.invalid",
    MARKETING_URL:"https://site.example.invalid", API_BASE_URL:`http://127.0.0.1:${port}/api/v1`});
  const api = createSoulthreadApi(config);
  assert.deepEqual(await api.authTelegramBot({telegramId:42, username:"tester"}), {token:"unit-jwt", expiresAt:12345, isNewUser:true});
  assert.equal(seen[0].key, "mock-key");
  assert.equal((seen[0].body as {telegram_id:number}).telegram_id, 42);
  assert.deepEqual(await api.listExploreRoles(), [{id:"role-1", name:"Test", avatarUrl:`http://127.0.0.1:${port}/a.png`, introduction:undefined}]);
  assert.equal(await api.getOrCreateChatSession("unit-jwt", "role-1"), "session-1");
  assert.equal((await api.getChatQuota("unit-jwt")).remainingHint, 7);
  assert.equal(seen.find((v) => v.path.endsWith("/chat/quota"))?.authorization, "Bearer unit-jwt");
  const input = {token:"unit-jwt", sessionId:"session-1", roleId:"role-1", content:"hello"};
  const chat = await api.sendChatText(input);
  assert.equal(chat.reply, "Hello world");
  assert.equal(chat.events.at(-1)?.type, "done");
  await assert.rejects(api.sendChatText({...input,content:"error"}), (e: unknown) => e instanceof ApiError && e.status === 502 && e.message === "simulated failure");
  await assert.rejects(api.authTelegramBot({telegramId:0}), (e: unknown) => e instanceof ApiError && e.status === 401 && e.body === "invalid identity");
  console.log("PASS local mock backend: auth, roles, chat/quota, streaming, error handling");
} finally {
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
}
