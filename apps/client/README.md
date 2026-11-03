# Soulthread 客户端

> 当前代码为早期版本，真实业务及原生设备未完整验证。原图片、SVG、音频和视频已用自制占位替代，界面与剧情视听体验已降级；第三方依赖、项目名称/商标和故事文本仍需单独审查。用户端源码采用的许可证以发行根目录说明为准；后端及管理后台不随此目录提供源码。

## 技术与目录

- Expo SDK 57 / React Native 0.86 / React 19，Expo Router 和 TypeScript；Node.js 22.13 或以上。实际验证以发行根目录的验证记录为准。
- `app/` 是页面路由；`src/` 是业务、UI、请求和 WebSocket；`assets/` 是占位素材（详见 `assets/PLACEHOLDERS.md`）；`public/` 是 Web 静态文件；`scripts/` 是部分构建与验证脚本。
- 本项目消费后端 HTTP 和 WebSocket 服务；Web 导出通过不代表真实业务、登录、支付、Telegram、iOS 或 Android 通过。

## 本地开发

```bash
npm ci --legacy-peer-deps --no-audit --no-fund
cp .env.example .env.local
# 按下方说明填写自己的隔离测试服务地址与策略文件地址。
npm run web
```

Expo 原生入口 `npm run ios` / `npm run android` 需要相应开发环境和原生依赖，必须另做平台验证。手机真机的 localhost 指手机本身，需改为设备可访问的开发机地址；自建线上服务应使用 HTTPS 和相应 WSS。

`EXPO_PUBLIC_*` 值会进入客户端包，**绝不可放 API key、支付密钥或其他秘密**。

## 配置与默认行为

| 配置 | 说明 |
|---|---|
| `EXPO_PUBLIC_API_HOST` | API 根地址，不含 `/api/v1`，要求 HTTP(S)、不可包含账户、查询或片段；未设置时为 `http://localhost:8888`；聊天 WS/WSS 从此地址派生。 |
| `EXPO_PUBLIC_APP_STATIC_BASE` | 自有且具有分发权的静态素材源；未设置或格式无效时使用透明占位，不会请求远程地址；私有镜像仅完成部分原媒体比对，尚不能假定它包含或不包含全部对应素材。 |
| `EXPO_PUBLIC_APP_SITE_URL` | 公开 App 根地址；用于分享和 OAuth 等。移动端无法确定页面地址时应显式配置。 |
| `EXPO_PUBLIC_MARKETING_SITE_URL` | 自有营销网站；社交栏的该入口只接受 HTTPS，留空不显示。 |
| `EXPO_PUBLIC_SOCIAL_X_URL` / `EXPO_PUBLIC_SOCIAL_TELEGRAM_URL` | 自己的 HTTPS 社交链接；留空不显示。 |
| `EXPO_PUBLIC_SUPPORT_BOT_USERNAME` | 不带 `@` 的 Telegram 客服用户名；留空或格式非法时不显示客服悬浮入口。 |
| `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL` | 运营方真实、有效的 HTTPS 隐私政策与条款页面。禁止用不属于自己的文档假装获得授权。 |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID`、`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`、`EXPO_PUBLIC_APPLE_CLIENT_ID`、`EXPO_PUBLIC_TELEGRAM_BOT_ID`、`EXPO_PUBLIC_TELEGRAM_BOT_USERNAME` | 对应可选登录方式的公开客户端标识；需使用自己的账号、后端配置及平台回调。 |
| `EXPO_PUBLIC_GA_MEASUREMENT_ID`、`EXPO_PUBLIC_YANDEX_METRIKA_ID`、`EXPO_PUBLIC_TURNSTILE_SITE_KEY` | 可选的公开追踪或防护标识，留空不开启相应功能。必须自行处理告知及隐私合规。 |

### 缺省安全限制

为避免替自建者错误展示原产品的政策，**未配置两条有效 HTTPS 法律文档时**：

- 登录与注册同意复选框不可勾选，因此依赖该同意状态的邮箱登录、注册及第三方登录不能继续。
- 订阅和充值相关结算入口被阻止；AI 数据同意弹窗不提供确认按钮。
- 需要由自建者真实准备和配置文档，并自行验证其可访问性和法律适用性；仅把示例域名或空白页面填入并不构成合法授权。URL 格式校验不能证明页面内容有效。

默认静态 `robots.txt` 禁止爬虫，避免开发实例意外被索引；正式发布时应评估环境并重新生成 SEO 资源。`app.json` 中应用包名、iOS Google URL scheme 等为占位，真正编译原生客户端前必须配置自己的应用标识、OAuth、签名及平台能力。项目不带原 `eas.json`、私有部署脚本或账户配置。

EAS 项目在本仓库子目录时，从客户端目录运行命令，但 Git 工作流读取**仓库根目录**的 `.easignore`，不是这里的同名文件；独立复制客户端目录后才适用客户端自身的忽略文件。两者均默认排除本地环境文件和凭据；云构建所需配置应通过自己管理的 EAS 环境变量或文件变量提供，不要将密钥放入 `EXPO_PUBLIC_*`。在真实构建前使用 `eas build:inspect --platform android --stage archive --output <不存在的检查目录>` 检查实际上传内容，并人工核查。当前尚未进行 EAS 打包或真机验证。

## 构建和测试

内部图片、视频生成脚本未随此候选分发，相关失效 npm 命令已移除。下述 Web 构建及检查命令不依赖这些脚本。

```bash
npx tsc --noEmit --pretty false
node scripts/test-open-source-config.cjs
node --experimental-strip-types --test src/utils/__tests__/freeChatSoftUpsell.test.ts
# 完整 Web 构建：使用自己可控的地址；命令会重写 public 中 SEO 文件。
EXPO_PUBLIC_APP_SITE_URL=https://YOUR_APP_DOMAIN \
EXPO_PUBLIC_MARKETING_SITE_URL=https://YOUR_SITE_DOMAIN \
npm run build:web
```

测试地址仅用于隔离构建，不得被描述成真实政策页面或生产部署。构建工具 `tsx` 已作为开发依赖固定在 npm 锁文件中；首次安装仍需要访问 npm 注册源。请使用 `npm ci`，不要混用其他包管理器。生成的 `dist/` 是静态构建输出，不应直接代表安全可发布；其 JS、配置与素材仍须检查。

## 语音与第三方连接

普通页面未启动语音通话时不会挂载 ElevenLabs 原生 WebView。用户主动进入原生 ElevenLabs 语音通话后，该 WebView 会从公共 CDN `unpkg.com` 加载固定版本 `@elevenlabs/client` 脚本，设备网络和第三方服务必须可用；浏览器端在开启相应通话时动态加载同一 SDK。语音、会话配置及必要的网络元数据会由对应服务处理，部署者应确认供应商、隐私告知、用户同意及地区适用性；浏览器或系统可能要求麦克风权限。这个设计不保证离线可用；iOS/Android 真机、权限和语音链路尚未验证。

Telegram 登录、Apple/Google 登录、Turnstile 和可选统计也依赖各自第三方服务；未配置相关标识不等于所有外链脚本都不加载，请根据需求和隐私合规审查。

## 二次开发与边界

更改页面、组件、状态、接口客户端后，应检查类型和相关测试，并对目标 Web / iOS / Android 平台单独验收。对后端只能使用实际公开的配置和 API/WS 契约；并不提供后端源码或未经证实的插件机制。管理后台只分发经审核的静态文件，不提供管理端源码。
