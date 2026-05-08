# WorkflowEntity（工作流实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-workflow  
> **实体类型**: WorkflowEntity  
> **关键词**: `Workflow`, `工作流`, `自动化`, `任务编排`, `并行执行`, `条件分支`, `Agent 协作`  
> **适用场景**: 查找工作流数据结构、任务编排、流程控制、自动化执行  
> **相关实体**: TaskEntity, AgentEntity, ExecutionEntity, OKREntity  
> **相关文档**: [Backend API - Workflow Service](../../03-infrastructure/04-backend-api.md)

---

## 一、WorkflowEntity 概述

WorkflowEntity（工作流实体）定义了任务的自动化编排和执行流程。Workflow 通过引用 Task 来组织复杂的多步骤流程，支持顺序执行、并行执行和条件分支。

### 核心概念

- **Workflow**：工作流，定义任务的执行顺序和控制逻辑
- **Step**：工作流步骤，引用一个 Task 并提供执行控制配置
- **Stage**：工作流阶段，包含一个或多个并行执行的 Step
- **Task**：具体的工作单元，由 Workflow 引用

### 设计原则

1. **Workflow 负责编排**：定义任务的执行顺序和控制逻辑
2. **Task 负责执行**：定义具体的工作内容和数据依赖
3. **嵌套数组表达并行**：借鉴 Argo Workflows 的设计，用嵌套数组表达并行关系
4. **条件控制执行**：每个 Step 可以有 condition，控制是否执行

---

## 二、数据结构定义

### 2.1 基础结构

**文件格式**: `workflows/{workflow_id}/workflow.yaml`

```yaml
# workflows/workflow-001/workflow.yaml
# WorkflowEntity 配置文件

# 基础信息
workflow_id: "workflow-001"              # 唯一标识（UUID）
name: "核心功能开发流程"                  # 工作流名称
description: "Agent、Task、Channel 核心功能的开发和测试流程"
kr_id: "kr-001"                          # 归属的 Key Result ID
project_id: "proj-001"                   # 所属项目

# 工作流状态
status: "active"                         # 状态: draft | active | paused | completed | archived

# 工作流步骤（嵌套数组）
# 外层数组：顺序执行的阶段（Stage）
# 内层数组：并行执行的步骤（Step）
steps:
  # 阶段 1：架构设计（单个 Step = 顺序执行）
  - - id: "step_001"
      task_id: "task-001"
      timeout_minutes: 60
      on_failure: "fail"                 # fail | continue | retry
  
  # 阶段 2：设计审查（单个 Step）
  - - id: "step_002"
      task_id: "task-002"
      condition: "step_001.status == 'done'"
      timeout_minutes: 30
      on_failure: "fail"
  
  # 阶段 3：并行开发（多个 Step = 并行执行）
  - - id: "step_003"
      task_id: "task-003"
      condition: "step_002.review_approved == true"
      timeout_minutes: 120
      on_failure: "fail"
    - id: "step_004"
      task_id: "task-004"
      timeout_minutes: 120
      on_failure: "fail"
    - id: "step_005"
      task_id: "task-005"
      timeout_minutes: 120
      on_failure: "fail"
  
  # 阶段 4：集成测试（单个 Step）
  - - id: "step_006"
      task_id: "task-006"
      condition: "step_003.status == 'done' && step_004.status == 'done' && step_005.status == 'done'"
      timeout_minutes: 60
      on_failure: "fail"

# 触发器配置
triggers:
  - trigger_type: "manual"               # 触发类型: manual | schedule | event | webhook
    enabled: true
  - trigger_type: "event"
    event_source: "okr"
    event_type: "kr_updated"
    kr_id: "kr-001"
    enabled: true

# 执行历史（只存最近的执行记录引用）
executions:
  - execution_id: "wf-exec-001"
    started_at: "2026-05-01T09:00:00Z"
    completed_at: "2026-05-01T18:00:00Z"
    status: "completed"
    duration_minutes: 540

# 时间信息
created_at: "2026-04-26T00:00:00Z"
updated_at: "2026-05-02T10:00:00Z"
created_by:
  id: "user-001"
  type: "human"

# 扩展元数据
meta:
  tags: ["development", "core-features"]
  category: "engineering"
```

---

### 2.2 Step 字段说明

每个 Step 包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | Step 唯一标识 |
| `task_id` | string | ✅ | 引用的 Task ID |
| `condition` | string | ❌ | 执行条件（表达式），不满足则跳过 |
| `timeout_minutes` | number | ❌ | 超时时间（分钟） |
| `on_failure` | string | ❌ | 失败处理策略：fail（停止 Workflow）、continue（继续下一个 Step）、retry（重试） |
| `retry_config` | object | ❌ | 重试配置（max_retries, backoff_strategy） |

---

### 2.3 嵌套数组语义

**外层数组**：顺序执行的阶段（Stage）
- Workflow 按外层数组的顺序执行
- 每个阶段完成后，才进入下一个阶段

