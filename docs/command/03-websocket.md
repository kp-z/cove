# 03 - WebSocket 实时推送（P0）

> **前置**：必须先完成 [01-message-channel.md](./01-message-channel.md) 和 [02-thread.md](./02-thread.md)。

---

为已有 Message/Channel/Thread 增加 WebSocket 实时推送。**严格遵循总纲约束**。

## 需求范围

### Application Layer

- 在 `ports/event_publisher.py` 定义 **EventPublisher Protocol**：
  ```python
  class EventPublisher(Protocol):
      async def publish(self, event_type: str, channel_id: str, payload: dict) -> None: ...
  ```
- `MessageService.send_message` 完成 DB 写入后，调用 `event_publisher.publish('new_message', ...)`
- `TaskService`、`ThreadService` 同理

### Infrastructure Layer

- **WebSocket 连接管理**：`ConnectionManager`（`user_id → Set[WebSocket]`）
- **订阅管理**：`SubscriptionManager`（基于 `channel_id` / `agent_id` 过滤）
- **事件分发器**：`WebSocketEventPublisher`（实现 EventPublisher Protocol）
- **端点**：`WS /ws/events?token=<jwt>`
- **协议（客户端 → 服务端）**：
  ```json
  { "type": "subscribe", "payload": { "events": ["new_message", "task_updated"], "filters": { "channel_id": "..." } } }
  ```
- **协议（服务端 → 客户端）**：
  ```json
  { "type": "new_message", "payload": { "message_id": "...", "channel_id": "...", "..." }, "timestamp": "..." }
  ```

## 关键约束

- **Application Service 只依赖 EventPublisher Protocol**，不感知 WebSocket 实现
- **心跳**：30s ping，90s 超时
- **JWT 校验失败**立即关闭连接
- **必须支持单用户多设备**（一个 `user_id` 可对应多个 WebSocket 连接）

## 支持的事件类型

| 事件类型 | 触发时机 |
|---------|---------|
| `new_message` | 频道收到新消息 |
| `message_updated` | 消息被编辑或删除 |
| `task_created` | 消息转换为任务 |
| `task_updated` | 任务状态、认领者变化 |
| `task_claimed` | 任务被认领 |
| `agent_status_changed` | Agent 启动/停止/休眠 |
| `channel_member_joined` | 用户或 Agent 加入频道 |
| `channel_member_left` | 用户或 Agent 离开频道 |

---

**先输出文件清单和依赖图。**
