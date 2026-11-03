# Soulthread Telegram Bot

Telegram 用户入口及运营 Bot，包含轻聊、Mini App 入口、角色展示、运营命令、多语言，以及可选的客服 Bot、定制角色 Bot 和语音预览。该 Bot **依赖与当前版本兼容的 Soulthread 后端**：源码开放不代表后端源码也开放。部分支付、客服及运营逻辑与现有业务紧密耦合，自建前应按自己的产品逐项核对。

> 当前文档描述本地准备；真正的 Telegram 连通、Web App、支付与生产部署是否可用须以各自环境实测为准。本目录由权利人提供的自有源码采用 Apache-2.0；第三方组件、素材、商标与服务可能适用不同许可，自建者应自行核对。

## 1. 运行前准备

- Node.js、npm 和兼容的后端。`package.json` 声明 Node.js ≥ 20；当前只对实际测试环境进行验证，不代表所有 Node 版本均已验证。
- 自己的 Telegram Bot Token；请在自己的私密环境配置，不要提交到 Git、分享截图或发在 issue 中。
- 可访问的 Web App、营销站地址以及后端 API 地址。Telegram Mini App 的线上使用需要符合 Telegram 对 HTTPS 和域名的要求；本地回环地址供 Bot 在本机访问 API，不代表 Telegram 用户能从外部访问。
- 需要 Bot 与后端联合鉴权时，后端也要配置自己的 Telegram Bot Token 和 Bot API Key；Bot 的 `BOT_API_KEY` 应与后端相应值一致。实际支持能力取决于双方版本及后端配置。

## 2. 首次配置与本地启动

从本目录执行：

```bash
npm ci
cp .env.example .env
# 用编辑器填写自己的 .env，不要提交此文件
npm run dev
```

必须设置：

| 变量 | 用途 |
|---|---|
| `BOT_TOKEN` | 自己的 Telegram Bot Token，不能为空 |
| `WEB_APP_URL` | 自己的 Web App 基础地址；示例的 `example.invalid` 必须替换 |
| `MARKETING_URL` | 自己的营销站基础地址；示例的 `example.invalid` 必须替换 |
| `API_BASE_URL` | 兼容后端 API 地址，例如本机端口的 `/api/v1`；使用容器或远程主机时改为 Bot 进程实际可访问的地址 |

配置缺失时进程会报错，而不会回退连接到原产品的生产 API。`STATIC_BASE_URL` 留空时从 API 地址的协议、主机和端口推导；如果静态资源单独托管，请显式填写。

`BOT_MODE=polling` 为本地默认；该模式会删除此 Bot 当前设置的 webhook，因此不要对正在被其他服务使用的生产 Bot Token 直接运行。`npm run dev` 是监视模式；`npm start` 直接运行 TypeScript 源码，依赖已安装的 `tsx`。

## 3. 可选配置

- `TG_CHANNEL_URL`、`TG_GROUP_URL`、`CUSTOM_AGENT_BOT_USERNAME`：留空时不显示对应欢迎按钮；只有填写自己的地址/用户名才会显示。可选的 `CUSTOM_AGENT_BOT_TOKEN` 会启动独立定制 Bot。
- `BOT_API_KEY`：Bot 调用后端受保护接口所需密钥；留空时部分鉴权、聊天及运营功能不可用。`DEV_CHAT_JWT` 仅用于开发调试，不应放入公开文件或共享环境。
- `OPS_TELEGRAM_IDS`：允许使用 `/drop`、`/aff`、`/stats` 的 Telegram 数字用户 ID，逗号分隔。默认空集合，拒绝所有运营用户；注意不要误填群 ID。
- `BOT_USERNAME`：可手动填写不带 `@` 的用户名，留空时启动尝试通过 Telegram 查询。
- `TELEGRAM_PROXY_URL`：按需填写受信任的 HTTP(S) 代理；留空时程序还会读取标准 HTTP(S) 代理环境变量。示例不启用代理。当前发行候选固定使用 `https-proxy-agent@7.0.6`；已用本机 HTTP CONNECT、Basic 认证和经过证书验证的 HTTPS 目标模拟测试，未验证 SOCKS、Kerberos、HTTPS 代理入口及真实 Telegram 网络。代理凭据不得出现在日志或提交文件中。
- `SUPPORT_BOT_TOKEN`：单独客服 Bot Token；客服 LLM 还需配置自己的 API Key、地址及模型。客服提示和知识文件目前包含现有产品的业务信息、品牌和链接，**不适合未经审核直接面向自建产品用户**。
- `TTS_PREVIEW_ENABLED`、`TTS_PREVIEW_VOICE_ID`：可选语音预览；真实可用性依赖后端与语音服务。
- `PAYMENT_PROVIDER_TOKEN`：可选 Telegram Payments 提供商 token。是否可收款还取决于后端、支付商、地区、商品和合规配置，默认不保证可用。
- 其他限流、配额、事件目录与客服参数参见 `.env.example`。`.events/` 可能包含 Telegram 用户信息、运营事件及鉴权缓存，应限制权限、配置备份和保留期限，禁止上传公开仓库。

## 4. Webhook 运行方式

在正式环境使用 webhook 前，需准备自己控制的公网 HTTPS 入口、正确的反向代理和受保护的主机。不要在无法访问 Telegram 的环境中直接宣称 webhook 已生效。

