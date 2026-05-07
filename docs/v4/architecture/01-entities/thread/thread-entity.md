# ThreadEntity（线程实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-thread  
> **实体类型**: ThreadEntity  
> **关键词**: `Thread`, `线程`, `消息线程`, `讨论`, `回复`  
> **适用场景**: 查找线程数据结构、线程消息组织、线程成员管理  
> **相关实体**: MessageEntity, ChannelEntity, UserEntity, AgentEntity  
> **相关文档**: [Backend API - Message Service](../../04-backend-api.md)

---

### ThreadEntity（线程实体）

线程是附属于某条消息的子对话，用于组织针对特定话题的讨论，不影响主频道的消息流。

**文件格式**: `channels/{channel_id}/threads/{root_message_id}/thread.yaml`

```yaml
# channels/channel-001/threads/msg-001/thread.yaml
# ThreadEntity 配置文件示例

# 基础信息
thread_id: "msg-001"                     # 线程 ID（等于根消息 ID）
channel_id: "channel-001"               # 所属频道
root_message_id: "msg-001"              # 根消息 ID（线程附属的消息）

# 线程状态
status: "active"                         # 状态: active | archived
reply_count: 5                           # 回复数量
last_reply_at: "2026-05-02T11:00:00Z"   # 最后回复时间

# 参与者（只存 ID）
participants:
  - user_id: "user-001"
  - agent_id: "agent-001"

# 时间信息
created_at: "2026-05-02T10:00:00Z"
updated_at: "2026-05-02T11:00:00Z"
```

**线程消息存储**：线程中的消息与普通消息格式相同，存储在 `channels/{channel_id}/messages/{date}/` 目录下，通过 `thread_id` 字段关联到线程。

---
