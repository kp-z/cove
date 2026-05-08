# UserEntity（用户实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-user  
> **实体类型**: UserEntity  
> **关键词**: `User`, `用户`, `认证`, `权限`, `用户配置`, `飞书集成`, `SSO`  
> **适用场景**: 查找用户数据结构、认证流程、权限管理、飞书用户映射  
> **相关实体**: AgentEntity, ChannelEntity, MessageEntity, ProjectEntity  
> **相关文档**: [Backend API - Auth Service](../../04-backend-api.md#44-authentication), [Integration - Feishu](../../06-integration.md#62-feishu-integration)

---

### 1.3 UserEntity（用户实体）

**文件格式**: `users/{user_id}/profile.yaml`

**设计说明**:
- UserEntity 是人类用户的身份和权限实体
- UserEntity 与 AgentEntity 共享部分数据结构模式（如 memory 系统），但两者是完全独立的领域概念
- UserEntity 可以关联多个 AgentEntity（用户创建的 AI agents）
- 用户的 memory 系统存储用户偏好、操作历史等个人数据

```yaml
# users/user-001/profile.yaml
# UserEntity 配置文件示例

# 基础信息
user_id: "user-001"                      # 唯一标识（UUID）
username: "kp-user"                      # 用户名
display_name: "KP"                       # 显示名称
email: "kp@example.com"                  # 邮箱
avatar: "avatars/kp.png"                 # 头像路径

# 角色和权限
role: "owner"                            # 角色: owner | admin | user | visitor
permissions:
  - "project.create"
  - "project.delete"
  - "agent.create"
  - "agent.delete"
  - "user.manage"

# 记忆系统（用户级别）
memory:
  preferences: "users/user-001/memory/preferences.yaml"    # 用户偏好
  history: "users/user-001/memory/history.jsonl"           # 操作历史
  bookmarks: "users/user-001/memory/bookmarks.yaml"        # 书签

# 工作区
workspace:
  root: "users/user-001/workspace/"      # 用户工作区根目录
  recent_projects: ["proj-001", "proj-002"]  # 最近访问的项目
  pinned_channels: ["channel-001", "channel-003"]  # 固定的频道

# 通知配置
notifications:
  email_enabled: true
  push_enabled: true
  mention_notify: true                   # @mention 时通知
  task_assign_notify: true               # 任务分配时通知

# 扩展元数据
meta:
  timezone: "Asia/Shanghai"
  language: "zh-CN"
  theme: "dark"
  created_at: "2026-01-01T00:00:00Z"
  last_login_at: "2026-05-02T09:00:00Z"
```

---

