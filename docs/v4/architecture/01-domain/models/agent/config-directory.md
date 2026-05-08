# config/ 目录示例

**文件路径**: `agents/{agent_id}/config/`

**说明**: 可选的结构化配置目录，为 API 提供机器友好的访问方式。这些文件是 `agent.md` 中对应章节的结构化镜像，API 调用时优先读取这些 YAML 文件以获得更快的解析速度。

## 目录结构

```
agents/{agent_id}/config/
├── skills.yaml        # 技能列表（结构化）
├── tools.yaml         # 工具权限（结构化）
├── plugins.yaml       # 插件集成（结构化）
└── triggers.yaml      # 触发器配置（结构化）
```

---

## skills.yaml

```yaml
# agents/agent-001/config/skills.yaml
# Agent 技能配置（结构化版本，对应 agent.md 中的"技能列表"章节）

skills:
  - skill_id: "tdd-workflow"
    name: "TDD 工作流"
    description: "测试驱动开发流程，先写测试再写实现"
    trigger: "用户要求实现新功能时"
    enabled: true
    priority: 1
    steps:
      - "理解需求，编写测试用例"
      - "运行测试，确认失败"
      - "编写最小实现代码"
      - "运行测试，确认通过"
      - "重构代码，优化设计"

  - skill_id: "code-review"
    name: "代码审查"
    description: "全面的代码审查流程"
    trigger: "PR 创建或用户请求审查时"
    enabled: true
    priority: 2
    checklist:
      - "代码风格和规范"
      - "逻辑正确性"
      - "性能优化"
      - "安全性检查"
      - "测试覆盖率"

  - skill_id: "architecture-design"
    name: "架构设计"
    description: "系统架构设计和技术选型"
    trigger: "用户请求架构设计或技术选型时"
    enabled: true
    priority: 3
    principles:
      - "高内聚低耦合"
      - "可扩展性"
      - "可维护性"
      - "性能优化"
```

---

## tools.yaml

```yaml
# agents/agent-001/config/tools.yaml
# Agent 工具权限配置（结构化版本，对应 agent.md 中的"工具权限"章节）

tools:
  allowed:
    - tool_name: "Read"
      description: "读取文件内容"
      restrictions: null
    - tool_name: "Write"
      description: "创建新文件"
      restrictions:
        allowed_paths: ["src/**/*", "docs/**/*"]
    - tool_name: "Edit"
      description: "编辑现有文件"
      restrictions:
        allowed_paths: ["src/**/*", "docs/**/*"]
    - tool_name: "Bash"
      description: "执行命令行命令"
      restrictions:
        allowed_commands: ["git", "npm", "python", "docker"]
        forbidden_commands: ["rm -rf /", "sudo", "chmod 777"]
    - tool_name: "Agent"
      description: "调用子 Agent"
      restrictions:
        max_subagents: 5
    - tool_name: "Grep"
      description: "搜索文件内容"
      restrictions: null
    - tool_name: "Glob"
      description: "文件模式匹配"
      restrictions: null
    - tool_name: "LSP"
      description: "代码智能提示"
      restrictions: null

  forbidden:
    - tool_name: "WebFetch"
      reason: "此 Agent 不需要网络访问"
```

---

## plugins.yaml

```yaml
# agents/agent-001/config/plugins.yaml
# Agent 插件集成配置（结构化版本，对应 agent.md 中的"插件集成"章节）

plugins:
  - plugin_id: "plugin-001"
    name: "GitHub Integration"
    provider: "github"
    enabled: true
    capabilities:
      - "读取 PR 信息"
      - "添加审查评论"
      - "管理 Issue"
    config:
      token_env: "GITHUB_TOKEN"
      repo: "owner/repo"
      webhook_secret_env: "GITHUB_WEBHOOK_SECRET"
    rate_limit:
      requests_per_hour: 5000

  - plugin_id: "plugin-002"
    name: "Feishu Notification"
    provider: "feishu"
    enabled: false
    capabilities:
      - "发送飞书通知"
      - "同步任务状态"
    config:
      webhook_url_env: "FEISHU_WEBHOOK"
      app_id_env: "FEISHU_APP_ID"
      app_secret_env: "FEISHU_APP_SECRET"
```

---

## triggers.yaml

```yaml
# agents/agent-001/config/triggers.yaml
# Agent 触发器配置（结构化版本，对应 agent.md 中的"触发器配置"章节）

triggers:
  - trigger_id: "trigger-001"
    name: "每日架构审查"
    type: "schedule"
    enabled: true
    schedule:
      cron: "0 9 * * *"
      timezone: "Asia/Shanghai"
    action:
      type: "execute_skill"
      skill_id: "code-review"
      params:
        scope: "yesterday_changes"
        output: "architecture_report"

  - trigger_id: "trigger-002"
    name: "PR 创建时触发"
    type: "event"
    enabled: true
    event:
      source: "github"
      event_type: "pull_request.opened"
      filters:
        base_branch: "main"
        label_contains: null
    action:
      type: "execute_skill"
      skill_id: "code-review"
      params:
        scope: "pr_changes"
        auto_comment: true

  - trigger_id: "trigger-003"
    name: "错误率告警"
    type: "threshold"
    enabled: true
    threshold:
      metric: "error_rate"
      operator: ">"
      value: 0.1
      window_minutes: 30
    action:
      type: "notify"
      target: "owner"
      message: "Agent 错误率超过 10%，请检查"
```
