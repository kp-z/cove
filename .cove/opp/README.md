# .cove/opp - OKR、Plan、Progress 管理目录

> **版本**: v1.0  
> **日期**: 2026-05-08  
> **维护者**: Alice

本目录用于管理 Cove 项目的 OKR（目标与关键结果）、Plan（计划）、Progress（进度）、Workflow（工作流）和 Task（任务）。

## 目录结构

```
.cove/opp/
├── README.md                           # 本文件
├── okrs/                               # OKR 目录
│   ├── okr-cove-mvp-2026q2.yaml       # MVP 版本顶层 OKR
│   └── okr-code-development-2026q2.yaml # Code 开发详细 OKR
├── plans/                              # Plan 目录
│   ├── plan-cove-mvp-master.yaml      # MVP 版本主计划
│   └── plan-code-development-master.yaml # Code 开发详细计划
├── progress/                           # Progress 目录
│   └── progress-okr-cove-mvp-2026q2.yaml # MVP OKR 进度跟踪
├── workflows/                          # Workflow 目录
│   └── wf-domain-entities.yaml        # Domain 实体开发工作流
└── tasks/                              # Task 目录
    └── task-domain-001.yaml           # 实现 Agent 实体任务
```

## 实体说明

### 1. OKR（目标与关键结果）

**文件格式**: `okrs/okr-{name}-{quarter}.yaml`

**用途**: 定义项目的目标（Objective）和关键结果（Key Results）

**层级关系**:
- 顶层 OKR: `okr-cove-mvp-2026q2.yaml`（MVP 版本总体目标）
- 子 OKR: `okr-code-development-2026q2.yaml`（code 开发详细目标）

**关键字段**:
- `okr_id`: OKR 唯一标识
- `objective`: 目标描述
- `key_results`: 关键结果列表
  - `kr_id`: 关键结果 ID
  - `description`: 关键结果描述
  - `target_value`: 目标值
  - `current_value`: 当前值
  - `workflows`: 关联的工作流
  - `tasks`: 关联的任务

**示例**:
```yaml
okr_id: "okr-code-development-2026q2"
objective: "完成 Cove 项目 code 目录的核心代码实现"
key_results:
  - kr_id: "kr-001-domain-layer"
    description: "完成 Domain Layer 所有实体和领域服务的代码实现"
    target_value: 100
    current_value: 15
    workflows:
      - workflow_id: "wf-domain-entities"
    tasks:
      - task_id: "task-domain-001"
```

### 2. Plan（计划）

**文件格式**: `plans/plan-{name}-{type}.yaml`

**用途**: 定义项目的详细实施计划，包括阶段、里程碑、交付物

**关键字段**:
- `plan_id`: 计划唯一标识
- `phases`: 开发阶段列表
  - `phase_id`: 阶段 ID
  - `name`: 阶段名称
  - `deliverables`: 交付物
  - `workflows`: 关联的工作流
  - `milestones`: 里程碑
- `dependencies`: 依赖关系
- `resources`: 资源分配
- `risks`: 风险和缓解措施

**示例**:
```yaml
plan_id: "plan-code-development-master"
phases:
  - phase_id: "phase-1-domain"
    name: "阶段 1: Domain Layer 开发"
    deliverables:
      - name: "Domain 实体"
        path: "code/backend/01-domain/models/"
    workflows:
      - workflow_id: "wf-domain-entities"
```

### 3. Progress（进度）

**文件格式**: `progress/progress-{okr_id}.yaml`

**用途**: 跟踪 OKR 的执行进度，定期更新

**关键字段**:
- `progress_id`: 进度跟踪 ID
- `related_okr_id`: 关联的 OKR ID
- `overall_progress`: 整体进度
  - `completion_percentage`: 完成百分比
  - `health_score`: 健康度评分
- `key_results_progress`: 各 KR 的进度
- `snapshots`: 进度快照（按时间记录）
- `next_actions`: 下一步行动