**内层数组**：并行执行的步骤（Step）
- 同一阶段内的多个 Step 并行执行
- 等待所有 Step 完成后，才进入下一个阶段

**示例**：
```yaml
steps:
  - - id: step_001        # 阶段 1：顺序执行
      task_id: task-001
  
  - - id: step_002        # 阶段 2：并行执行
      task_id: task-002
    - id: step_003
      task_id: task-003
    - id: step_004
      task_id: task-004
  
  - - id: step_005        # 阶段 3：顺序执行
      task_id: task-005
```

**执行顺序**：
1. 执行 step_001，等待完成
2. 并行执行 step_002, step_003, step_004，等待全部完成
3. 执行 step_005，等待完成

---

## 三、执行逻辑

### 3.1 执行流程

```python
def execute_workflow(workflow):
    """执行 Workflow"""
    for stage in workflow.steps:
        # 每个 stage 是一个数组
        if len(stage) == 1:
            # 单个 Step：顺序执行
            step = stage[0]
            if should_execute(step):
                execute_step(step)
        else:
            # 多个 Step：并行执行
            parallel_steps = [step for step in stage if should_execute(step)]
            execute_parallel(parallel_steps)

def should_execute(step):
    """检查 Step 是否应该执行"""
    if not step.condition:
        return True
    return evaluate_condition(step.condition)

def execute_step(step):
    """执行单个 Step"""
    try:
        # 1. 启动 Task
        task = get_task(step.task_id)
        result = run_task(task, timeout=step.timeout_minutes)
        
        # 2. 检查结果
        if result.failed:
            handle_failure(step.on_failure)
        
        return result
    except TimeoutError:
        handle_failure(step.on_failure)

def execute_parallel(steps):
    """并行执行多个 Step"""
    futures = [async_execute_step(step) for step in steps]
    results = wait_all(futures)
    return results
```

---

### 3.2 条件表达式

Step 的 `condition` 字段支持以下表达式：

**引用其他 Step 的状态**：
```yaml
condition: "step_001.status == 'done'"
```

**引用 Task 的字段**：
```yaml
condition: "step_002.review_approved == true"
```

**逻辑运算**：
```yaml
condition: "step_001.status == 'done' && step_002.status == 'done'"
condition: "step_001.status == 'done' || step_002.status == 'done'"
```

**比较运算**：
```yaml
condition: "step_001.duration_minutes < 60"
condition: "step_001.test_coverage >= 80"
```

---

### 3.3 失败处理

`on_failure` 字段定义 Step 失败后的处理策略：

| 策略 | 说明 |
|------|------|
| `fail` | 停止整个 Workflow，标记为失败 |
| `continue` | 继续执行下一个 Step，忽略失败 |
| `retry` | 根据 retry_config 重试 |

**重试配置示例**：
```yaml
- id: "step_001"
  task_id: "task-001"
  on_failure: "retry"
  retry_config:
    max_retries: 3
    backoff_strategy: "exponential"    # linear | exponential
    initial_delay_seconds: 10
```

---

## 四、与 Task 的关系

### 4.1 Workflow 引用 Task

Workflow 通过 Step 引用 Task：
```yaml
# workflow.yaml
steps:
  - - id: "step_001"
      task_id: "task-001"    # 引用 Task
```

### 4.2 Task 的数据依赖

Task 通过 `depends_on` 定义数据依赖：
```yaml
# task-001.yaml
task_id: "task-001"
title: "架构设计"
depends_on: []

# task-002.yaml
task_id: "task-002"
title: "前端开发"
depends_on:
  - task_id: "task-001"    # 需要设计文档
```

### 4.3 两种依赖的区别

| 依赖类型 | 定义位置 | 语义 | 检查时机 |
|---------|---------|------|---------|
| **Workflow 的执行顺序** | Step 的 condition | "满足条件才执行" | Step 执行前 |
| **Task 的数据依赖** | Task 的 depends_on | "需要依赖的输出" | Task 启动前 |

**示例**：
```yaml
# Workflow 定义执行顺序
steps:
  - - id: step_001
      task_id: task-001
  - - id: step_002
      task_id: task-002
      condition: "step_001.status == 'done'"

# Task 定义数据依赖
# task-002.yaml
depends_on:
  - task_id: "task-001"    # 需要 task-001 的输出
```

**执行逻辑**：
1. Workflow 检查 `step_002.condition`，满足才执行
2. Task 检查 `task-002.depends_on`，依赖满足才启动
3. 两者可以不一致（Workflow 可以强制执行，即使依赖未满足）

---

## 五、完整示例

### 场景：代码审查流程

```
设计 → 审查 → (通过) → 并行开发 → 集成测试
              → (不通过) → 返回设计
```

### Workflow 定义

