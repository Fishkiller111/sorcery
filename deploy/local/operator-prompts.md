# 自建版提示词配置（发行候选）

> 此说明对应尚未发布的空数据库发行候选。该版本**不随镜像提供原产品的提示词或邮件模板**；尚未完成最终镜像、真实 AI 服务和生产部署验收。

用户自行准备具有使用和再分发权的模板目录，以只读方式同时挂载到 API 与 Worker，并让两个进程设置相同的 `SOULTHREAD_PROMPT_DIR`，例如 `/app/prompts`。不要把 API Key 或其他秘密写进提示词文件，也不要将未获权的模板放入公开仓库。

目录结构：每个要启用的模块各有两个 UTF-8 文件：

```text
prompts/
  chat/
    system.tmpl
    user.tmpl
  free_chat/
    system.tmpl
    user.tmpl
  # 其余所需模块同理
```

当前可配置的模块名称是 `chat`、`welcome`、`event`、`proactive`、`free_chat`、`free_welcome`、`free_event`、`free_gift`、`free_proactive`、`free_inspiration_reply`、`voice_call`、`summary`、`fact_extract`、`state`、`story_chat`、`story_narrator`、`world_chat`、`reengagement_email`、`reengagement_telegram`。发行候选中部分主动运营任务被禁用，提供模板不会自动启用这些任务。

下面是**自写的最小示例**，仅演示模板语法和文件结构，不代表已验证聊天质量或完整记忆、剧情、语音功能：

```bash
mkdir -p prompts/chat prompts/free_chat
cat > prompts/chat/system.tmpl <<'TEMPLATE'
You are {{.RoleName}}.
Character details: {{.RoleAttributes}}
Conversation context: {{.ChatHistory}}
TEMPLATE
cat > prompts/chat/user.tmpl <<'TEMPLATE'
{{.UserInput}}
TEMPLATE
cp prompts/chat/system.tmpl prompts/free_chat/system.tmpl
cp prompts/chat/user.tmpl prompts/free_chat/user.tmpl
```

实际部署时，在自己的 Compose 文件中为 API 和 Worker 分别增加只读挂载并设置变量；以下是片段，**不是完整部署文件**：

```yaml
environment:
  SOULTHREAD_PROMPT_DIR: /app/prompts
volumes:
  - ./prompts:/app/prompts:ro
```

模板使用 Go `text/template` 语法。示例字段在本轮合成模板测试中验证可渲染，其他字段与模块应按后续发布的接口文档及自建业务逐项测试。服务启动时读取模板，修改后需重启相应 API／Worker。若目录未设置、某模块的任一文件不存在、为空或无法正确解析，该模块返回模板未配置错误，不会回退到原产品模板。邮件自动运营在发行候选中被关闭，其 HTML 不随镜像提供。

结构空库只初始化表、索引、约束和必要扩展，不创建管理员、角色、剧情、模型供应商或资源；管理员及业务数据须由部署者自行配置。模板可加载不代表 AI 服务、WebSocket、客户端登录或实际聊天已完成端到端验收。
