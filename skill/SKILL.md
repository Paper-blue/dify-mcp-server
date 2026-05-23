---
name: dify-workflow
description: |
  触发条件：(1) 需要在 Dify 上创建、编辑、调试或发布 workflow，(2) 需要通过 MCP 工具操作 Dify 实例，(3) 需要导入/导出 DSL，(4) 需要配置 app 的 tag、API key、site config，(5) 需要管理 workspace 成员或模型提供商，(6) 任何涉及 Dify Console 的操作。

  覆盖 Dify workflow 全生命周期：设计 → 编排 → 单节点调试 → 全流程测试 → 发布 → 版本管理。通过 Paper-blue/dify-mcp-server MCP 工具直接操作 Dify Console API。
---

# Dify Workflow 开发编排 Skill

## MCP 工具连接

本 skill 通过 `dify` MCP server 操作 Dify，已在 `~/.claude/settings.json` 配置：

```json
"dify": {
  "command": "node",
  "args": ["/Users/paperblue/Projects/Lab/dify-mcp-server/dist/index.js"],
  "env": {
    "DIFY_BASE_URL": "https://dify-labs.zeabur.app",
    "DIFY_EMAIL": "...",
    "DIFY_PASSWORD": "..."
  }
}
```

**MCP server 仓库**：`Paper-blue/dify-mcp-server`（fork 自 overpod/dify-mcp-server，扩展了 ~73 个工具）

---

## 全工具速查表

### App 管理
| 工具 | 用途 |
|------|------|
| `list_apps` | 列出 app，支持 mode/name/tag_ids 过滤 |
| `create_app` | 创建 app（workflow/chat/agent-chat/advanced-chat/completion）|
| `get_app` | 获取 app 详情 |
| `update_app` | 更新名称、描述、icon |
| `delete_app` | 删除 app |
| `copy_app` | 复制 app |

### DSL 导入导出
| 工具 | 用途 |
|------|------|
| `import_dsl` | 从 YAML DSL 导入 app（自动处理 pending 状态）|
| `confirm_import` | 手动确认 pending 状态的导入 |
| `export_app` | 导出 app 为 YAML DSL |
| `update_app_dsl` | 用新 DSL 替换 app（实为重新导入）|

### Workflow 编排
| 工具 | 用途 |
|------|------|
| `get_workflow` | 获取当前 draft workflow（含 graph/features/hash）|
| `update_workflow` | 更新 draft workflow（需传 graph/features/hash）|
| `update_workflow_env_vars` | 更新环境变量和对话变量 |
| `publish_workflow` | 发布 draft 为正式版本 |

### 调试工具
| 工具 | 用途 |
|------|------|
| `run_draft_workflow` | 运行 draft workflow（返回 SSE 流）|
| `run_draft_node` | 单节点调试（返回 inputs/outputs/status）|
| `run_iteration_node` | 调试 Iteration 节点 |
| `run_loop_node` | 调试 Loop 节点 |
| `get_node_last_run` | 获取节点最后一次运行结果 |
| `stop_workflow_task` | 停止运行中的 workflow task |

### 运行记录
| 工具 | 用途 |
|------|------|
| `list_workflow_runs` | 列出历史运行记录 |
| `get_workflow_run` | 获取单次运行详情 |
| `get_workflow_run_logs` | 获取运行日志（含每个节点）|
| `get_workflow_run_count` | 统计运行次数（支持 status/time_range 过滤）|

### 版本管理
| 工具 | 用途 |
|------|------|
| `list_workflow_versions` | 列出已发布版本 |
| `restore_workflow_version` | 恢复历史版本到 draft |
| `label_workflow_version` | 给版本打标签（name + comment）|

### 定时触发
| 工具 | 用途 |
|------|------|
| `list_triggers` | 列出所有定时触发器 |
| `set_trigger_enabled` | 启用/禁用触发器 |

