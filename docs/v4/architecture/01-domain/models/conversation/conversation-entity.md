# ConversationEntity（对话上下文实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-conversation  
> **实体类型**: ConversationEntity  
> **关键词**: `Conversation`, `对话`, `上下文`, `会话`, `消息历史`, `并发对话`, `对话管理`  
> **适用场景**: 查找对话上下文数据结构、对话生命周期管理、并发对话控制、上下文压缩  
> **相关实体**: AgentEntity, ChannelEntity, MessageEntity, ExecutionEntity  
> **相关文档**: [Backend API - Conversation Service](../../04-backend-api.md), [Application Layer - Agent Daemon](../../../02-application/runtime/daemon.md)

---

## 概述

ConversationEntity 表示 Agent 与 User/Channel 之间的对话上下文。每个对话包含完整的消息历史、上下文状态和元数据。AgentDaemon 管理多个并发对话（`max_conversations: 10`），每个对话有独立的生命周期（active → archived）。

### 为什么需要独立的 ConversationEntity？

1. **并发对话管理**：AgentDaemon 需要同时管理多个对话（最多 10 个）
2. **独立生命周期**：对话有独立的状态（active/archived）和生命周期
3. **上下文隔离**：每个对话有独立的上下文窗口和压缩策略
4. **跨实体引用**：被 ChannelEntity、ExecutionEntity、AgentEntity 三处引用

---

## 数据结构

**文件格式**: `conversations/{conversation_id}/conversation.jsonl` + `metadata.yaml`

### metadata.yaml

```yaml
# conversations/conv-001/metadata.yaml
# ConversationEntity 元数据文件

# 基础信息
conversation_id: "conv-001"              # 唯一标识（UUID）
agent_id: "agent-001"                    # 参与的 Agent
channel_id: "channel-001"                # 所属频道（DM 时为 null）
user_id: "user-001"                      # 对话的 User（群聊时为 null）

# 对话类型
type: "channel"                          # 类型: channel | dm | thread
thread_id: null                          # Thread ID（thread 类型时非空）

# 对话状态
status: "active"                         # 状态: active | archived | expired
priority: "normal"                       # 优先级: high | normal | low

# 上下文管理
context:
  window_size: 200000                    # 上下文窗口大小（tokens）
  current_tokens: 45000                  # 当前使用 tokens
  compression_enabled: true              # 是否启用压缩
  last_compressed_at: "2026-05-06T10:00:00Z"  # 最后压缩时间
  compression_count: 3                   # 压缩次数

# 消息统计
statistics:
  message_count: 25                      # 消息总数
  user_message_count: 12                 # 用户消息数
  agent_message_count: 13                # Agent 消息数
  tool_call_count: 45                    # 工具调用次数
  thinking_tokens: 15000                 # 思考 tokens

# 时间信息
created_at: "2026-05-01T10:00:00Z"       # 创建时间
updated_at: "2026-05-07T01:00:00Z"       # 最后更新时间
last_message_at: "2026-05-07T01:00:00Z"  # 最后消息时间
archived_at: null                        # 归档时间（null 表示未归档）

# 执行记录
executions:                              # 关联的执行记录
  - execution_id: "exec-001"
    started_at: "2026-05-01T10:00:00Z"
    status: "completed"
  - execution_id: "exec-002"
    started_at: "2026-05-02T14:00:00Z"
    status: "completed"

# 扩展元数据
meta:
  tags: ["architecture", "design"]
  category: "development"
  notes: "Entity 层架构设计讨论"
```

### conversation.jsonl

```jsonl
{"type":"conversation_start","conversation_id":"conv-001","agent_id":"agent-001","channel_id":"channel-001","started_at":"2026-05-01T10:00:00Z"}
{"type":"user_message","conversation_id":"conv-001","message_id":"msg-001","sender_id":"user-001","content":"请帮我 review entity layer 的设计","timestamp":"2026-05-01T10:00:05Z"}
{"type":"agent_message","conversation_id":"conv-001","message_id":"msg-002","sender_id":"agent-001","content":"好的，我来全面 review...","timestamp":"2026-05-01T10:00:10Z"}
{"type":"tool_call","conversation_id":"conv-001","tool_name":"Read","tool_args":{"file_path":"docs/entity-layer.md"},"timestamp":"2026-05-01T10:00:15Z"}
{"type":"context_compression","conversation_id":"conv-001","before_tokens":180000,"after_tokens":45000,"timestamp":"2026-05-06T10:00:00Z"}
{"type":"conversation_archived","conversation_id":"conv-001","reason":"inactive","archived_at":"2026-05-10T00:00:00Z"}
```

---

## 关联关系

- **多对一**: Conversation → Agent（一个对话属于一个 Agent）
- **多对一**: Conversation → Channel（一个对话属于一个 Channel，DM 时为 null）
- **多对一**: Conversation → User（DM 对话属于一个 User，群聊时为 null）
- **一对多**: Conversation → Message（一个对话包含多条消息）
- **一对多**: Conversation → Execution（一个对话可能触发多次执行）

---

## 状态机

```
active ──> archived
  │
  └──> expired (超时自动归档)
```

**状态说明**：
- `active`: 活跃对话，正在进行中
- `archived`: 已归档，不再活跃但保留历史
- `expired`: 超时过期（超过 24 小时无活动自动归档）

---

## 对话类型

| 类型 | 说明 | channel_id | user_id | thread_id |
|------|------|-----------|---------|-----------|
| **channel** | 频道群聊 | 非空 | null | null |
| **dm** | 一对一私聊 | null | 非空 | null |
| **thread** | Thread 子对话 | 非空 | null | 非空 |

---

## 使用场景

1. **对话管理**: AgentDaemon 管理多个并发对话
2. **上下文维护**: 维护对话的完整上下文历史
3. **上下文压缩**: 当上下文接近窗口限制时自动压缩
4. **对话归档**: 将不活跃的对话归档以释放资源
5. **执行追溯**: 通过对话 ID 追溯相关的执行记录

---

## 业务不变量（Invariants）

1. **唯一性**: 同一个 Agent 在同一个 Channel/User 中同时只能有一个 active 对话
2. **上下文限制**: `current_tokens` 不能超过 `window_size`
3. **类型约束**: `type: "dm"` 时 `user_id` 必须非空，`channel_id` 必须为 null
4. **归档不可逆**: `archived` 状态的对话不能恢复为 `active`

---

## 示例

完整的 Conversation 示例见 `examples/conversation-001/` 目录。

---
