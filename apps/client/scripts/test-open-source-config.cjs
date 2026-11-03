// 验证发行候选的默认配置及两种聊天 WebSocket，不连接任何网络服务。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function loadTs(relative, dependencies, env, context = {}) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const result = { exports: {} };
  const fakeRequire = (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  const run = new Function('require', 'module', 'exports', 'process', 'window', 'WebSocket', js);
  run(fakeRequire, result, result.exports, { env }, context.window, context.WebSocket);
  return result.exports;
}
function loadConfig(env = {}, origin = 'https://old-production.example') {
  return loadTs('src/constants/config.ts', { 'react-native': { Platform: { OS: 'web' } } }, env, {
    window: { location: { hostname: new URL(origin).hostname, origin } },
  });
}

const local = loadConfig();
assert.equal(local.getApiHost(), 'http://localhost:8888');
assert.equal(local.getApiBase(), 'http://localhost:8888/api/v1');
assert.equal(local.getWsBase(), 'ws://localhost:8888');
assert.equal(local.getAppStaticBase(), '');

const configured = loadConfig({ EXPO_PUBLIC_API_HOST: 'https://self-hosted.example///', EXPO_PUBLIC_APP_STATIC_BASE: 'https://cdn.example/assets/' });
assert.equal(configured.getApiHost(), 'https://self-hosted.example');
assert.equal(configured.getApiBase(), 'https://self-hosted.example/api/v1');
assert.equal(configured.getWsBase(), 'wss://self-hosted.example');
assert.equal(configured.getAppStaticBase(), 'https://cdn.example/assets');
assert.equal(loadConfig({ EXPO_PUBLIC_API_HOST: 'http://127.0.0.1:7777' }).getWsBase(), 'ws://127.0.0.1:7777');
assert.equal(loadConfig({ EXPO_PUBLIC_API_HOST: 'HTTPS://EXAMPLE.TEST/' }).getWsBase(), 'wss://example.test');
assert.equal(loadConfig({ EXPO_PUBLIC_API_HOST: 'https://self-hosted.example' }).getAppStaticBase(), '');
for (const bad of ['javascript:alert(1)', 'https://user:pass@host.test', 'https://host.test/?token=secret']) assert.equal(loadConfig({ EXPO_PUBLIC_APP_STATIC_BASE: bad }).getAppStaticBase(), '');
for (const bad of ['not-a-url', 'ftp://example.test', 'https://user:pass@example.test', 'https://example.test?secret=foo', 'https://example.test/#hash', 'https://example.test?']) {
  assert.throws(() => loadConfig({ EXPO_PUBLIC_API_HOST: bad }).getApiHost(), /EXPO_PUBLIC_API_HOST/);
}

const sockets = [];
class FakeWebSocket {
  constructor(url) { this.url = url; this.messages = []; sockets.push(this); }
  send(text) { this.messages.push(text); }
  close() {}
}
const reconnect = loadTs('src/api/wsReconnect.ts', {}, {}, {});
const deps = { '../constants/config': configured, './wsReconnect': reconnect };
const ctx = { WebSocket: FakeWebSocket };
const { ChatWebSocket } = loadTs('src/api/websocket.ts', deps, {}, ctx);
const { StoryWebSocket } = loadTs('src/api/storyWebSocket.ts', deps, {}, ctx);
new ChatWebSocket('test-token', {}).connect('session 1');
new StoryWebSocket('test-token', {}).connect('story 1');
assert.equal(sockets[0].url, 'wss://self-hosted.example/api/v1/chat/listen?session_id=session%201');
assert.equal(sockets[1].url, 'wss://self-hosted.example/api/v1/story/listen?session_id=story%3Astory%201');
for (const socket of sockets) {
  assert(!socket.url.includes('test-token'), 'token 不得放入 URL');
  socket.onopen();
  assert.equal(JSON.parse(socket.messages[0]).token, 'test-token');
  assert.equal(JSON.parse(socket.messages[0]).type, 'auth');
}
assert.equal(JSON.parse(sockets[0].messages[0]).session_id, 'session 1');
assert.equal(JSON.parse(sockets[1].messages[0]).story_session_id, 'story 1');