**更新频率**: 每周更新一次

**示例**:
```yaml
progress_id: "progress-okr-cove-mvp-2026q2"
related_okr_id: "okr-cove-mvp-2026q2"
overall_progress:
  completion_percentage: 16
  health_score: 85
key_results_progress:
  - kr_id: "kr-001-backend-architecture"
    current_value: 30
    status: "in_progress"
```

### 4. Workflow（工作流）

**文件格式**: `workflows/wf-{name}.yaml`

**用途**: 定义具体的开发工作流，包括步骤、依赖关系、任务列表

**关键字段**:
- `workflow_id`: 工作流唯一标识
- `workflow_type`: 工作流类型（sequential | parallel | dag）
- `steps`: 工作流步骤
  - `step_id`: 步骤 ID
  - `type`: 步骤类型（task | decision | parallel）
  - `parallel_tasks`: 并行任务列表
  - `depends_on`: 依赖的步骤
- `edges`: 步骤之间的边（依赖关系）
- `progress`: 进度统计

**示例**:
```yaml
workflow_id: "wf-domain-entities"
workflow_type: "sequential"
steps:
  - step_id: "step-001"
    name: "实现 P0 核心实体"
    type: "parallel"
    parallel_tasks:
      - task_id: "task-domain-001"
      - task_id: "task-domain-002"
```

### 5. Task（任务）

**文件格式**: `tasks/task-{name}.yaml`

**用途**: 定义具体的开发任务，包括详细步骤、交付物、验收标准

**关键字段**:
- `task_id`: 任务唯一标识
- `title`: 任务标题
- `priority`: 优先级（P0 | P1 | P2 | P3）
- `status`: 状态（todo | in_progress | blocked | in_review | done）
- `workflow_id`: 所属工作流
- `kr_id`: 关联的关键结果
- `plan`: 任务计划
  - `steps`: 详细步骤
- `deliverables`: 交付物
- `acceptance_criteria`: 验收标准

**示例**:
```yaml
task_id: "task-domain-001"
title: "实现 Agent 实体"
priority: "P0"
status: "in_progress"
workflow_id: "wf-domain-entities"
plan:
  steps:
    - step: 1
      title: "阅读 Agent 实体设计文档"
      status: "done"
    - step: 2
      title: "编写 Agent 实体单元测试（TDD）"
      status: "in_progress"
```

## 实体关系图

```
OKR (目标与关键结果)
 ├─ Key Result 1
 │   ├─ Workflow 1 (工作流)
 │   │   ├─ Step 1
 │   │   │   ├─ Task 1 (任务)
 │   │   │   └─ Task 2
 │   │   └─ Step 2
 │   │       └─ Task 3
 │   └─ Workflow 2
 │       └─ ...
 ├─ Key Result 2
 │   └─ ...
 └─ Progress (进度跟踪)
     ├─ Overall Progress
     ├─ KR Progress
     └─ Snapshots

Plan (计划)
 ├─ Phase 1
 │   ├─ Deliverable 1
 │   ├─ Workflow 1
 │   └─ Milestone 1
 ├─ Phase 2
 │   └─ ...
 └─ Dependencies
```

## 使用流程

### 1. 创建 OKR

1. 在 `okrs/` 目录创建 OKR 文件
2. 定义 Objective 和 Key Results
3. 为每个 KR 关联 Workflow 和 Task

### 2. 创建 Plan

1. 在 `plans/` 目录创建 Plan 文件
2. 定义开发阶段（Phases）
3. 为每个阶段定义交付物和里程碑
4. 关联 Workflow

### 3. 创建 Workflow

1. 在 `workflows/` 目录创建 Workflow 文件
2. 定义工作流步骤（Steps）
3. 定义步骤之间的依赖关系（Edges）
4. 关联具体的 Task

### 4. 创建 Task

