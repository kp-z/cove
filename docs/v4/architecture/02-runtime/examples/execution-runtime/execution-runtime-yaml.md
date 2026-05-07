# 执行运行时配置 (execution-runtime.yaml)

**文件路径**: `runtime/agent_daemon/{agent_id}/execution-runtime.yaml`

**说明**: 执行运行时配置文件，定义单次执行的超时、资源限制、工具权限、日志配置。每个 Agent 实例有独立的执行运行时配置。

---

## 与 Entity 层的对应关系

| Runtime 层 | Entity 层 | 说明 |
|---|---|---|
| `execution.tools_allowed[]` | `agents/{id}/config/tools.yaml` | 工具权限对应 Entity 层定义的工具配置 |
| `execution.timeout_seconds` | `agents/{id}/runtime.yaml` 中的 `max_execution_time` | 执行超时配置 |
| `execution.resource_limits` | `agents/{id}/runtime.yaml` 中的 `resource_limits` | 资源限制配置 |

---

## 字段说明

### 执行配置
- `execution.timeout_seconds`: 单次执行超时时间（秒）
- `execution.max_turns`: 最大对话轮数
- `execution.auto_approve_edits`: 是否自动批准编辑操作
- `execution.thinking_mode`: 思考模式（adaptive/always/never）
- `execution.thinking_effort`: 思考强度（low/medium/high）

### 工具权限
- `execution.tools_allowed[]`: 允许的工具列表
  - `tool_name`: 工具名称（Read/Write/Edit/Bash/Agent/Grep/Glob/LSP）
  - `permissions`: 权限配置
    - `read_paths[]`: 允许读取的路径（Read 工具）
    - `write_paths[]`: 允许写入的路径（Write/Edit 工具）
    - `allowed_commands[]`: 允许的命令（Bash 工具）
    - `max_file_size_mb`: 最大文件大小（Read/Write 工具）

### 资源限制
- `execution.resource_limits.max_memory_mb`: 最大内存使用（MB）
- `execution.resource_limits.max_cpu_percent`: 最大 CPU 使用率（%）
- `execution.resource_limits.max_disk_mb`: 最大磁盘使用（MB）
- `execution.resource_limits.max_network_requests`: 最大网络请求数

### 日志配置
- `execution.logging.enabled`: 是否启用执行日志
- `execution.logging.log_file`: 日志文件路径（相对于 Agent 目录）
- `execution.logging.log_level`: 日志级别（debug/info/warning/error）
- `execution.logging.log_tool_calls`: 是否记录工具调用
- `execution.logging.log_tool_results`: 是否记录工具结果
- `execution.logging.log_messages`: 是否记录消息内容

### 错误处理
- `execution.error_handling.retry_on_tool_error`: 工具错误时是否重试
- `execution.error_handling.max_retries`: 最大重试次数
- `execution.error_handling.retry_delay_seconds`: 重试延迟（秒）
- `execution.error_handling.fail_fast`: 遇到错误是否立即失败

---

## 完整示例

见 `execution-runtime.yaml` 文件。

---

## 参考

- Entity 层工具配置: `agents/{agent_id}/config/tools.yaml`
- Entity 层运行时配置: `agents/{agent_id}/runtime.yaml`
- Runtime 层文档: `docs/v4/architecture/02-runtime-layer.md` Section 2.4
