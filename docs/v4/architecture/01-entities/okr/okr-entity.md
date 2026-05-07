# OKREntity（目标与关键结果实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-okr  
> **实体类型**: OKREntity  
> **关键词**: `OKR`, `目标`, `关键结果`, `进度跟踪`, `项目管理`, `Objective`, `Key Result`  
> **适用场景**: 查找 OKR 数据结构、目标设定、进度计算、项目关联  
> **相关实体**: ProjectEntity, TaskEntity, WorkflowEntity  
> **相关文档**: [Backend API - OKR Service](../../04-backend-api.md)

---

### 1.7 OKREntity（目标与关键结果实体）

**文件格式**: `projects/{project_id}/okrs/{okr_id}/okr.yaml`

```yaml
# projects/proj-001/okrs/okr-001/okr.yaml
# OKREntity 配置文件示例（OKR 归属 Project）

# 基础信息
okr_id: "okr-001"                        # 唯一标识（UUID）
project_id: "proj-001"                   # 所属项目（OKR 归属 Project）
quarter: "2026-Q2"                       # 季度

# 目标（Objective）
objective:
  title: "完成 v1.0 版本发布"             # 目标标题
  description: |                         # 目标描述
    完成 Cove 平台 v1.0 版本的开发和发布，
    包括核心功能、测试、文档和部署。
  owner:
    id: "user-001"                       # 负责人 ID
    type: "human"                        # 负责人类型: human | agent

# 关键结果（Key Results）
key_results:
  - kr_id: "kr-001"                      # KR 唯一标识
    title: "完成核心功能开发"             # KR 标题
    description: "实现 Agent、Task、Channel 核心功能"
    target_value: 100                    # 目标值
    current_value: 65                    # 当前值
    unit: "percent"                      # 单位: percent | count | boolean
    status: "in_progress"                # 状态: not_started | in_progress | at_risk | completed
    owner:
      id: "agent-001"
      type: "agent"
    # Workflow 归属 KR（只存 ID）
    workflows:
      - workflow_id: "workflow-001"
    # 关联的任务（只存 ID）
    tasks:
      - task_id: "task-001"
      - task_id: "task-002"
    
  - kr_id: "kr-002"
    title: "测试覆盖率达到 80%"
    description: "单元测试、集成测试、E2E 测试覆盖率达到 80%"
    target_value: 80
    current_value: 45
    unit: "percent"
    status: "in_progress"
    owner:
      id: "agent-002"
      type: "agent"
    workflows:
      - workflow_id: "workflow-002"
    tasks:
      - task_id: "task-010"
  
  - kr_id: "kr-003"
    title: "完成用户文档"
    description: "编写用户手册、API 文档、部署指南"
    target_value: 1
    current_value: 0
    unit: "boolean"
    status: "not_started"
    owner:
      id: "user-002"
      type: "human"
    workflows: []
    tasks:
      - task_id: "task-020"

# 进度信息（运行时计算，不存储）
# overall_progress 由 key_results 的 current_value/target_value 自动计算
# kr_completed、tasks_completed 等统计数据由系统实时聚合
# 此处仅存储静态配置
progress_config:
  calculation_method: "weighted_average"  # 进度计算方式: weighted_average | simple_average
  weight_by: "target_value"               # 权重依据: target_value | equal

# 时间信息
start_date: "2026-04-01"                 # 开始日期
end_date: "2026-06-30"                   # 结束日期
created_at: "2026-04-01T00:00:00Z"       # 创建时间
updated_at: "2026-05-02T10:00:00Z"       # 更新时间

# 扩展元数据
meta:
  tags: ["v1.0", "release", "milestone"]
  category: "product"
  visibility: "team"                     # 可见性: team | company | public
  status_color: "yellow"                 # 状态颜色: green | yellow | red
```

---

