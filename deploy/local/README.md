# 后端镜像本机自建（空数据库预览）

> **发行状态：本方案为待验收预览，镜像尚未发布；在镜像真正公开并核验可拉取之前，不要把示例地址当作可用下载。** 后端源码不开放，仅使用发行镜像。以下只面向独立测试环境，不是生产安全方案。

## 默认状态

初始化程序只建立 PostgreSQL 表、索引、约束和必要扩展，不创建管理员、角色、剧情、模型供应商或其他业务数据。原产品媒体及 38 份提示词模板文件、1 份邮件 HTML 不随此版本提供；运行代码仍可能包含内置业务指令与策略。部署者需要自行创建管理员、业务内容、AI／邮件等服务配置，以及有权使用的提示词；因此刚启动时**不能直接聊天，也不会自动生成角色**。

空库没有预置套餐记录。未配置 `free` 套餐时，程序在内存中使用临时的免费权限：允许创建和发布角色、每日 10 点及每月 200 点的聊天额度、最多 1 个世界；默认不授予付费剧情、成人、语音、照片或官方角色权限。每条消息的实际消耗按配置计算，不能把点数直接等同于条数。该回退不写数据库或缓存；自行建立真实 `free` 套餐后以实际配置为准，已存在的真实套餐缓存仍受其失效机制或 TTL 约束。数据库错误不会被当成套餐缺失处理。

本机需 Docker Desktop／Docker Engine 与 Compose、Python 3。数据库使用 PostgreSQL 16 + pgvector（含 `vector`、`pg_trgm` 扩展），Redis 存储队列；数据库、Redis 和静态文件分别使用 Docker 命名卷。API 仅映射到宿主 `127.0.0.1:18888`，数据库和 Redis 不映射到宿主端口。Compose 默认 bridge 允许出站，代码可能使用供应商默认端点，**不保证零外联**；按需配置自有服务并控制网络访问。

## 1. 创建配置

在本目录执行：

```sh
python3 setup.py
```

脚本生成随机数据库密码、JWT 密钥和独立 Compose 项目名，写入权限受限的 `.env` 和 `private/`，并从 `config.example.yaml` 创建独立 `config.yaml`；若已存在则拒绝覆盖。`config.yaml` 已被忽略，配置里面的密钥也不得提交。`prompts/` 初始为空。切勿提交、分享或记录 `.env` 和 `private/`；有 Docker 控制权者仍可读取容器环境。

`.env` 默认指定计划中的镜像名 `ghcr.io/fishkiller111/sorcery-backend:0.1.0-preview`，**不表示该镜像已经发布**。发布后按实际版本修改 `SOULTHREAD_IMAGE`，并核对发行 digest。`API_PORT` 可改为本机空闲端口；不要把 `127.0.0.1` 随意改成公网监听。

`config.yaml` 是空白服务配置；根据自己的服务逐项配置 LLM、向量模型、邮件、语音、OAuth 等，绝不使用他人的密钥或地址。某些代码会有供应商地址回退，空配置不是网络安全策略。两个 JWT 密钥与数据库密码自动生成并保存在 `.env`。数据库客户端目前使用 `sslmode=disable`，此示例仅适合单机受控网络，不适合跨不受信任网络连接数据库。

## 2. 首次创建空库并启动

以下 `init` **仅用于一个全新、完全空白的数据库**；不要用于已有库，不要删除已有卷以强行重试。初始化失败可能留下部分结构，请先查明错误并保留数据。

```sh
docker compose --env-file .env up -d --wait db redis
docker compose --env-file .env run --rm init
docker compose --env-file .env up -d api worker
curl http://127.0.0.1:18888/api/v1/health
```

如修改了 `API_PORT`，健康检查端口也要修改。健康检查只证明部分服务运行，不代表聊天、WebSocket、邮件、支付、语音或 AI 服务可用。再次执行初始化应被拒绝；启动或重启 API／Worker 不会自动初始化。

## 3. 自己创建第一个管理员

如果需要管理后台，首先运行下面的交互式程序，输入自己设置的密码（14–72 UTF-8 字节）；密码不会写入命令行或 shell 历史：

```sh
python3 admin-password.py
docker compose --env-file .env run --rm -e SOULTHREAD_ADMIN_EMAIL=you@example.com admin-init
rm -f private/admin_password
```

将 `you@example.com` 换成自己实际使用的管理员邮箱。只允许数据库中没有管理员时运行；已存在管理员时将拒绝创建。若命令失败，确认原因后再删除一次性密码文件；不要提交该文件。为使镜像内非 root 用户能读取，文件本身为只读、宿主上的 `private/` 为 0700；确保目录不被分享或备份到公开位置。

## 4. 自己配置提示词与素材

