# 04 - Task 管理（P1）

> **前置**：必须先完成 [01](./01-message-channel.md) / [02](./02-thread.md) / [03](./03-websocket.md)。

---

实现消息→任务转换 + 任务认领 / 状态流转。**严格遵循总纲约束**。

## 需求范围

### Domain Layer

**TaskEntity**：

- 字段：`task_id, task_number(频道内递增), title, status(todo/in_progress/in_review/done/cancelled), assignee, channel_id, source_message_id`
- **业务规则（在 TaskEntity 上）**：
  - `Task.claim(user_id)` —— 校验状态是 `todo` 且无 `assignee`，否则返回 `ConflictError`
  - `Task.unclaim(user_id)` —— 校验 `assignee` 是当前用户
  - `Task.transition_to(new_status, actor_id)` —— 校验状态流转合法性

### Application Service Layer

**TaskService**：

- `convert_message_to_task(message_id, title)`
- `claim_task(task_id, user_id)`（必须**原子**，加行锁防并发）
- `unclaim_task / update_status`
- 状态变更后通过 `EventPublisher` 发布 `task_updated` 事件

### Infrastructure Layer

- **tasks 表** + `task_number` 在 channel 内 SEQUENCE 或行锁递增
- **REST API**：
  ```
  POST /api/v1/messages/{msg_id}/convert-to-task
  GET  /api/v1/channels/{id}/tasks
  POST /api/v1/tasks/{id}/claim
  POST /api/v1/tasks/{id}/unclaim
  PUT  /api/v1/tasks/{id}/status
  ```

## 关键约束

- `claim_task` 必须使用 **DB 行锁**（`SELECT ... FOR UPDATE`）保证原子性
- **状态流转图严格定义**：
  ```
  todo → in_progress → in_review → done
  任意状态 → cancelled
  其它流转返回 InvalidTransitionError
  ```

---

**先输出文件清单和依赖图。**
