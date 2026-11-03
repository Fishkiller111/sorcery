# Sorcery / Soulthread 客户端

本仓库当前提供 Soulthread App / Web 客户端源码，基于 Expo、React Native 和 TypeScript。后端源码、管理端源码及原项目媒体素材**不在此首版源码中**。Telegram 运营 Bot 源码位于 `apps/telegram-bot/`；管理后台提供编译后的静态预览包，后端镜像尚未发布。

> **早期版本与安全提示**：运行依赖的 2026-11-03 本地审计有 5 项 high（无 critical），未修复；不要将此版本直接部署给真实用户。iOS、Android 真机及真实后端、登录、支付、语音和 Telegram 尚未完整验证。依赖安全与第三方许可证需在发行前复核；本源码许可证不覆盖第三方依赖或商标。

## 目录

- [`apps/client`](apps/client/README.md)：Expo Router 客户端、环境变量、源码结构、Web／原生开发、构建和限制。
- [`apps/telegram-bot`](apps/telegram-bot/README.md)：Telegram Bot 源码、配置、开发及测试。
- [`distributions/admin/0.1.0-preview`](distributions/admin/0.1.0-preview/README.md)：管理后台静态文件及第三方许可证，不含管理端源码。
- [`deploy/local`](deploy/local/README.md)：空库自建预览配置与操作说明；后端镜像尚未发布。
- [`apps/client/assets/PLACEHOLDERS.md`](apps/client/assets/PLACEHOLDERS.md)：原图片、SVG、音频和视频由自制占位素材替换；实际视觉及故事体验会降级。
- [`LICENSE`](LICENSE) 与 [`apps/client/LICENSE-SCOPE.md`](apps/client/LICENSE-SCOPE.md)：本项目有权开放的自有源码采用 Apache-2.0；其他内容按其各自权利及条款处理。

## 开发环境

需要 Node.js 22.13 或更高版本；本地验证环境为 macOS arm64 和 Node.js 26。首次安装需要访问 npm；使用 `--legacy-peer-deps` 是现有锁文件的安装条件，不能说明所有 peer 组合已经验证。**不要将真实账户密码、令牌、数据库凭据或支付密钥填入客户端变量。**

```bash
cd apps/client
npm ci --legacy-peer-deps --no-audit --no-fund
cp .env.example .env.local
# 编辑 .env.local，填写自己控制的测试 API、隐私政策和服务条款地址。
npm run web
```

`EXPO_PUBLIC_API_HOST` 是 API 的根地址，不带 `/api/v1`，默认 `http://localhost:8888`。客户端随后自动追加 `/api/v1`。手机的 localhost 指手机自身；真机应填写设备可访问的测试服务器地址，生产服务须使用 HTTPS / WSS。

未配置运营者真实有效的 HTTPS 隐私政策和服务条款时，客户端有意禁用登录注册同意与部分结算、AI 数据同意入口；仅填占位地址不等于法律文本真实有效。`EXPO_PUBLIC_*` 会进入客户端构建产物，不得放任何秘密。

## 测试与 Web 构建

```bash
cd apps/client
npm run typecheck
npm run test:config
npm run test:soft-upsell
EXPO_PUBLIC_APP_SITE_URL=https://app.example.invalid \
EXPO_PUBLIC_MARKETING_SITE_URL=https://site.example.invalid \
npm run build:web
```

上面 example.invalid 地址仅用于隔离构建，不是实际可用的政策、生产服务或后端。Web 产物位于 `apps/client/dist/`，未被提交到本仓库。Web 构建成功不代表线上功能、原生设备或真实业务已验收。

本项目无需在客户端保存服务端密钥。后端现阶段未提供已公开、可下载的正式镜像与安全自建配置，启动前需自行准备兼容的测试服务；不要假定健康接口通过就代表聊天、音频、支付等功能可用。具体配置说明见[客户端文档](apps/client/README.md)。

## Telegram Bot

Bot 源码位于 `apps/telegram-bot/`，需自行准备兼容的后端、Telegram 测试 Bot 和私密配置：

```bash
cd apps/telegram-bot
npm ci
cp .env.example .env
# 编辑 .env，填写你自己的服务地址和测试凭据，不要提交此文件。
npm run typecheck
npm run test:urlshim
npm run dev
```

本地 polling 会删除该 Telegram Bot 当前 webhook；测试时请使用独立测试 Bot。真实 Telegram、支付与后端联调尚未验收。配置说明、Webhook、模拟测试和自定义注意事项见 [Bot README](apps/telegram-bot/README.md)；不要将密钥写入客户端、仓库或 issue。

## 管理后台静态预览

管理后台只提供[已编译静态文件](distributions/admin/0.1.0-preview/README.md)，不提供源码。按包内说明校验 SHA-256，把 `static/` 部署到静态服务器，并将同源 `/api/v1/` 和 `/static/` 反向代理到兼容后端；后端镜像目前尚未发布。该版本部分 Telegram 公告、召回与邮件功能固定受限，不能仅通过运行时配置开启。静态包不代替后端鉴权或安全控制。

## 二次开发

路由在 `apps/client/app/`，业务组件与页面在 `apps/client/src/`，HTTP／WebSocket 客户端在 `apps/client/src/api/`；在自己的分支上修改并运行上述检查。静态素材只能使用自己有权使用及分发的内容；App 包名、iOS Google 登录配置和签名默认是占位，发布移动应用前需配置自己的账号和平台能力。后端仅计划分发镜像，管理端只分发静态资源，不提供这两部分源代码。

语音可能加载第三方 SDK，其他可选功能涉及 Telegram、Apple、Google 和支付服务；部署者需自行评估配置、网络、用户同意、隐私和第三方许可。当前缺少完整第三方 notice，`standard-navigation@0.0.5` 上游包的完整许可证文本尚待核实；请见 [依赖与许可状态](THIRD-PARTY-STATUS.md)。
