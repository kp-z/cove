# MessageEntity（消息实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-message  
> **实体类型**: MessageEntity  
> **关键词**: `Message`, `消息`, `消息类型`, `Attachment`, `Reaction`, `Thread`, `任务消息`, `WebSocket 推送`  
> **适用场景**: 查找消息数据结构、消息类型定义、附件处理、Reaction 机制、Thread 关联  
> **相关实体**: ChannelEntity, UserEntity, AgentEntity, TaskEntity, AttachmentEntity, ReactionEntity, ThreadEntity  
> **相关文档**: [Backend API - Message Service](../../03-infrastructure/04-backend-api.md), [Backend API - WebSocket](../../03-infrastructure/04-backend-api.md#43-websocket)

---

### 1.5 MessageEntity（消息实体）

**文件格式**: `channels/{channel_id}/messages/{date}/{message_id}.json`

**设计说明**：
- **不存储 sender_avatar**: 头像信息存储在 UserEntity/AgentEntity 中，Message 通过 sender_id 引用
- **避免数据冗余**: 用户更新头像后，所有消息自动显示最新头像
- **历史快照**: 如需显示发送时的头像，在 UserEntity 维护头像历史记录，Message 引用 avatar_version

```json
// channels/channel-001/messages/2026-05-02/msg-001.json
// MessageEntity 数据文件示例

{
  // 基础信息
  "message_id": "msg-001",                    // 唯一标识（UUID）
  "msg_short_id": "a1b2c3d4",                 // 短 ID（前 8 位，用于显示）
  
  // 发送者信息
  "sender_id": "user-001",                    // 发送者 ID（通过此 ID 查询 UserEntity 获取头像）
  "sender_type": "human",                     // 发送者类型: human | agent | system
  "sender_name": "kp-user",                   // 发送者名称 
  
  // 频道信息
  "channel_id": "channel-001",                // 所属频道
  "channel_name": "#general",                 // 频道名称
  
  // 线程信息（Thread）
  "thread_id": null,                  // 线程 ID（如果是线程回复消息）
  "is_thread_root": false,            // 是否是线程的根消息
  
  // 消息内容
  "content": "@Alice 请帮我审查一下这个 PR",  // 消息内容
  "content_type": "text",                     // 内容类型: text | markdown | code | image | file | combination
  "content_format": "markdown",               // 内容格式: plain | markdown | html
  
  // 附件列表
  "attachments": [
    {
      "attachment_id": "attach-001",
      "file_name": "architecture.png",
      "file_type": "image/png",
      "file_size": 102400,
      "file_url": "attachments/attach-001.png",
      "thumbnail_url": "attachments/attach-001_thumb.png"
    }
  ],
  
  // @mention 列表
  "mentions": [
    {
      "mention_type": "agent",                // 类型: agent | user | channel | task
      "mention_id": "agent-001",
      "mention_name": "Alice",
      "mention_position": 0                   // 在消息中的位置
    }
  ],
  
  // 引用和链接
  "references": [
    {
      "ref_type": "task",                     // 类型: task | plan | agent | file | url
      "ref_id": "task-001",
      "ref_title": "完成架构设计"
    }
  ],
  
  // 消息状态
  "status": "sent",                           // 状态: draft | sending | sent | failed | deleted
  "is_edited": false,                         // 是否已编辑
  "edit_history": [],                         // 编辑历史
  
  // 反应和互动
  "reactions": [
    {
      "emoji": "👍",
      "user_ids": ["user-002", "agent-001"],
      "count": 2
    }
  ],
  
  // 时间戳
  "created_at": "2026-05-02T10:00:00Z",       // 创建时间
  "updated_at": "2026-05-02T10:00:00Z",       // 更新时间
  "deleted_at": null,                         // 删除时间
  
  // 扩展元数据
  "meta": {
    "client": "web",                          // 客户端类型: web | mobile | cli
    "is_pinned": false,                       // 是否置顶
    "is_important": false                     // 是否重要
    // 注意: ip_address 和 user_agent 存入审计日志，不存入消息实体
  }
}
```

---

