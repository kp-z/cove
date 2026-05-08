# ChannelEntity（频道实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-channel  
> **实体类型**: ChannelEntity  
> **关键词**: `Channel`, `频道`, `DM`, `Thread`, `消息容器`, `权限控制`, `频道类型`  
> **适用场景**: 查找频道数据结构、频道类型定义、权限设计、Thread 机制  
> **相关实体**: MessageEntity, UserEntity, AgentEntity, ThreadEntity  
> **相关文档**: [Backend API - Channel Service](../../04-backend-api.md)

---

### 1.4 ChannelEntity（频道实体）

**文件格式**: `channels/{channel_id}/channel.yaml`

```yaml
# channels/channel-001/channel.yaml
# ChannelEntity 配置文件示例

# 基础信息
channel_id: "channel-001"                # 唯一标识（UUID）
name: "#general"                         # 频道名称
display_name: "通用讨论"                  # 显示名称
description: "团队通用讨论频道"           # 描述
icon: "icons/channel-general.png"        # 频道图标

# 频道类型
type: "public"                           # 类型: public | private | dm | thread
parent_channel_id: null                  # 父频道 ID（用于子频道）
project_id: "proj-001"                   # 所属项目

# 成员列表
members:
  - member_id: "user-001"
    member_type: "human"
    role: "owner"
    joined_at: "2026-04-01T00:00:00Z"
  - member_id: "agent-001"
    member_type: "agent"
    role: "member"
    joined_at: "2026-04-26T10:00:00Z"

# Agent 池（只存 ID）
agent_pool:
  - agent_id: "agent-001"
  - agent_id: "agent-002"

# 任务池（只存 ID）
task_pool:
  - task_id: "task-001"
  - task_id: "task-002"

# 对话池（对话索引）
conversation_pool:
  - conversation_id: "conv-001"
    agent_id: "agent-001"
    status: "active"
    message_count: 25

# 通信规则
communication_rules:
  allow_mentions: true                   # 允许 @mention
  allow_threads: true                    # 允许创建 thread（线程）
  allow_attachments: true                # 允许附件
  max_message_length: 10000              # 最大消息长度
  rate_limit:
    messages_per_minute: 60              # 每分钟最大消息数
    enabled: true

# 工作区（文件系统）
workspace:
  root: "channels/channel-001/workspace/"  # 频道工作区根目录
  shared_files: "channels/channel-001/workspace/shared/"  # 共享文件
  attachments: "channels/channel-001/workspace/attachments/"  # 附件存储

# 扩展元数据
meta:
  tags: ["general", "team"]
  category: "communication"
  message_count: 1523
  created_at: "2026-04-01T00:00:00Z"
  updated_at: "2026-05-02T10:00:00Z"
  created_by:
    id: "user-001"
    type: "human"
```

---