```yaml
workflow_id: "workflow-code-review"
name: "代码审查流程"
kr_id: "kr-001"
project_id: "proj-001"
status: "active"

steps:
  # 阶段 1：架构设计
  - - id: "step_001"
      task_id: "task-001"
      timeout_minutes: 60
      on_failure: "fail"
  
  # 阶段 2：设计审查
  - - id: "step_002"
      task_id: "task-002"
      condition: "step_001.status == 'done'"
      timeout_minutes: 30
      on_failure: "fail"
  
  # 阶段 3：并行开发（审查通过）
  - - id: "step_003"
      task_id: "task-003"
      condition: "step_002.review_approved == true"
      timeout_minutes: 120
      on_failure: "fail"
    - id: "step_004"
      task_id: "task-004"
      condition: "step_002.review_approved == true"
      timeout_minutes: 120
      on_failure: "fail"
    - id: "step_005"
      task_id: "task-005"
      condition: "step_002.review_approved == true"
      timeout_minutes: 120
      on_failure: "fail"
  
  # 阶段 4：返回设计（审查不通过）
  - - id: "step_006"
      task_id: "task-001"    # 重新执行设计任务
      condition: "step_002.review_approved == false"
      timeout_minutes: 60
      on_failure: "fail"
  
  # 阶段 5：集成测试
  - - id: "step_007"
      task_id: "task-006"
      condition: "step_003.status == 'done' && step_004.status == 'done' && step_005.status == 'done'"
      timeout_minutes: 60
      on_failure: "fail"

triggers:
  - trigger_type: "manual"
    enabled: true

created_at: "2026-05-01T00:00:00Z"
updated_at: "2026-05-08T00:00:00Z"
created_by:
  id: "user-001"
  type: "human"
```

### Task 定义

```yaml
# task-001.yaml
task_id: "task-001"
title: "架构设计"
assignee:
  id: "agent-001"
  type: "agent"
depends_on: []

# task-002.yaml
task_id: "task-002"
title: "设计审查"
assignee:
  id: "user-001"
  type: "human"
depends_on:
  - task_id: "task-001"

# task-003.yaml
task_id: "task-003"
title: "前端开发"
assignee:
  id: "agent-002"
  type: "agent"
depends_on:
  - task_id: "task-001"

# task-004.yaml
task_id: "task-004"
title: "后端开发"
assignee:
  id: "agent-003"
  type: "agent"
depends_on:
  - task_id: "task-001"

# task-005.yaml
task_id: "task-005"
title: "测试准备"
assignee:
  id: "agent-004"
  type: "agent"
depends_on:
  - task_id: "task-001"

# task-006.yaml
task_id: "task-006"
title: "集成测试"
assignee:
  id: "agent-005"
  type: "agent"
depends_on:
  - task_id: "task-003"
  - task_id: "task-004"
  - task_id: "task-005"
```

---

## 六、Aggregate Root 边界

### 6.1 WorkflowEntity 是独立的聚合根

- **内部实体**：无（Step 是 Value Object，通过 id 在 Workflow 内唯一标识）
- **外部引用**：通过 ID 引用 Task、OKR、Project
- **业务不变量**：
  - Step ID 在 Workflow 内唯一
  - 引用的 Task 必须存在
  - condition 表达式必须合法

### 6.2 与其他聚合根的关系

```
OKREntity (聚合根)
  └── KeyResult
      └── workflow_id (引用)

WorkflowEntity (聚合根)
  └── Step (Value Object)
      └── task_id (引用)

TaskEntity (聚合根)
  └── depends_on (引用其他 Task)
```

---

## 七、最佳实践

### 7.1 何时使用 Workflow

**适合使用 Workflow**：
- ✅ 多步骤的复杂流程
- ✅ 需要条件分支
- ✅ 需要并行执行
- ✅ 需要自动化触发

**不适合使用 Workflow**：
- ❌ 简单的单任务
- ❌ 临时的一次性任务
- ❌ 需要频繁手动干预的任务

### 7.2 设计建议

1. **保持 Workflow 简洁**：每个 Workflow 不超过 10 个 Step
2. **合理划分阶段**：每个阶段有明确的目标
3. **善用并行**：独立的任务应该并行执行
4. **明确失败策略**：每个 Step 都应该定义 on_failure
5. **避免循环依赖**：Workflow 是有向无环图（DAG）

### 7.3 性能优化

1. **并行执行**：尽可能并行执行独立的 Task
2. **超时控制**：为每个 Step 设置合理的 timeout
3. **失败快速**：关键 Step 失败时立即停止 Workflow
4. **资源限制**：控制并行执行的 Task 数量

---

## 八、相关文档

- [TaskEntity](../task/task-entity.md) - 任务实体定义
- [OKREntity](../okr/okr-entity.md) - OKR 实体定义
- [ExecutionEntity](../execution/execution-entity.md) - 执行记录定义
- [Workflow Service](../../02-application/services/README.md) - Workflow 应用服务

---

**最后更新**: 2026-05-09  
**维护者**: @entity_assistant
