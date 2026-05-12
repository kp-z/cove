# 02 - Thread 管理（P0）

> **前置**：必须先完成 [01-message-channel.md](./01-message-channel.md)。

---

基于已实现的 Message + Channel，新增 Thread 功能。**严格遵循总纲约束**。

## 需求范围

### Domain Layer

- **ThreadEntity**：
  - 字段：`thread_id(==root_message_id), channel_id, root_message_id, participants, reply_count`
- **业务规则**：
  - `Thread.add_reply(message)` —— `reply_count++`, `last_reply_at` 更新
  - `Thread.add_participant(actor_id)` —— 去重

### Application Service Layer

**ThreadService**：

- `get_or_create_thread(root_message_id)` —— 首次回复时自动创建
- `reply_in_thread(root_message_id, sender_id, content)` —— 调用 MessageService 发消息，关联 `thread_id`
- `list_thread_messages(thread_id, cursor, limit)`
- `list_channel_threads(channel_id)` —— 频道内活跃 Thread 列表

### Infrastructure Layer

- **threads 表**（参考已有 ThreadEntity 文档）
- **REST API**：
  ```
  POST /api/v1/messages/{msg_id}/thread/messages   # 在 Thread 中回复
  GET  /api/v1/messages/{msg_id}/thread/messages   # Thread 消息列表
  GET  /api/v1/messages/{msg_id}/thread            # Thread 元数据
  GET  /api/v1/channels/{id}/threads               # 频道 Thread 列表
  ```

## 关键约束

- `MessageService` **不需要感知 Thread** —— 是 `ThreadService` 调用 `MessageService` 发送消息，并在保存后调用 `ThreadRepository` 更新 `reply_count`
- **不允许在 Thread 中再创建 Thread**（root_message 必须是顶层消息）

---

**先输出文件清单和依赖图。**
