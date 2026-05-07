# WorkflowEntity（工作流实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-workflow  
> **实体类型**: WorkflowEntity  
> **关键词**: `Workflow`, `工作流`, `自动化`, `触发器`, `条件判断`, `流程编排`, `Agent 协作`  
> **适用场景**: 查找工作流数据结构、触发器设计、流程编排、自动化任务  
> **相关实体**: TaskEntity, AgentEntity, ExecutionEntity, ProjectEntity  
> **相关文档**: [Backend API - Workflow Service](../../04-backend-api.md)

---

### 1.8 WorkflowEntity（工作流实体）

**文件格式**: `workflows/{workflow_id}/workflow.yaml`

```yaml
# workflows/workflow-001/workflow.yaml
# WorkflowEntity 配置文件示例（Workflow 归属 KR）

# 基础信息
workflow_id: "workflow-001"              # 唯一标识（UUID）
name: "核心功能开发流程"                  # 工作流名称
description: "Agent、Task、Channel 核心功能的开发流程"
kr_id: "kr-001"                          # 归属的 Key Result ID（Workflow 归属 KR）
project_id: "proj-001"                   # 所属项目

# 工作流类型
workflow_type: "sequential"              # 类型: sequential | parallel | dag | state_machine
status: "active"                         # 状态: draft | active | paused | completed | failed

# 工作流步骤（Steps）- Value Object，通过 id 在 Workflow 内唯一标识
steps:
  - id: "step_001"
    name: "架构设计"
    type: "task"                         # 步骤类型: task | decision | parallel | loop
    task_id: "task-001"
    config:
      agent_id: "agent-001"
      timeout_minutes: 60
    
  - id: "step_002"
    name: "设计审查"
    type: "decision"
    condition: "task-001.status == 'done' && task-001.review_approved == true"
    
  - id: "step_003"
    name: "并行开发"
    type: "parallel"
    parallel_tasks: ["task-002", "task-003", "task-004"]
    
  - id: "step_004"
    name: "集成测试"
    type: "task"
    task_id: "task-005"

# 工作流边（Edges）- Value Object，通过 source+target 唯一标识
edges:
  - source: "step_001"
    target: "step_002"
    condition: null
    
  - source: "step_002"
    target: "step_003"
    condition: "approved == true"
    
  - source: "step_002"
    target: "step_001"
    condition: "approved == false"
    
  - source: "step_003"
    target: "step_004"
    condition: "all_completed == true"

# 触发器配置
triggers:
  - trigger_type: "manual"               # 触发类型: manual | schedule | event | webhook
    enabled: true
  - trigger_type: "event"
    event_source: "github"
    event_type: "push"
    branch: "main"
    enabled: true

# 执行历史
executions:
  - execution_id: "wf-exec-001"
    started_at: "2026-05-01T09:00:00Z"
    completed_at: "2026-05-01T18:00:00Z"
    status: "completed"
    duration_minutes: 540

# 扩展元数据
meta:
  tags: ["development", "core-features"]
  category: "engineering"
  created_by:
    id: "user-001"
    type: "human"
  created_at: "2026-04-26T00:00:00Z"
  updated_at: "2026-05-02T10:00:00Z"
```

---

