# 执行日志 (execution.jsonl)

**文件路径**: `runtime/agent_daemon/{agent_id}/executions/{execution_id}/execution.jsonl`

**说明**: 执行日志文件，以 JSONL 格式存储（每行一个 JSON 对象），记录执行过程中的每个操作、工具调用和状态变更。

---

## 与 Entity 层的对应关系

| Runtime 层 | Entity 层 | 说明 |
|---|---|---|
| `execution.jsonl` | `agents/{id}/memory/errors.jsonl` | 都使用 JSONL 格式，每行一个 JSON 对象 |
| `log_type` 字段 | `error_type` 字段 | 类型字段命名一致 |

---

## 字段说明

每行 JSON 对象包含以下字段：

### 通用字段
- `timestamp`: 日志时间（ISO 8601 格式）
- `log_id`: 日志唯一标识
- `log_type`: 日志类型（tool_call/tool_result/message/state_change/error）
- `execution_id`: 关联的执行 ID
- `agent_id`: 执行的 Agent ID
- `content`: 日志内容（根据 log_type 不同而不同）
- `duration_ms`: 操作耗时（毫秒）

### log_type: tool_call
工具调用日志，记录工具调用的开始。

`content` 字段包含：
- `tool_name`: 工具名称（Read/Write/Edit/Bash/Agent/Grep/Glob/LSP）
- `call_id`: 调用唯一标识
- `parameters`: 工具参数（JSON 对象）

### log_type: tool_result
工具结果日志，记录工具调用的结果。

`content` 字段包含：
- `tool_name`: 工具名称
- `call_id`: 调用唯一标识（与 tool_call 对应）
- `success`: 是否成功（boolean）
- `result_summary`: 结果摘要
- 其他工具特定字段（如 `lines_read`, `matches_count`, `file_path`）

### log_type: message
消息日志，记录用户消息和 Agent 回复。

`content` 字段包含：
- `role`: 角色（user/assistant）
- `text`: 消息文本
- `channel_id`: 频道 ID
- `message_id`: 消息 ID

`token_usage` 字段（仅 assistant 消息）：
- `input_tokens`: 输入 token 数
- `output_tokens`: 输出 token 数
- `thinking_tokens`: 思考 token 数

### log_type: state_change
状态变更日志，记录执行状态的变化。

`content` 字段包含：
- `from_status`: 原状态（pending/running/completed/failed/cancelled）
- `to_status`: 新状态
- `trigger`: 触发原因（task_assigned/step_completed/error_occurred）
- `task_id`: 关联的任务 ID（可选）

### log_type: error
错误日志，记录执行过程中的错误。

`content` 字段包含：
- `error_type`: 错误类型（ToolError/APIError/ValidationError/PermissionError/TimeoutError）
- `error_message`: 错误消息
- `tool_name`: 触发错误的工具（可选）
- `stack_trace`: 堆栈跟踪（可选）

---

## JSONL 格式说明

- **每行一个 JSON 对象**：不是一个 JSON 数组，而是每行独立的 JSON
- **无需逗号分隔**：每行之间不需要逗号
- **易于追加**：可以直接追加新行，无需修改整个文件
- **易于流式读取**：可以逐行读取，无需加载整个文件到内存

---

## 完整示例

见 `execution.jsonl` 文件。

---

## 参考

- Entity 层错误日志: `agents/{agent_id}/memory/errors.jsonl`
- Runtime 层文档: `docs/v4/architecture/02-runtime-layer.md` Section 2.4
