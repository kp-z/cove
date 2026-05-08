# 频道运行时配置 (channel-runtime.yaml)

**文件路径**: `runtime/channel_runtime/{channel_id}/runtime.yaml`

**说明**: ChannelRuntime 运行时状态文件，记录频道的实时状态、成员在线状态、消息流、WebSocket 连接状态。

---

## 与 Entity 层的对应关系

| Runtime 层 | Entity 层 | 说明 |
|---|---|---|
| `channel_id` | `channels/{id}/` | 对应 Entity 层的 Channel 实体 |
| `online_members[]` | `channels/{id}/members/` | 对应频道成员列表 |
| `message_queue` | `channels/{id}/messages/` | 对应频道消息列表 |

---

## 字段说明

### 运行时信息
- `runtime_id`: 运行时唯一标识
- `channel_id`: 关联的频道 ID
- `status`: 运行状态（active/inactive/archived）
- `created_at`: 创建时间（ISO 8601 格式）

### 服务对象
- `service_entities[]`: 此 Runtime 管理的 Entity 类型列表
  - `ChannelEntity`: 频道实体
  - `MessageEntity`: 消息实体
  - `MemberEntity`: 成员实体

### 在线成员状态
- `online_members[]`: 在线成员列表
  - `member_id`: 成员 ID
  - `member_type`: 成员类型（human/agent）
  - `member_name`: 成员名称
  - `status`: 在线状态（online/away/offline）
  - `last_seen`: 最后可见时间（ISO 8601 格式）
  - `current_activity`: 当前活动（typing/reading/idle/working/thinking）
  - `websocket_connection_id`: WebSocket 连接 ID

### 消息队列状态
- `message_queue.pending_messages`: 待处理消息数
- `message_queue.processing_messages`: 正在处理的消息数
- `message_queue.last_message_id`: 最后一条消息 ID
- `message_queue.last_message_at`: 最后一条消息时间

### 未读通知
- `pending_notifications[]`: 未读通知列表
  - `notification_id`: 通知 ID
  - `notification_type`: 通知类型（mention/reply/reaction）
  - `target_member_id`: 目标成员 ID
  - `message_id`: 关联的消息 ID
  - `created_at`: 创建时间

### WebSocket 连接状态
- `websocket_connections[]`: WebSocket 连接列表
  - `connection_id`: 连接 ID
  - `member_id`: 成员 ID
  - `connected_at`: 连接时间
  - `last_ping`: 最后 ping 时间
  - `status`: 连接状态（connected/disconnected）

### 统计信息
- `statistics.total_messages`: 消息总数
- `statistics.total_members`: 成员总数
- `statistics.online_members_count`: 在线成员数
- `statistics.messages_today`: 今日消息数

---

## 完整示例

见 `channel-runtime.yaml` 文件。

---

## 参考

- Entity 层 Channel 实体: `channels/{channel_id}/`
- Runtime 层文档: `docs/v4/architecture/02-runtime-layer.md` Section 2.2
