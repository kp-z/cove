# 工作流运行时配置 (workflow-runtime.yaml)

**文件路径**: `runtime/workflow_runtime/{workflow_id}/runtime.yaml`

**说明**: WorkflowRuntime 运行时状态文件，记录工作流的执行状态、步骤进度、变量状态、错误信息。

---

## 与 Entity 层的对应关系

| Runtime 层 | Entity 层 | 说明 |
|---|---|---|
| `workflow_id` | `workflows/{id}/` | 对应 Entity 层的 Workflow 实体 |
| `current_step` | `workflows/{id}/config/workflow.yaml` 中的 `steps[]` | 对应工作流步骤定义 |
| `variables` | `workflows/{id}/config/workflow.yaml` 中的 `variables` | 对应工作流变量定义 |

---

## 字段说明

### 运行时信息
- `runtime_id`: 运行时唯一标识
- `workflow_id`: 关联的工作流 ID
- `execution_id`: 当前执行 ID
- `status`: 执行状态（running/paused/completed/failed/cancelled）
- `started_at`: 开始时间（ISO 8601 格式）
- `updated_at`: 更新时间（ISO 8601 格式）
- `completed_at`: 完成时间（ISO 8601 格式，如果已完成）

### 服务对象
- `service_entities[]`: 此 Runtime 管理的 Entity 类型列表
  - `WorkflowEntity`: 工作流实体
  - `StepEntity`: 步骤实体
  - `ExecutionEntity`: 执行实体

### 当前步骤状态
- `current_step.step_id`: 当前步骤 ID
- `current_step.step_name`: 当前步骤名称
- `current_step.status`: 步骤状态（pending/running/completed/failed/skipped）
- `current_step.started_at`: 步骤开始时间
- `current_step.retry_count`: 重试次数
- `current_step.max_retries`: 最大重试次数

### 步骤历史
- `step_history[]`: 已执行步骤列表
  - `step_id`: 步骤 ID
  - `step_name`: 步骤名称
  - `status`: 步骤状态
  - `started_at`: 开始时间
  - `completed_at`: 完成时间
  - `duration_ms`: 执行时长（毫秒）
  - `output`: 步骤输出
  - `error`: 错误信息（如果失败）

### 工作流变量
- `variables`: 工作流变量键值对
  - 示例：`user_id`, `input_data`, `result`, `error_message`

### 待执行步骤
- `pending_steps[]`: 待执行步骤列表
  - `step_id`: 步骤 ID
  - `step_name`: 步骤名称
  - `depends_on[]`: 依赖的步骤 ID 列表

### 错误处理
- `error_handling.last_error`: 最后一次错误信息
- `error_handling.error_count`: 错误次数
- `error_handling.retry_strategy`: 重试策略（immediate/exponential_backoff/none）
- `error_handling.next_retry_at`: 下次重试时间（ISO 8601 格式）

### 统计信息
- `statistics.total_steps`: 总步骤数
- `statistics.completed_steps`: 已完成步骤数
- `statistics.failed_steps`: 失败步骤数
- `statistics.skipped_steps`: 跳过步骤数
- `statistics.total_duration_ms`: 总执行时长（毫秒）

---

## 完整示例

见 `workflow-runtime.yaml` 文件。

---

## 参考

- Entity 层 Workflow 实体: `workflows/{workflow_id}/`
- Entity 层 Workflow 配置: `workflows/{workflow_id}/config/workflow.yaml`
- Runtime 层文档: `docs/v4/architecture/02-runtime-layer.md` Section 2.2