### API & 访问控制
| 工具 | 用途 |
|------|------|
| `enable_api` | 启用 API 访问 |
| `enable_site` | 启用 Web UI |
| `get_api_keys` | 获取 API key 列表 |
| `create_api_key` | 创建 API key |
| `delete_api_key` | 删除 API key |
| `get_site_config` | 获取 site 配置 |
| `update_site_config` | 更新 site 配置 |
| `get_app_access_mode` | 获取 app 访问模式 |

### Tags 分组
| 工具 | 用途 |
|------|------|
| `list_tags` | 列出标签（app/knowledge）|
| `create_tag` | 创建标签 |
| `delete_tag` | 删除标签 |
| `bind_tag` | 绑定标签到 app/knowledge |
| `unbind_tag` | 解绑标签 |
| `batch_bind_tags` | 批量绑定多个标签到多个 app |

### Workspace 权限
| 工具 | 用途 |
|------|------|
| `list_workspace_members` | 列出成员 |
| `invite_member` | 邀请成员（email + role）|
| `update_member_role` | 修改成员角色 |
| `remove_member` | 移除成员 |

### 模型配置
| 工具 | 用途 |
|------|------|
| `list_model_providers` | 列出模型提供商（支持 model_type 过滤）|
| `list_models` | 列出所有可用模型 |
| `list_models_by_type` | 按类型列出模型 |
| `get_default_model` | 获取默认模型 |
| `set_default_model` | 设置默认模型 |
| `configure_model_provider` | 配置模型提供商 credentials |
| `test_model_provider` | 验证 credentials（不保存）|

### 知识库
| 工具 | 用途 |
|------|------|
| `list_datasets` | 列出知识库 |
| `create_dataset` | 创建知识库 |
| `delete_dataset` | 删除知识库 |
| `list_documents` | 列出文档 |
| `create_document_by_text` | 上传文本文档 |
| `delete_document` | 删除文档 |
| `list_segments` | 列出分段 |
| `create_segment` | 创建分段 |
| `update_segment` | 更新分段 |
| `delete_segment` | 删除分段 |

---

## 典型工作流程

### 1. 从零创建并调试 Workflow

```
1. list_apps → 确认环境
2. create_app(mode=workflow) → 获取 appId
3. get_workflow → 获取初始 draft（hash 用于乐观锁）
4. update_workflow → 修改 graph/features
5. run_draft_workflow → 测试完整流程（看 SSE 输出）
6. run_draft_node(node_id=...) → 单节点调试
7. publish_workflow(marked_name='v1.0') → 发布
8. list_workflow_versions → 确认版本
```

### 2. 导入已有 DSL 并发布

```
1. import_dsl(yaml_content=...) → 获取 appId
   - 若 status=pending → confirm_import(import_id)
2. get_workflow → 获取 hash
3. update_workflow_env_vars → 设置密钥/环境变量
4. run_draft_workflow → 验证
5. publish_workflow → 上线
6. enable_api / create_api_key → 获取调用凭证
```

### 3. 版本回滚

```
1. list_workflow_versions(app_id) → 找目标版本的 workflow_id
2. restore_workflow_version(app_id, workflow_id) → 还原到 draft
3. run_draft_workflow → 验证
4. publish_workflow → 重新发布
```

### 4. 批量分组管理

```
1. create_tag(name='production', tag_type='app')
2. list_apps(mode='workflow') → 获取所有 workflow app ID
3. batch_bind_tags(tag_ids=[...], target_ids=[...], type='app')
4. list_apps(tag_ids='tag-id') → 验证分组结果
```

### 5. 单节点调试流程

```
1. get_workflow → 找到目标节点的 node_id（在 graph.nodes[].id）
2. run_draft_node(app_id, node_id, inputs={...}) → 获取该节点 outputs
3. get_node_last_run(app_id, node_id) → 查看上次结果
   - Iteration 节点：用 run_iteration_node
   - Loop 节点：用 run_loop_node
```

---

## 关键注意事项

