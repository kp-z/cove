# TaskEntity（任务实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-task  
> **实体类型**: TaskEntity  
> **关键词**: `Task`, `任务`, `任务状态`, `任务分配`, `任务看板`, `工作流`, `todo/in_progress/in_review/done`  
> **适用场景**: 查找任务数据结构、任务状态流转、任务分配逻辑、看板设计  
> **相关实体**: MessageEntity, ChannelEntity, UserEntity, AgentEntity, WorkflowEntity  
> **相关文档**: [Backend API - Task Service](../../04-backend-api.md)

---

### 1.6 TaskEntity（任务实体）

**文件格式**: `tasks/{task_id}/task.yaml`

```yaml
# tasks/task-001/task.yaml
# TaskEntity 配置文件示例

# 基础信息
task_id: "task-001"                      # 唯一标识（UUID）
task_number: 1                           # 任务编号（频道内递增）
title: "完成架构设计文档"                 # 任务标题
description: |                           # 任务描述
  设计系统架构，包括：
  1. 实体层设计
  2. Runtime 层设计
  3. Backend 层设计
  4. Frontend 层设计

# 任务类型
task_type: "single_agent"                # 类型: single_agent | multi_agent | workflow
priority: "P0"                           # 优先级: P0 | P1 | P2 | P3
status: "in_progress"                    # 状态: todo | in_progress | blocked | in_review | done | cancelled

# 关联关系
channel_id: "channel-001"                # 所属频道
project_id: "proj-001"                   # 所属项目
kr_id: "kr-001"                          # 关联的 Key Result ID（Workflow 归属 KR）
message_id: "msg-001"                    # 关联的消息 ID（任务来源）

# 分配信息
assignee:
  id: "agent-001"                        # 分配对象 ID
  type: "agent"                          # 分配对象类型: agent | human
  assigned_at: "2026-05-02T10:00:00Z"    # 分配时间

# 依赖关系（只存 ID）
depends_on:
  - task_id: "task-000"
blocks:
  - task_id: "task-002"

# 运行配置（Run Config）
run_config:
  done_type: "normal"                    # 完成类型: normal | loop | exploration | test
  max_token: 200000                      # 最大 token 数
  max_duration_minutes: 60               # 最大时长（分钟）
  retry_config:
    max_retries: 3
    backoff_strategy: "exponential"
  auto_review: true                      # 是否自动代码审查
  test_required: true                    # 是否需要测试

# 计划（Plan）
plan:
  plan_id: "plan-001"                    # 关联的计划 ID
  plan_file: "tasks/task-001/plan.md"    # 计划文件路径
  steps:
    - step: 1
      title: "阅读现有文档"
      status: "done"
    - step: 2
      title: "设计 Entity 层"
      status: "in_progress"
    - step: 3
      title: "设计 Runtime 层"
      status: "todo"

# 执行记录
executions:
  - execution_id: "exec-001"
    started_at: "2026-05-02T10:00:00Z"
    status: "running"

# 时间信息
estimated_duration_minutes: 40           # 预计时长
actual_duration_minutes: null            # 实际时长
created_at: "2026-05-02T10:00:00Z"       # 创建时间
started_at: "2026-05-02T10:05:00Z"       # 开始时间
completed_at: null                       # 完成时间
due_date: "2026-05-02T12:00:00Z"         # 截止日期

# 扩展元数据
meta:
  tags: ["architecture", "design", "documentation"]
  category: "design"
  labels: ["high-priority", "blocking"]
  created_by:
    id: "user-001"
    type: "human"
  updated_by:
    id: "agent-001"
    type: "agent"
```

---

