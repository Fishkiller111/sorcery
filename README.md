# Sorcery / Soulthread 客户端

本仓库当前提供 Soulthread App / Web 客户端源码，基于 Expo、React Native 和 TypeScript。后端源码、管理端源码及原项目媒体素材**不在此首版源码中**。Telegram 运营 Bot 源码位于 `apps/telegram-bot/`；管理后台提供编译后的静态预览包；闭源后端以公开 Docker 镜像提供。

> **早期版本与安全提示**：运行依赖的 2026-11-03 本地审计有 5 项 high（无 critical），未修复；不要将此版本直接部署给真实用户。iOS、Android 真机及真实后端、登录、支付、语音和 Telegram 尚未完整验证。依赖安全与第三方许可证需在发行前复核；本源码许可证不覆盖第三方依赖或商标。

## 目录

- [`apps/client`](apps/client/README.md)：Expo Router 客户端、环境变量、源码结构、Web／原生开发、构建和限制。
- [`apps/telegram-bot`](apps/telegram-bot/README.md)：Telegram Bot 源码、配置、开发及测试。
- [`distributions/admin/0.1.1-preview`](distributions/admin/0.1.1-preview/README.md)：管理后台静态文件及第三方许可证，不含管理端源码。
- [`deploy/local`](deploy/local/README.md)：空库自建预览配置与操作说明。
- [`licenses/backend`](licenses/backend/README.md)：后端镜像的许可说明、第三方许可及对应第三方源码材料，不含本项目闭源后端源码。
- [`apps/client/assets/PLACEHOLDERS.md`](apps/client/assets/PLACEHOLDERS.md)：原图片、SVG、音频和视频由自制占位素材替换；实际视觉及故事体验会降级。
- [`LICENSE`](LICENSE) 与 [`apps/client/LICENSE-SCOPE.md`](apps/client/LICENSE-SCOPE.md)：本项目有权开放的自有源码采用 Apache-2.0；其他内容按其各自权利及条款处理。

## 后端空库预览：快速启动

公开镜像为 `ghcr.io/fishkiller111/sorcery-backend:0.1.0-preview`，仅支持 **linux/arm64**；暂未提供 linux/amd64 镜像。已公开 manifest digest：`sha256:ebc8897f11ede32755cdf0df6d5aaf91ca96717831392fd25a22beacab5d9e66`。这是预览版，真实第三方服务和生产部署尚未验收。

在安装 Docker Compose 和 Python 3 后，从仓库根目录执行：

```sh
cd deploy/local
python3 setup.py
docker compose --env-file .env up -d --wait db redis
docker compose --env-file .env run --rm init
docker compose --env-file .env up -d api worker
curl http://127.0.0.1:18888/api/v1/health
```

初始化**只用于全新空库**，不创建管理员、角色、剧情、模型供应商或原产品资源。随后根据[自建文档](deploy/local/README.md)自行创建管理员、配置业务数据、提示词、服务及 AI 出网白名单；初始状态不能直接聊天。切勿对已有数据库重复初始化。健康检查不等于聊天或其他业务已通过验收。

## 开发环境

需要 Node.js 22.13 或更高版本；本地验证环境为 macOS arm64 和 Node.js 26。首次安装需要访问 npm；使用 `--legacy-peer-deps` 是现有锁文件的安装条件，不能说明所有 peer 组合已经验证。**不要将真实账户密码、令牌、数据库凭据或支付密钥填入客户端变量。**

```bash
cd apps/client
npm ci --legacy-peer-deps --no-audit --no-fund
cp .env.example .env.local
# 编辑 .env.local，填写自己控制的测试 API、隐私政策和服务条款地址。
npm run web
```

`EXPO_PUBLIC_API_HOST` 是 API 的根地址，不带 `/api/v1`，默认 `http://localhost:8888`。客户端随后自动追加 `/api/v1`。若使用本仓库 `deploy/local` 的默认设置，桌面浏览器应将 `.env.local` 的 `EXPO_PUBLIC_API_HOST` 设为 `http://localhost:18888`；修改 `API_PORT` 时同步调整。手机的 localhost 指手机自身；默认后端只监听开发机回环地址，手机不能直接使用开发机局域网 IP 访问，需自行设置受控代理或隧道。生产服务须使用 HTTPS / WSS。

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

本项目无需在客户端保存服务端密钥。后端已提供上述空库预览镜像和自建配置，但不适合直接用于生产；不要假定健康接口通过就代表聊天、音频、支付等功能可用。具体配置说明见[客户端文档](apps/client/README.md)。

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

管理后台只提供[已编译静态文件](distributions/admin/0.1.1-preview/README.md)，不提供源码。按包内说明校验 SHA-256，把 `static/` 部署到静态服务器，并将同源 `/api/v1/` 和 `/static/` 反向代理到兼容后端。该版本部分 Telegram 公告、召回与邮件功能固定受限，不能仅通过运行时配置开启。静态包不代替后端鉴权或安全控制。

## 二次开发

路由在 `apps/client/app/`，业务组件与页面在 `apps/client/src/`，HTTP／WebSocket 客户端在 `apps/client/src/api/`；在自己的分支上修改并运行上述检查。静态素材只能使用自己有权使用及分发的内容；App 包名、iOS Google 登录配置和签名默认是占位，发布移动应用前需配置自己的账号和平台能力。后端以镜像分发，管理端只分发静态资源，不提供这两部分源代码。

语音可能加载第三方 SDK，其他可选功能涉及 Telegram、Apple、Google 和支付服务；部署者需自行评估配置、网络、用户同意、隐私和第三方许可。当前缺少完整第三方 notice，`standard-navigation@0.0.5` 上游包的完整许可证文本尚待核实；请见 [依赖与许可状态](THIRD-PARTY-STATUS.md)。