### Hash 乐观锁
`get_workflow` 返回的 `hash` 必须在 `update_workflow` / `update_workflow_env_vars` 时带上，否则报冲突错误。每次修改后 hash 会更新，需重新 get。

### DSL 版本兼容
import 时 Dify 会自动升级旧版 DSL（`completed-with-warnings` 状态正常，不是错误）。当前实例版本对应 DSL schema `0.5.0`。

### 空 App 无法 export
新建的空 workflow app 没有初始化 draft，`export_app` 和 `get_workflow_run_count` 会报错。需要先通过 `import_dsl` 或手动在 UI 初始化 workflow。

### 登录认证
client 自动处理 cookie 认证，支持明文/base64 密码自动切换（兼容不同 Dify 版本）。401 时自动重试登录。

### update_app 必填字段
Dify PUT /apps/{id} 要求 `use_icon_as_answer_icon` 和 `icon_type` 字段，client 已自动补全（先 getApp 再 merge）。

---

## DSL 编排实战避坑（重要）

> 以下是通过 import_dsl 程序化构建 workflow 时踩过的坑，全部已验证。手搓 DSL 时必看。

### ⚠️ 节点 id 绝对不能含连字符
变量引用 `{{#node_id.field#}}` 中，如果 `node_id` 含连字符（如 `code-parse`），Dify 运行时**不会解析该变量**，会把字面 `{{#code-parse.news_text#}}` 当普通文本发给 LLM/下游。
- ❌ `code-parse`、`http-get-used` → 变量注入失效
- ✅ `code_parse`、`parse_news`、`mycode` → 正常解析
- **规则**：节点 id 一律用下划线或纯字母数字。

### ⚠️ 变量引用语法是 `{{#node_id.field#}}`
不是 `{{var}}`（那是 chatflow 用户输入变量）。节点间传值必须用 `{{#node_id.output_field#}}`，且节点 id 无连字符（见上）。已验证 start 输入变量、code 输出、http body 都用这个语法。

### ⚠️ update_workflow（draft）必须带 env/conversation 变量
POST `/apps/{id}/workflows/draft` 这个 Dify 版本强制要求 body 含 `environment_variables` 和 `conversation_variables`（可为空数组），否则 400 "Missing required parameter"。client 的 `updateWorkflowDraft` 已默认补空数组。

### ⚠️ 程序化注入 Code 节点：用 YAML 块标量或 chr(10)
Python code 含正则（如 `\[CDATA\[`）和换行时：
- **YAML 导入**：必须用块标量 `code: |-`（缩进保留），**不要**用双引号字符串 `code: "import re\n..."`——双引号里 `\[` 是非法 YAML 转义符，且 `\n` 易出错。
- **通过 client API 注入**（updateWorkflowDraft 改 graph）：字符串拼接换行用 `chr(10).join()` 而非 `'\n'.join()`，避免 JS→JSON→Python 多层转义把 `\n` 变成真换行破坏 Python 字符串。

### ⚠️ HTTP 节点抓 RSS 需加 User-Agent
量子位/InfoQ/开源中国/虎嗅等源不带 UA 会返回 403/451/000。在 HTTP 节点 `headers` 加 `User-Agent:Mozilla/5.0 ...`。已验证加 UA 后 18 个 RSS 源全部 200。
- 虎嗅 RSS URL 已变更：用 `https://www.huxiu.com/rss/`（旧的 `/rss/0.xml` 失效）。

### ⚠️ 外部 KV 去重（Upstash Redis REST）
Dify 无持久化存储，跨次运行去重需外挂 KV。用 Upstash Redis REST API：
- **bearer auth**：HTTP 节点 authorization 用 `{type:'api-key', config:{type:'bearer', api_key:'<token不带Bearer前缀>', header:'Authorization'}}`。**config.api_key 里不要再写 `Bearer `**，否则变成 `Bearer Bearer xxx` 报 WRONGPASS。
- **批量命令**：POST `/pipeline`，body 为 raw-text `[["EXISTS","topic:uid1"],["SET","topic:uid2","1","EX","2592000"]]`，返回 `[{"result":0},{"result":"OK"}]`。
- **去重模式**：解析后 Code 构造 EXISTS pipeline → HTTP 查 → Code 过滤已存在的 → LLM 选 → Code 构造 SET pipeline（带 `EX` 过期秒数）→ HTTP 写。