```dotenv
BOT_MODE=webhook
WEBHOOK_DOMAIN=https://your-bot.example.invalid
WEBHOOK_SECRET=<自己生成的随机安全值>
PORT=8080
```

将 `WEBHOOK_DOMAIN` 换成自己的真实 HTTPS 地址，不得包含凭据、查询参数或片段；`WEBHOOK_SECRET` 若显式设置，必须是 1–256 位英文字母、数字、下划线或连字符。主 Web、营销站、API 与可选频道/群组地址须为不含嵌入式凭据的 HTTP(S) 地址；主 Web、营销站和 API 基础地址也不能包含查询参数或片段。主 Bot 与可选 Bot 会分别注册各自的 webhook；服务验证 Telegram 请求头中的 secret token。反向代理要保留该请求头，且禁止在访问日志、截图和监控中记录 webhook 完整路径、Token、请求内容或密钥。若不显式设置 `WEBHOOK_SECRET`，程序会从 Bot Token 派生；建议配置独立随机值并妥善保管。

Webhook 模式提供 `GET /healthz` 和受保护的 `GET /ops/funnel`。运营接口仅接受 `X-Soulthread-Bot-Key` 请求头，不接受 URL 查询参数密钥；默认 `BOT_API_KEY` 为空时拒绝访问。仍应通过代理限制访问并保护该请求头。`day` 仅接受有效的 `YYYY-MM-DD` 日期。真正上线前还要自行配置 TLS、访问限制、日志脱敏、备份和监控。

## 5. 代码结构和二次开发

| 位置 | 作用 |
|---|---|
| `src/index.ts`、`src/config.ts` | 进程入口与环境配置校验 |
| `src/bot/` | Bot 组装、命令、事件与按钮 |
| `src/services/` | 后端 API、鉴权、事件和链接 |
| `src/i18n/` | 多语言与地区解析 |
| `src/support/`、`src/custom-agent/` | 可选客服、角色定制逻辑 |
| `src/server/` | webhook 和运营 HTTP 接口 |
| `scripts/` | 本地测试脚本 |

修改 Bot 前应确认对应版本的后端接口契约。现有多语言联盟文案、客服知识、素材和品牌信息仍包含原项目相关内容，请在自建或公开发布前逐项检查替换，不要把当前仓库当成已完成全部去耦和授权审查的模板。

## 6. 验证命令

```bash
npm run typecheck
npm run test:urlshim
npm run build
npm run test:config
npm run test:webhook
npm run test:api-integration
npm run test:proxy
npm run test:payload
npm run test:locale
```

配置测试只检查本地解析及按钮；webhook 测试使用模拟 Bot 和本地 HTTP；API 集成测试使用本机模拟服务验证鉴权、角色列表、聊天流及错误处理。代理测试需要本机可用的 OpenSSL，临时创建测试证书和仅监听回环地址的 HTTPS 服务与 HTTP CONNECT 代理，结束时删除测试证书；它会验证 Basic 代理认证、TLS、模拟 Telegram 消息、图片上传和文件下载。这些测试不访问 Telegram 或真实后端，不能代替真实 Bot、Mini App、支付、WebSocket 或公网 webhook 联调。`npm run build` 输出 `dist/`，运行方式和依赖/资源路径需在目标部署环境另行验证。

排错时先确认四个必填配置、Bot 与后端的 API Key、实际网络连通、后端接口版本以及系统代理；查看日志前先脱敏。若 Bot 可启动但聊天、支付或图片不可用，应分别检查相应后端和第三方能力，而不是仅凭进程运行判断全部功能可用。

## 素材分发范围

本候选没有打包 `assets/` 中的视频和充值截图，因素材授权和内容尚未审核。欢迎消息会退回纯文本；充值图片步骤会跳过。公开前须替换为经授权且不含真实支付信息的素材并验证功能。若自行补充素材，请先确认相应的使用及再分发权利。

## Node URL 兼容层与依赖升级

为避免随当前 `node-fetch@2.7.0` 间接分发缺少完整许可材料的旧 `tr46`，本候选通过 npm 的本地依赖与 override 使用 `vendor/whatwg-url-node20`。该兼容层是项目自有原创代码，按本目录 Apache-2.0 许可，只暴露 Node.js 内置的 `URL`，**不是完整 `whatwg-url` 的替代实现**；没有复制上游 whatwg-url 或 tr46 的源码、映射表或数据。它只支持本候选审查过的 grammY 1.45.1 → node-fetch 2.7.0 调用链和 Node.js ≥ 20。

执行 `npm ci` 后，`npm run test:urlshim` 检查依赖拓扑、固定的 node-fetch 源文件哈希和 shim 输出；`npm run dev`、`npm start`、`npm run build` 的前置步骤也会执行检查。升级 grammY、node-fetch、Node 或添加其他 `whatwg-url` 使用者时，不要跳过报错：须重新审查它们实际使用的 API、许可证和 URL 行为，再更新测试与守门。禁止用它当作通用 npm 包发布。

该方案在 Node 20、22、24、26 的指定本地环境及模拟服务上测试，不表示真实 Telegram、第三方网络或所有 Node 版本均已验证。npm audit 不核验本地自写 shim 安全性或许可义务。