按 [提示词配置](operator-prompts.md) 创建 `prompts/<模块>/system.tmpl` 和 `user.tmpl`；目录只读挂载到 API 与 Worker。未配置、空白或不合法的模板不会回退到原内容；服务端日志记录配置错误，客户端可能只显示通用生成失败。修改后重启对应服务。模板示例仅供参考，不保证聊天质量。用户须自行配置具有使用权的角色、图片和其他资源。客户端的 `EXPO_PUBLIC_API_HOST` 填 API 根地址（不带 `/api/v1`）；桌面浏览器使用默认配置时应填 `http://localhost:18888`。实体手机的 localhost 指手机自身，而默认 API 仅绑定开发机回环地址；真机需自行设置受控代理或隧道后使用设备可访问的地址。管理端静态包需通过自己的同源代理连接 `/api/v1/`。

### 配置 AI 服务的出网许可

为避免空配置时意外向第三方发送文字或音频，本发行候选对已覆盖的 LLM、语音识别、Embedding、Fish、ElevenLabs 和图片请求要求：在私有 `config.yaml` 配置自己的服务地址、密钥及模型，并在同目录私有 `.env` 中明确允许对应的实际请求地址与模型／操作。两个列表默认均为空；空列表时这些请求被阻止。改完重启 API 和 Worker。示例地址仅为占位，不是可用服务：

```dotenv
SOULTHREAD_ALLOWED_AI_ENDPOINTS=https://llm.example.invalid/v1/chat/completions,https://asr.example.invalid/v1/audio/transcriptions
SOULTHREAD_ALLOWED_AI_MODELS=your-chat-model,your-asr-model
```

两个值都是逗号分隔、区分大小写的精确值，不支持通配符；地址必须与程序实际规范化后的请求地址一致，不要包含账号、密钥或 URL 片段。它们是两个独立集合，**不是端点与模型的一对一绑定**，因此只应加入可信服务。HTTP 重定向被拒绝。API 和 Worker 都从该 `.env` 读取；不要把文件提交、发给他人或写入公开客户端。

常用配置字段：文本模型为 `LLM.ApiKey/Endpoint/Model`，语音识别使用 `OpenRouter.ApiKey/Endpoint/Model`，向量模型为 `Embedding.ApiKey/Endpoint/Model`，Fish 为 `FishAudio.ApiKey/Endpoint`，ElevenLabs 为 `ElevenLabs.ApiKey/Endpoint/DefaultModelId`。Fish HTTP 及 WSS 地址需分别允许，模型名包括 `s2-pro`；ElevenLabs 动态模型需各自允许。声音目录有 `fish-voice-catalog`、`elevenlabs-voice-catalog`、`elevenlabs-agent-signed-url`、`elevenlabs-create-voice` 等操作标记，按需加入模型／操作列表；它们不是模型名称。安全门禁只覆盖已核验路径，不等于所有外联均被阻止；网络、密钥、隐私告知仍由部署者负责。

图片供应商返回 URL 时，还需在私有 `.env` 中设置 `SOULTHREAD_ALLOWED_IMAGE_ORIGINS`，以逗号分隔完整来源，如 `https://images.example.invalid`；只填写自己信任且被授权的图片源。未配置或来源不匹配时 URL 下载被拒绝，且拒绝重定向；URL 和内联图片均有 20 MiB 限制。图片供应商可能在返回被拒绝的 URL 之前已经收费，导致任务失败但费用无法撤回，请先确认服务商的输出方式与来源。生产环境应使用 HTTPS。

此预览版视频生成功能暂时不可用，服务端在发起上游任务或扣积分前拒绝请求。空数据库中聊天配额的管理读取和显式保存已在隔离环境验证；LLM、语音通话和 AI 生图等部分后台设置页面的首次保存仍有已知问题。配置文件是预览方案，尚未完成真实服务联调；不要把后台设置界面的可用性等同于模型服务已经配置。

## 5. 停止、保存和风险

```sh
docker compose --env-file .env stop
docker compose --env-file .env up -d
```

普通停止保留三个命名卷；**不要对有价值的数据运行 `docker compose down -v`**。下面只备份 PostgreSQL（含敏感用户数据，妥善加密保管），不会备份 Redis、静态文件或配置：

```sh
mkdir -p backups
(umask 077; set -C; docker compose --env-file .env exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' > "backups/db-$(date +%Y%m%d-%H%M%S).dump")
```

如命令失败，请检查错误及生成的部分文件；`backups/` 已被 Git 忽略。完整备份还应包含 Redis Stream／队列、静态文件、自己的配置和密钥，且需要验证恢复及一致性；此预览未提供生产备份或跨版本迁移方案。镜像更新前先完成可用备份并核对版本兼容，不要对现有库重跑空库初始化器。

此预览的 Redis 未设置密码，仅适用于本机独立受控网络；其他容器或具有 Docker 控制权的用户可能访问它。生产部署必须另行配置 Redis 身份认证、数据库安全、TLS、受信任反向代理、管理端访问控制、日志脱敏、最小权限和备份演练。当前方案未完成真实 AI、邮件、Telegram、支付、iOS／Android 或生产代理验收。