### ⚠️ 模型提供商：插件化 provider 配置
新版 Dify 模型走插件。配置 OpenRouter 等：
1. 从 marketplace 查标识：`POST https://marketplace.dify.ai/api/v1/plugins/search/advanced` body `{query:"openrouter",type:"plugin"}`，取 `latest_package_identifier`。
2. 安装：`installPluginFromMarketplace([identifier])`（异步，等几秒后 `listPlugins` 确认）。
3. 配置 credentials：`configureModelProvider('langgenius/openrouter/openrouter', {api_key:'sk-or-...'})`——**body 必须是 `{credentials:{...}}` 包装**（client 已修正）。provider 名格式 `langgenius/openrouter/openrouter`（org/plugin/provider）。
4. LLM 节点 model 写 `{provider:'langgenius/openrouter/openrouter', name:'deepseek/deepseek-v4-pro', mode:'chat', completion_params:{...}}`。

### ⚠️ 实例网络抖动需重试
Zeabur 托管实例偶发 connect timeout（UND_ERR_CONNECT_TIMEOUT）和间歇 401。client 的 `rawRequest` 已加网络层重试（fetch failed/timeout/5xx 自动重试 3 次）。脚本里调用仍建议外层 retry 包装登录。

### LLM 输出清洗
DeepSeek 等模型可能输出 `<think>...</think>` 块和 markdown 代码块。后续 Code 节点解析 JSON 前要：去 think 块 `re.sub(r'<think>.*?</think>','',s,flags=re.DOTALL)`、去 ``` 标记、用非贪婪正则 `\[\s*\{.*\}\s*\]` 提取 JSON 数组。建议在 workflow 末尾加一个 finalize Code 节点统一清洗所有 LLM 输出，让本地拿到干净结果。

### ⚠️ HTTP 节点 params/headers 必须真换行（否则 422）
HTTP 节点的 `params` 和 `headers` 字段是**多行字符串，每行一个键值对 `key:value`，用真换行分隔**。
- ❌ 用 `'q:xxx\\ncount:5'`（字面 `\n`）→ Dify 把整串当一个畸形 key → 422 错误。
- ✅ YAML 里用块标量 `params: |-` 缩进多行，每行一个 `key:value`。
- 单行 header（如只有一个 UA）用单引号字符串没问题；多行必须块标量。

### Brave 图片搜索（全网真实配图）
全网搜图比 Pexels/Unsplash 库存图相关性强。HTTP GET `https://api.search.brave.com/res/v1/images/search`：
- headers（块标量）：`Accept:application/json` + `X-Subscription-Token:<BSA...key>`
- params（块标量）：`q:{{#上游.关键词#}}` + `count:5` + `safesearch:strict`
- 返回 `results[].properties.url`（原图）或 `results[].thumbnail.src`（缩略图），`results[].source` 是来源域名。
- **版权处理**：Code 节点按 source 过滤——优先 reuters/wikipedia/apnews/官方/edu/gov，避开 pinterest/reddit/quora。全网图仍有版权风险，发布前需人工把关。
- **配图链路模式**：写完文章 → LLM 提 N 个英文关键词(JSON数组) → Code 拆成 q1..qN → N 个 Brave HTTP 节点串接（各取一个 query）→ Code 挑可用源图 URL。

