# ExecutionEntity（执行记录实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-execution  
> **实体类型**: ExecutionEntity  
> **关键词**: `Execution`, `执行记录`, `工作流执行`, `日志`, `状态跟踪`, `错误处理`, `重试机制`  
> **适用场景**: 查找执行记录数据结构、工作流执行日志、状态跟踪、错误处理  
> **相关实体**: WorkflowEntity, AgentEntity, TaskEntity  
> **相关文档**: [Backend API - Workflow Service](../../04-backend-api.md), [Application Layer - State Management](../../02-runtime-layer.md#24-state-management)

---

### 1.9 ExecutionEntity（执行记录实体）

**文件格式**: `executions/{execution_id}/execution.jsonl`

```jsonl
{"type":"execution_start","execution_id":"exec-001","agent_id":"agent-001","task_id":"task-001","started_at":"2026-05-02T10:00:00Z","input_message_id":"msg-001"}
{"type":"thinking","execution_id":"exec-001","timestamp":"2026-05-02T10:00:05Z","thinking_tokens":1500,"content":"分析任务需求，制定执行计划..."}
{"type":"tool_call","execution_id":"exec-001","timestamp":"2026-05-02T10:00:10Z","tool_name":"Read","tool_args":{"file_path":"/path/to/file.md"},"tool_result":"文件内容..."}
{"type":"skill_invoke","execution_id":"exec-001","timestamp":"2026-05-02T10:00:15Z","skill_name":"architecture-design","skill_status":"started"}
{"type":"log","execution_id":"exec-001","timestamp":"2026-05-02T10:00:20Z","level":"info","message":"开始设计 Entity 层"}
{"type":"file_change","execution_id":"exec-001","timestamp":"2026-05-02T10:00:25Z","file_path":"docs/domain-model-v3.md","change_type":"create","git_commit":"abc123"}
{"type":"error","execution_id":"exec-001","timestamp":"2026-05-02T10:00:30Z","error_type":"ToolError","error_message":"文件不存在","stack_trace":"..."}
{"type":"token_usage","execution_id":"exec-001","timestamp":"2026-05-02T10:00:35Z","input_tokens":5000,"output_tokens":3000,"thinking_tokens":1500,"total_tokens":9500}
{"type":"cost","execution_id":"exec-001","timestamp":"2026-05-02T10:00:35Z","input_cost_usd":0.15,"output_cost_usd":0.45,"thinking_cost_usd":0.05,"total_cost_usd":0.65}
{"type":"execution_end","execution_id":"exec-001","timestamp":"2026-05-02T10:30:00Z","status":"completed","output_message_id":"msg-002","duration_ms":1800000}
```

**元数据文件**: `executions/{execution_id}/metadata.yaml`

```yaml
# executions/exec-001/metadata.yaml
# ExecutionEntity 元数据文件

# 基础信息
execution_id: "exec-001"                 # 唯一标识（UUID）
agent_id: "agent-001"                    # 执行的 Agent
task_id: "task-001"                      # 关联的任务
conversation_id: "conv-001"              # 关联的对话

# 输入输出
input_message_id: "msg-001"              # 输入消息 ID
output_message_id: "msg-002"             # 输出消息 ID

# 执行状态
status: "completed"                      # 状态: pending | running | completed | failed | cancelled
exit_code: 0                             # 退出码（0 表示成功）

# 日志文件
log_file: "executions/exec-001/execution.jsonl"  # 日志文件路径
log_size_bytes: 524288                   # 日志文件大小

# 执行摘要（结构化，供 Agent 快速查询，无需读取 JSONL）
summary:
  outcome: "success"                     # 结果: success | partial | failed
  key_actions:                           # 主要操作（最多 5 条）
    - "读取 entity layer 文档（13 个文件）"
    - "分析架构设计，发现 5 个改进点"
    - "生成 review 报告并发送"
  files_changed: 2                       # 修改文件数
  errors_count: 1                        # 错误数（已恢复）
  errors_recovered: 1                    # 已恢复错误数

# 文件修改记录
file_changes:
  - file_path: "docs/domain-model-v3.md"
    change_type: "create"                # 变更类型: create | modify | delete
    git_commit: "abc123def456"           # Git commit hash
    lines_added: 500
    lines_deleted: 0
  - file_path: "src/models/agent.py"
    change_type: "modify"
    git_commit: "abc123def456"
    lines_added: 25
    lines_deleted: 10

# Token 使用统计
token_usage:
  input_tokens: 50000
  output_tokens: 30000
  thinking_tokens: 15000
  total_tokens: 95000
  cache_read_tokens: 20000               # 缓存读取 token
  cache_write_tokens: 10000              # 缓存写入 token

# 成本统计
cost:
  input_cost_usd: 1.50
  output_cost_usd: 4.50
  thinking_cost_usd: 0.50
  cache_cost_usd: 0.20
  total_cost_usd: 6.70

# 时间信息
started_at: "2026-05-02T10:00:00Z"       # 开始时间
completed_at: "2026-05-02T10:30:00Z"     # 完成时间
duration_ms: 1800000                     # 执行时长（毫秒）

# 工具调用统计
tool_calls:
  - tool_name: "Read"
    call_count: 15
    total_duration_ms: 5000
  - tool_name: "Write"
    call_count: 3
    total_duration_ms: 2000
  - tool_name: "Edit"
    call_count: 8
    total_duration_ms: 3000

# 技能调用统计
skill_invocations:
  - skill_name: "architecture-design"
    invocation_count: 1
    total_duration_ms: 1800000

# 错误信息
errors:
  - error_type: "ToolError"
    error_message: "文件不存在"
    timestamp: "2026-05-02T10:00:30Z"
    recovered: true

# 扩展元数据
meta:
  tags: ["architecture", "design"]
  category: "development"
  priority: "high"
```

---

