# ReactionEntity（反应实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-reaction  
> **实体类型**: ReactionEntity  
> **关键词**: `Reaction`, `反应`, `表情`, `Emoji`, `消息互动`  
> **适用场景**: 查找消息反应数据结构、Emoji 互动机制  
> **相关实体**: MessageEntity, UserEntity, AgentEntity  
> **相关文档**: [Backend API - Message Service](../../03-infrastructure/04-backend-api.md)

---

### ReactionEntity（反应实体）

反应是用户或 Agent 对消息的 Emoji 互动。存储在 MessageEntity 的 `reactions` 字段中，不单独存储为文件。

**数据结构**（嵌入在 MessageEntity 中）：

```json
{
  "reactions": [
    {
      "emoji": "👍",
      "user_ids": ["user-001", "agent-001"],
      "count": 2
    },
    {
      "emoji": "🎉",
      "user_ids": ["user-002"],
      "count": 1
    }
  ]
}
```

**字段说明**：
- `emoji`: Unicode Emoji 字符
- `user_ids`: 做出该反应的用户/Agent ID 列表
- `count`: 反应数量（等于 user_ids 长度）

---