1. 在 `tasks/` 目录创建 Task 文件
2. 定义任务详细步骤（Plan Steps）
3. 定义交付物（Deliverables）
4. 定义验收标准（Acceptance Criteria）

### 5. 跟踪进度

1. 在 `progress/` 目录创建或更新 Progress 文件
2. 每周更新一次进度
3. 记录进度快照（Snapshots）
4. 更新下一步行动（Next Actions）

## 文件命名规范

### OKR 文件
- 格式: `okr-{name}-{quarter}.yaml`
- 示例: `okr-cove-mvp-2026q2.yaml`

### Plan 文件
- 格式: `plan-{name}-{type}.yaml`
- 示例: `plan-code-development-master.yaml`

### Progress 文件
- 格式: `progress-{okr_id}.yaml`
- 示例: `progress-okr-cove-mvp-2026q2.yaml`

### Workflow 文件
- 格式: `wf-{name}.yaml`
- 示例: `wf-domain-entities.yaml`

### Task 文件
- 格式: `task-{name}.yaml`
- 示例: `task-domain-001.yaml`

## AI 搜索优化

所有 YAML 文件都包含 `AI_SEARCH_HEADER` 注释块，便于 AI 快速定位和理解文件内容：

```yaml
# AI_SEARCH_HEADER
# entity_type: OKR | Plan | Progress | Workflow | Task
# entity_id: 实体唯一标识
# purpose: 文件用途简述
# owner: 负责人
# related_entities: [相关实体列表]
```

## 最佳实践

### 1. OKR 设计
- 每个 OKR 包含 3-5 个 Key Results
- Key Results 必须可量化（百分比、数量、布尔值）
- 每个 KR 关联具体的 Workflow

### 2. Plan 设计
- 采用分阶段开发策略
- 明确阶段之间的依赖关系
- 为每个阶段设置里程碑

### 3. Workflow 设计
- 优先使用并行工作流（parallel）提高效率
- 明确步骤之间的依赖关系
- 为每个步骤关联具体的 Task

### 4. Task 设计
- 采用 TDD 方法（先写测试再实现）
- 定义清晰的验收标准
- 估算任务时长，便于进度跟踪

### 5. Progress 跟踪
- 每周更新一次进度
- 记录进度快照，便于趋势分析
- 及时识别风险和阻塞问题

## 工具支持

### 查看 OKR 进度
```bash
# 查看所有 OKR
ls -la .cove/opp/okrs/

# 查看特定 OKR
cat .cove/opp/okrs/okr-code-development-2026q2.yaml
```

### 查看 Workflow 状态
```bash
# 查看所有 Workflow
ls -la .cove/opp/workflows/

# 查看特定 Workflow
cat .cove/opp/workflows/wf-domain-entities.yaml
```

### 查看 Task 列表
```bash
# 查看所有 Task
ls -la .cove/opp/tasks/

# 查看特定 Task
cat .cove/opp/tasks/task-domain-001.yaml
```

## 维护说明

### 更新频率
- **OKR**: 季度创建，月度审查
- **Plan**: 项目启动时创建，根据需要调整
- **Progress**: 每周更新
- **Workflow**: 阶段开始时创建，完成后归档
- **Task**: 按需创建，完成后更新状态

### 归档策略
- 完成的 OKR 移动到 `okrs/archive/`
- 完成的 Workflow 移动到 `workflows/archive/`
- 完成的 Task 移动到 `tasks/archive/`

## 参考资料

- [OKR 实体定义](../../docs/v4/architecture/backend/01-domain/models/okr/okr-entity.md)
- [Workflow 实体定义](../../docs/v4/architecture/backend/01-domain/models/workflow/workflow-entity.md)
- [Task 实体定义](../../docs/v4/architecture/backend/01-domain/models/task/task-entity.md)
- [V4 架构文档](../../docs/v4/architecture/README.md)

---

**维护者**: Alice  
**最后更新**: 2026-05-08  
**版本**: v1.0