// 开源构建未提供外链时必须关闭，避免误连运营账户或展示他人政策。
const socialDefault = loadTs('src/constants/social.ts', {}, {});
assert.equal(socialDefault.SOCIAL_LINKS.length, 0);
assert.equal(socialDefault.SUPPORT_BOT_URL, '');
assert.equal(socialDefault.MARKETING_SITE_URL, '');
const socialSet = loadTs('src/constants/social.ts', {}, {
  EXPO_PUBLIC_SOCIAL_X_URL: 'https://social.example/a',
  EXPO_PUBLIC_SUPPORT_BOT_USERNAME: 'own_bot',
  EXPO_PUBLIC_MARKETING_SITE_URL: 'https://site.example',
});
assert.equal(socialSet.SOCIAL_LINKS[0].url, 'https://social.example/a');
assert.equal(socialSet.SUPPORT_BOT_URL, 'https://t.me/own_bot');
assert.equal(socialSet.MARKETING_SITE_URL, 'https://site.example/');
const socialUnsafe = loadTs('src/constants/social.ts', {}, { EXPO_PUBLIC_SOCIAL_X_URL: 'javascript:alert(1)', EXPO_PUBLIC_SUPPORT_BOT_USERNAME: 'bad/handle', EXPO_PUBLIC_MARKETING_SITE_URL: 'https://u:p@site.example' });
assert.equal(socialUnsafe.SOCIAL_LINKS.length, 0);
assert.equal(socialUnsafe.SUPPORT_BOT_URL, '');
assert.equal(socialUnsafe.MARKETING_SITE_URL, '');
const legalDefault = loadTs('src/constants/legal.ts', {}, {});
assert.equal(legalDefault.VIP_LEGAL_READY, false);
for (const bad of ['http://example.test/privacy', 'javascript:alert(1)', 'https://u:p@example.test']) {
  assert.equal(loadTs('src/constants/legal.ts', {}, { EXPO_PUBLIC_PRIVACY_URL: bad, EXPO_PUBLIC_TERMS_URL: 'https://legal.example/terms' }).VIP_LEGAL_READY, false);
}
const legalSet = loadTs('src/constants/legal.ts', {}, { EXPO_PUBLIC_PRIVACY_URL: 'https://legal.example/privacy', EXPO_PUBLIC_TERMS_URL: 'https://legal.example/terms' });
assert.equal(legalSet.VIP_LEGAL_READY, true);
// 缺省外部素材必须为本地占位；配置后才返回自有素材服务器 URL。
const assetDeps = { '../constants/config': local, '../../assets/placeholder.png': 123 };
const localAssets = loadTs('src/utils/appStaticAssets.ts', assetDeps, {});
assert.equal(localAssets.appStaticImageUrl('scenes/example.jpg'), '');
assert.equal(localAssets.appStaticImage('scenes/example.jpg'), 123);
const configuredAssets = loadTs('src/utils/appStaticAssets.ts', { ...assetDeps, '../constants/config': configured }, {});
assert.equal(configuredAssets.appStaticImageUrl('scenes/example.jpg'), 'https://cdn.example/assets/images/scenes/example.jpg');
assert.equal(configuredAssets.appStaticImage('scenes/example.jpg').uri, 'https://cdn.example/assets/images/scenes/example.jpg');

// Native 的 window 可能没有 location；不得意外抛错或访问原站点。
const { resolveShareOrigin } = loadTs('src/utils/shareOrigin.ts', {}, {});
assert.equal(resolveShareOrigin('', 'ios', undefined), '');
assert.equal(resolveShareOrigin('', 'android', undefined), '');
assert.equal(resolveShareOrigin('', 'web', undefined), '');
assert.equal(resolveShareOrigin('', 'web', { origin: 'https://self.example' }), 'https://self.example');
assert.equal(resolveShareOrigin('https://configured.example/', 'ios', undefined), 'https://configured.example');
assert.equal(resolveShareOrigin('javascript:alert(1)', 'ios', undefined), '');

// 当服务端只有一种标题时，画廊原始的中英文翻译仍优先。
const { mergeGalleryTitle } = loadTs('src/utils/galleryTitle.ts', {}, {});
assert.deepEqual(mergeGalleryTitle('SERVER', { zh: '原中文', en: 'Original English' }), { zh: '原中文', en: 'Original English' });

// 未配置政策时，即使调用者绕过 UI，结算 API 也不得发网络请求。
(async () => {
  let requests = 0;
  const depBase = {
    'expo-linking': { createURL: (path) => `testapp://${path}` },
    './client': { apiFetch: async (path, opts) => { requests += 1; return { path, ...opts }; } },
    '../constants/config': { APP_SITE_URL: 'https://app.example.test' },
  };
  const noLegal = loadTs('src/api/vip.ts', { ...depBase, '../constants/legal': legalDefault }, {});
  await assert.rejects(() => noLegal.checkoutVip('test-plan'), /must be configured/);
  assert.equal(requests, 0);
  const yesLegal = loadTs('src/api/vip.ts', { ...depBase, '../constants/legal': legalSet }, {});
  await yesLegal.checkoutVip('test-plan');
  assert.equal(requests, 1);
  console.log('PASS: 发行候选配置、外链、政策、结算保护及聊天/剧情 WebSocket');
})().catch((err) => { console.error(err); process.exitCode = 1; });