### ⚠️ updateWorkflowDraft 会清空环境变量
用 client 的 `updateWorkflowDraft(appId, graph, features, hash)` 改 graph 时，若不显式传 `environmentVariables`，会用默认空数组**覆盖掉原有环境变量**（如 narrative_dna 会丢，导致 LLM 节点报 `Variable #env.xxx# not found`）。改 graph 前先 `getWorkflowDraft` 读出 `environment_variables` 再原样传回。最稳妥：用生成器一次性生成完整 YAML（含 env）重新 import，避免增量 patch。

### ⚠️ SSE 长连接易超时，节点多时改查结果
节点多的 workflow（如写作+多图搜索）整体运行耗时长，`run_draft_workflow` 的 SSE 长连接在本地易被 ETIMEDOUT/terminated 掐断。应对：
- SSE 读取加 try/catch，断了也解析已收到的事件（`workflow_finished` 通常在断连前已到）。
- 或发布后用公开 API blocking 模式（但同样可能超 Dify 网关超时）。
- 单节点调试 `run_draft_node` 的变量注入不可靠（手动传 `{node.field: val}` 常 422），优先整体跑看 `node_finished` 事件。

### Code 节点输出类型严格校验
Code 节点 `outputs` 声明的类型必须和 return 的值类型严格一致。如声明 `audit_passed: {type: string}` 但 return `bool` → 报 `Output X must be a string, got bool`。bool 要转成 `'true'/'false'` 字符串，数组/对象转 JSON 字符串。

---

## Dify Console API 端点参考

所有请求走 `/console/api/` 前缀，cookie 认证。

```
POST   /login                                    # 登录
GET    /apps                                     # 列出 app
POST   /apps                                     # 创建 app
PUT    /apps/{id}                                # 更新 app
DELETE /apps/{id}                                # 删除 app
POST   /apps/imports                             # 导入 DSL
POST   /apps/imports/{id}/confirm                # 确认导入
GET    /apps/{id}/export                         # 导出 DSL
GET    /apps/{id}/workflows/draft                # 获取 draft
POST   /apps/{id}/workflows/draft                # 更新 draft
POST   /apps/{id}/workflows/publish              # 发布
GET    /apps/{id}/workflows/draft/run            # 运行 draft（SSE）
POST   /apps/{id}/workflows/draft/nodes/{nid}/run  # 单节点运行
GET    /apps/{id}/workflow-runs                  # 运行记录
GET    /apps/{id}/workflow-runs/count            # 统计
GET    /apps/{id}/api-keys                       # API key 列表
POST   /apps/{id}/api-keys                       # 创建 key
DELETE /apps/{id}/api-keys/{kid}                 # 删除 key
GET    /apps/{id}/site                           # site 配置
POST   /apps/{id}/api-enable                     # 启用 API
POST   /apps/{id}/site-enable                    # 启用 site
GET    /workspaces/current/members               # 成员列表
POST   /workspaces/current/members/invite-email  # 邀请成员
PUT    /workspaces/current/members/{id}          # 更新角色
DELETE /workspaces/current/members/{id}          # 移除成员
GET    /workspaces/current/model-providers       # 模型提供商
POST   /workspaces/current/model-providers/{p}/credentials  # 配置
POST   /workspaces/current/model-providers/{p}/credentials/validate  # 验证
```

---

## 调试技巧

**看 SSE 输出结构**：`run_draft_workflow` 返回的是 SSE 事件流，关键事件：
- `workflow_started` → 开始运行，含 workflow_run_id
- `node_started` / `node_finished` → 节点执行情况，含 inputs/outputs
- `workflow_finished` → 完成，含 total_tokens/elapsed_time

**用 get_workflow_run_logs 做事后分析**：发布后的正式运行可用 `list_workflow_runs` + `get_workflow_run_logs` 查看每个节点的详细日志。

**环境变量 vs 对话变量**：
- `environment_variables`：全局密钥，secret 类型只写不读
- `conversation_variables`：每轮对话保持的状态变量

**节点 ID 怎么找**：`get_workflow` 返回的 `graph.nodes[].id` 就是 `run_draft_node` 需要的 `node_id`。
