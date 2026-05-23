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
