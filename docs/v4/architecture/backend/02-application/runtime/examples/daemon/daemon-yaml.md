# AgentDaemon 运行时状态配置 (daemon.yaml)

**文件路径**: `runtime/agent_daemon/{agent_id}/daemon.yaml`

**说明**: AgentDaemon 运行时状态文件，记录守护进程的实时状态、组件状态、资源使用情况。此文件记录**运行时动态状态**，与 Entity 层的 `agents/{agent_id}/runtime.yaml`（静态配置）不同。

---

## 与 Entity 层的对应关系

| Runtime 层 | Entity 层 | 说明 |
|---|---|---|
| `daemon.yaml` | `agents/{id}/runtime.yaml` | daemon.yaml 是运行时动态状态，runtime.yaml 是静态配置 |
| `trigger_manager.triggers[]` | `config/triggers.yaml[]` | 字段名和结构保持一致 |
| `plugin_manager.plugins[]` | `config/plugins.yaml[]` | 字段名和结构保持一致 |

---

## 字段说明

### 守护进程信息
- `daemon_id`: 守护进程唯一标识
- `agent_id`: 关联的 Agent ID（对应 Entity 层 `agents/{agent_id}/`）
- `pid`: 操作系统进程 ID
- `status`: 运行状态（starting/running/sleeping/stopping/stopped）
- `started_at`: 启动时间（ISO 8601 格式）
- `last_heartbeat`: 最后心跳时间

### 核心组件状态
- `heartbeat_thread`: 心跳线程状态
- `message_inbox_thread`: 消息接收线程状态
- `message_outbox_thread`: 消息发送线程状态
- `conversation_manager_thread`: 对话管理线程状态
- `api_call_thread`: API 调用线程状态

### Trigger 管理器
- `trigger_manager.triggers[]`: Trigger 运行时状态列表
  - `trigger_id`: Trigger 唯一标识
  - `name`: Trigger 名称（kebab-case，与 Entity 层一致）
  - `display_name`: 人类可读名称
  - `trigger_type`: Trigger 类型（schedule/event/webhook/manual，与 Entity 层字段名一致）
  - `schedule.cron`: Cron 表达式（与 Entity 层结构一致）
  - `next_run`: 下次运行时间
  - `last_triggered`: 上次触发时间
  - `execution_count`: 执行次数

### Plugin 管理器
- `plugin_manager.plugins[]`: Plugin 运行时状态列表
  - `plugin_id`: Plugin 唯一标识
  - `name`: Plugin 名称（kebab-case，与 Entity 层一致）
  - `display_name`: 人类可读名称
  - `features[]`: 功能列表（与 Entity 层结构一致，非 capabilities）
    - `feature_id`: 功能唯一标识
    - `name`: 功能名称
    - `enabled`: 是否启用
    - `permissions[]`: 权限列表
  - `status`: 运行状态（active/inactive）
  - `loaded_at`: 加载时间
  - `health_check`: 健康检查状态

### 资源使用
- `resource_usage.cpu_percent`: CPU 使用率
- `resource_usage.memory_mb`: 内存使用（MB）
- `resource_usage.disk_io_mb`: 磁盘 IO（MB）
- `resource_usage.network_io_mb`: 网络 IO（MB）

### 统计信息
- `statistics.total_messages_received`: 接收消息总数
- `statistics.total_messages_sent`: 发送消息总数
- `statistics.total_executions`: 执行总数
- `statistics.total_errors`: 错误总数
- `statistics.uptime_seconds`: 运行时长（秒）

---

## 命名规范（与 Entity 层对齐）

1. **Trigger 字段**:
   - ✅ 使用 `trigger_type`（非 `type`）
   - ✅ 使用 `schedule.cron`（非 flat `schedule`）
   - ✅ `name` 使用 kebab-case，`display_name` 使用人类可读名称

2. **Plugin 字段**:
   - ✅ 使用 `features[]`（非 `capabilities[]`）
   - ✅ `name` 使用 kebab-case，`display_name` 使用人类可读名称
   - ✅ `features[].permissions[]` 结构与 Entity 层一致

3. **时间字段**:
   - ✅ 使用 ISO 8601 格式（如 `"2026-05-04T10:00:00+08:00"`）

---

## 完整示例

见 `daemon.yaml` 文件。

---

## 参考

- Entity 层配置: `agents/{agent_id}/runtime.yaml`
- Entity 层 Triggers: `agents/{agent_id}/config/triggers.yaml`
- Entity 层 Plugins: `agents/{agent_id}/config/plugins.yaml`
- Runtime 层文档: `docs/v4/architecture/02-runtime-layer.md` Section 2.1
