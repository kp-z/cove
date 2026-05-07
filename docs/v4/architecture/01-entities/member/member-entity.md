# MemberEntity（频道成员关系实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-member  
> **实体类型**: MemberEntity  
> **关键词**: `Member`, `成员`, `频道成员`, `角色`, `权限`, `加入`, `离开`, `在线状态`  
> **适用场景**: 查找频道成员关系数据结构、成员角色定义、权限管理、成员状态跟踪  
> **相关实体**: ChannelEntity, UserEntity, AgentEntity  
> **相关文档**: [Backend API - Channel Service](../../04-backend-api.md), [Runtime Layer - Channel Runtime](../../02-runtime/channel-runtime.md)

---

## 概述

MemberEntity 表示 User 或 Agent 与 Channel 之间的成员关系。它是一个独立实体，支持多对多关系（一个 User/Agent 可以加入多个 Channel，一个 Channel 可以有多个成员），并具有独立的生命周期（joined → active → left → banned）。

### 为什么需要独立的 MemberEntity？

1. **多对多关系**：User/Agent 可以加入多个 Channel，需要独立管理每个成员关系
2. **独立生命周期**：成员状态（joined/active/left/banned）独立于 User 和 Channel
3. **Runtime 管理**：ChannelRuntime 需要跟踪 `online_members[]`，需要独立的成员实体
4. **权限控制**：每个成员在不同 Channel 中可能有不同的角色和权限

---

## 数据结构

**文件格式**: `members/{member_id}/member.yaml`

```yaml
# members/member-001/member.yaml
# MemberEntity 配置文件示例

# 基础信息
member_id: "member-001"                  # 唯一标识（UUID）
channel_id: "channel-001"                # 所属频道 ID
user_id: "user-001"                      # 成员 ID（User 或 Agent）
user_type: "human"                       # 成员类型: human | agent

# 成员角色
role: "owner"                            # 角色: owner | admin | member | guest
permissions:                             # 权限列表
  - "read:message"
  - "write:message"
  - "manage:member"
  - "manage:channel"

# 成员状态
status: "active"                         # 状态: joined | active | left | banned
online_status: "online"                  # 在线状态: online | offline | away

# 时间信息
joined_at: "2026-04-01T00:00:00Z"        # 加入时间
last_active_at: "2026-05-07T01:00:00Z"   # 最后活跃时间
left_at: null                            # 离开时间（null 表示未离开）
banned_at: null                          # 封禁时间（null 表示未封禁）

# 成员统计
statistics:
  message_count: 1523                    # 发送消息数
  reaction_count: 245                    # 反应数
  mention_count: 89                      # 被 @mention 次数
  thread_count: 34                       # 创建的 thread 数

# 通知设置
notification_settings:
  enabled: true                          # 是否启用通知
  mention_only: false                    # 仅 @mention 时通知
  mute_until: null                       # 静音截止时间（null 表示未静音）

# 扩展元数据
meta:
  tags: ["core-team", "active"]
  invited_by:                            # 邀请人
    id: "user-000"
    type: "human"
  notes: "项目创始成员"                   # 备注
```

---

## 关联关系

- **多对一**: Member → Channel（一个成员属于一个频道）
- **多对一**: Member → User/Agent（一个成员对应一个 User 或 Agent）
- **一对多**: Channel → Member（一个频道有多个成员）
- **一对多**: User/Agent → Member（一个 User/Agent 可以是多个频道的成员）

---

## 状态机

```
joined ──> active ──> left
              │
              └──> banned
```

**状态说明**：
- `joined`: 刚加入频道，尚未活跃
- `active`: 活跃成员，正常参与频道活动
- `left`: 已离开频道（可以重新加入）
- `banned`: 被封禁（需要管理员解封才能重新加入）

---

## 角色权限

| 角色 | 权限 |
|------|------|
| **owner** | 所有权限（包括删除频道、转让所有权） |
| **admin** | 管理成员、管理频道设置、删除消息 |
| **member** | 读写消息、创建 thread、添加 reaction |
| **guest** | 只读消息（临时访客） |

---

## 使用场景

1. **成员管理**: 添加/移除频道成员，分配角色
2. **权限控制**: 根据成员角色控制操作权限
3. **在线状态**: 跟踪成员在线/离线状态
4. **统计分析**: 统计成员活跃度、贡献度
5. **通知管理**: 管理成员的通知偏好

---

## 业务不变量（Invariants）

1. **唯一性**: 同一个 User/Agent 在同一个 Channel 中只能有一个 Member 记录
2. **角色约束**: 每个 Channel 必须至少有一个 `owner`
3. **状态流转**: `banned` 状态不能直接转为 `active`，必须先解封
4. **权限继承**: `owner` 和 `admin` 角色自动拥有所有基础权限

---

## 示例

完整的 Member 示例见 `examples/member-001/` 目录。

---
