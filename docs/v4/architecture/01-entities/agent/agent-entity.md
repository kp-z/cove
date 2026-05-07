# AgentEntity（智能体实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-agent  
> **实体类型**: AgentEntity  
> **关键词**: `Agent`, `智能体`, `配置文件`, `agent.md`, `runtime.yaml`, `persona.yaml`, `permissions.yaml`, `技能系统`, `外部兼容`, `Claude Code`, `OpenClaw`  
> **适用场景**: 查找 Agent 数据结构定义、配置文件格式、外部 Agent 同步方案、技能系统设计  
> **相关实体**: ChannelEntity, MessageEntity, TaskEntity, WorkflowEntity  
> **相关文档**: [Runtime Layer - Agent Lifecycle](../../02-runtime-layer.md#21-agentdaemon), [Backend API - Agent Service](../../04-backend-api.md)

---

### 1.1 AgentEntity（智能体实体） 

AgentEntity 采用**多文件分离架构**，将配置拆分为多个 YAML 文件，便于管理和扩展。主配置文件兼容 Claude Code 和 OpenClaw 的 Agent 定义格式。

#### 文件结构

**设计原则**：
- **YAML 用于结构化配置**：适合机器读取、验证、序列化的配置数据（如 API 配置、权限规则、触发器）
- **Markdown 用于文档和知识**：适合人类阅读、编辑、版本控制的文档内容（如 Agent 定义、技能说明、记忆索引）
- **API 友好设计**：agent.md 采用 YAML frontmatter + Markdown 正文格式，API 调用时优先读取 frontmatter 中的结构化配置，按需读取 Markdown 正文中的详细说明

**配置继承机制**：
- **默认配置位置**：`config/defaults/agent_defaults.yaml`
- **继承优先级**：Agent 配置 > 项目默认配置 > 系统默认配置
- **可继承字段**：runtime, persona, permissions（如未显式配置，自动继承默认值）
- **必须配置字段**：agent_id, name, framework（必须显式指定）
- **自动创建**：memory/ 和 workspace/ 目录在创建或检测到 Agent 时自动创建

**外部 Agent 兼容性**：
- **兼容框架**：Claude Code, OpenClaw, Custom
- **同步策略**：点击”同步”时，自动创建 Cove Agent 副本（而非引用），保持数据独立性
- **同步方向**：单向同步（外部 → Cove），定期检查更新
- **映射规则**：
  - Claude Code agent.md → Cove agent.md + runtime.yaml
  - OpenClaw agent config → Cove agent.md + runtime.yaml
  - 外部修改不影响 Cove 系统，避免数据污染
```
agents/{agent_id}/
├── agent.md                # Agent 总览文档 - 人类可读的完整定义（包含配置和说明）
├── runtime.yaml            # 运行时配置（Model、Context、Retry、API）
├── persona.yaml            # 角色配置（简化版：语音、外形、性格）
├── permissions.yaml        # 权限配置
├── config/                 # 可选：API 友好的结构化配置（双轨制设计）
│   ├── skills.yaml         # 技能列表（结构化）
│   ├── tools.yaml          # 工具权限（结构化）
│   ├── plugins.yaml        # 插件集成（结构化）
│   └── triggers.yaml       # 触发器配置（结构化）
├── memory/                 # 记忆系统
│   ├── MEMORY.md           # 记忆索引（移到 memory 目录内）
│   ├── knowledge/          # 知识库
│   ├── diary/              # 日记本
│   ├── errors.jsonl        # 错误日志（JSONL 格式，每行一个错误记录）
│   └── .index/             # 可选：向量索引（启用 RAG 时自动生成）
└── workspace/              # 工作区
    ├── subtask/            # 子任务
    ├── conversation/       # 对话上下文
    └── temp/               # 临时文件
```

**文件说明**：
- `agent.md`: **唯一的 Agent 定义文件**，包含所有配置和说明（基础信息、框架配置、技能、触发器、插件、使用指南等）
- `runtime.yaml`: 运行时配置（Model、API、Context、Retry）
- `persona.yaml`: 角色配置（语音、外形、性格）
- `permissions.yaml`: 权限配置
- `config/`: **可选目录**，提供 API 友好的结构化配置（双轨制设计，详见下文说明）
  - `skills.yaml`: 技能列表（结构化）
  - `tools.yaml`: 工具权限（结构化）
  - `plugins.yaml`: 插件集成（结构化）
  - `triggers.yaml`: 触发器配置（结构化）
- `memory/MEMORY.md`: 记忆索引，指向知识库和日记本中的具体内容
- `memory/errors.jsonl`: 错误日志，JSONL 格式（每行一个 JSON 对象），记录 Agent 执行过程中的错误和解决方案
- `memory/.index/`: **可选**，向量索引目录（启用 `memory_config.vector_index.enabled: true` 时自动生成）

**示例文件位置**：
完整的 Agent 示例见 `examples/agent-001/` 目录，包含：
- `agent.md` - Agent 定义文件示例（YAML frontmatter + Markdown）
- `config/runtime.yaml` - 运行时配置示例
- `config/persona.yaml` - 角色配置示例
- `config/permissions.yaml` - 权限配置示例
- `config/skills.yaml` - 技能列表示例
- `config/tools.yaml` - 工具权限示例
- `config/plugins.yaml` - 插件集成示例
- `config/triggers.yaml` - 触发器配置示例
- `memory/errors.jsonl` - 错误日志示例
- `memory/knowledge/` - 知识库示例
- `memory/diary/` - 工作日志示例
- `skills/skills.yaml` - 技能定义示例

详细说明见 `examples/agent-001/README.md`

---

#### 1.1.1 Agent 总览文档：`agent.md`

**说明**: Agent 的唯一配置文件，包含所有配置和说明（基础信息、框架配置、技能、触发器、插件、使用指南等）。采用 YAML frontmatter + Markdown 正文的格式，兼容 Claude Code 和 OpenClaw 的 Agent 定义格式。

```markdown
---
# YAML Frontmatter - 机器可读的结构化配置
agent_id: "agent-001"
name: "Alice"                            # Agent 系统标识符（用于 @mention、任务分配）
framework: "claude_code"
agent_type: "session"
status: "active"
tags: ["architect", "senior", "fullstack"]
category: "engineering"
priority: "high"
created_at: "2026-04-26T10:00:00Z"
updated_at: "2026-05-02T10:00:00Z"
created_by: "kp-user"

# 配置文件引用
config_files:
  runtime: "runtime.yaml"
  persona: "persona.yaml"
  permissions: "permissions.yaml"

# 记忆检索配置（RAG）
memory_config:
  loading:
    always:
      - "memory/MEMORY.md"
    on_task_start:
      - path: "memory/knowledge/"
        strategy: "semantic"
        top_k: 3
        query_from: "task_description"
      - path: "memory/errors.jsonl"
        strategy: "keyword"
        top_k: 5
        query_from: "task_description"
    on_demand:
      - path: "memory/diary/"
        strategy: "recency"
        top_k: 3
  token_budget:
    always_tokens: 2000
    retrieval_tokens: 6000
    total_tokens: 8000
  vector_index:
    enabled: false
    provider: "local"
    model: "text-embedding-3-small"
    index_path: "memory/.index/"
    auto_update: true
---

# Alice - 项目架构师

> **Agent ID**: agent-001  
> **框架**: Claude Code  
> **类型**: Session Agent  
> **状态**: Active  
> **创建时间**: 2026-04-26  
> **创建者**: @kp-user

---

## 📋 基础信息

- **名称**: Alice（见 `persona.yaml` 的 `persona.name`）
- **头衔**: 架构师（见 `persona.yaml` 的 `persona.title`）
- **描述**: 项目架构师，负责系统设计、技术选型、代码审查
- **标签**: `architect`, `senior`, `fullstack`
- **分类**: Engineering
- **优先级**: High

---

## 🎯 角色定义

Alice 是一位经验丰富的项目架构师，负责系统架构设计、技术选型和代码审查。她的核心职责是确保系统的可扩展性、可维护性和性能。

**核心能力**：
- 系统架构设计
- 技术选型与评估
- 代码审查与质量把控
- 团队技术指导

**工作风格**：
- 注重代码质量和最佳实践
- 善于沟通和协作
- 持续学习新技术

---

## 🧠 系统提示词

```
你是项目架构师 Alice，负责系统架构设计、技术选型、代码审查。
你的核心职责是确保系统的可扩展性、可维护性和性能。

在工作中，你应该：
1. 优先考虑系统的长期可维护性
2. 选择成熟稳定的技术栈
3. 编写清晰的文档和注释
4. 进行全面的代码审查
5. 与团队成员保持良好沟通
```

**配置存储说明**：
- **agent.md**: 保留完整的 Markdown 文档（人类可读，包含自然语言说明和索引）
- **config/ 目录**: **可选**，提供结构化 YAML 配置（机器可读，便于 API 解析）
- **双轨制设计**: agent.md 中添加索引链接指向 config/*.yaml，API 调用时优先读取 YAML 配置

**config/ 目录结构**（可选，用于 API 友好访问）：
```
agents/{agent_id}/config/
├── skills.yaml        # 技能列表（结构化）
├── tools.yaml         # 工具权限（结构化）
├── plugins.yaml       # 插件集成（结构化）
└── triggers.yaml      # 触发器配置（结构化）
```

**使用场景**：
- **人类阅读**: 直接查看 agent.md（完整文档，易于理解）
- **API 调用**: 读取 config/*.yaml（结构化数据，快速解析）
- **同步更新**: 修改 config/*.yaml 后，agent.md 中的索引自动更新

**示例文件**：
完整的 Agent 示例（包含 config/*.yaml）见 `./examples/agent-001/` 目录。

---

## 🔧 配置文件

详细配置请参考：
- [runtime.yaml](./runtime.yaml) - 运行时配置
- [persona.yaml](./persona.yaml) - 人格配置
- [permissions.yaml](./permissions.yaml) - 权限配置
- [config/skills.yaml](./config/skills.yaml) - 技能列表（可选）
- [config/tools.yaml](./config/tools.yaml) - 工具权限（可选）
- [config/plugins.yaml](./config/plugins.yaml) - 插件集成（可选）
- [config/triggers.yaml](./config/triggers.yaml) - 触发器配置（可选）

---

## 📚 使用指南

### 如何与 Alice 协作

1. **提出需求**: 在频道中 @Alice 并描述需求
2. **等待响应**: Alice 会确认需求并制定计划
3. **审查结果**: Alice 完成后会提交审查，等待反馈
4. **迭代优化**: 根据反馈进行调整

### 常见使用场景

- **架构设计**: "@Alice 请设计一个用户认证系统"
- **代码审查**: "@Alice 请审查 PR #123"
- **技术选型**: "@Alice 我们应该用 PostgreSQL 还是 MongoDB？"
- **问题诊断**: "@Alice 系统响应变慢了，帮我分析一下"

---

## ⚡ 触发器配置

### Trigger 1: 每日架构审查
- **ID**: trigger-001
- **类型**: Schedule (定时任务)
- **时间**: 每天 09:00 (Cron: `0 9 * * *`)
- **状态**: Enabled
- **动作**: 审查昨日代码变更，生成架构报告

### Trigger 2: PR 创建时触发
- **ID**: trigger-002
- **类型**: Event (事件触发)
- **事件源**: GitHub
- **事件类型**: `pull_request.opened`
- **状态**: Enabled
- **动作**: 自动进行代码审查，添加审查评论

---

## 🔌 插件集成

### Plugin 1: GitHub Integration
- **ID**: plugin-001
- **状态**: Enabled
- **功能**: 
  - 读取 PR 信息
  - 添加审查评论
  - 管理 Issue
- **配置**:
  - Token: `${GITHUB_TOKEN}` (环境变量)
  - Repo: `owner/repo`

### Plugin 2: Feishu Notification
- **ID**: plugin-002
- **状态**: Disabled
- **功能**: 
  - 发送飞书通知
  - 同步任务状态
- **配置**:
  - Webhook URL: `${FEISHU_WEBHOOK}` (环境变量)

---

## 🧠 记忆系统

Alice 的记忆系统位于 `agents/agent-001/memory/` 目录：

- **MEMORY.md**: 记忆索引，指向所有知识和经验
- **knowledge/**: 知识库，存储技术文档、最佳实践
- **diary/**: 日记本，记录每日工作和思考
- **errors.jsonl**: 错误日志，记录遇到的问题和解决方案

Alice 会持续学习和积累经验，记忆系统会随时间增长。

---

## ⚙️ 配置文件

Alice 的完整配置由以下文件组成：

- **agent.md** (本文件): Agent 总览和配置
- **runtime.yaml**: 运行时配置 (Model、API、Context、Retry)
- **persona.yaml**: 角色配置 (语音、外形、性格)
- **permissions.yaml**: 权限配置 (工具、资源访问权限)

---

**最后更新**: 2026-05-02  
**维护者**: @kp-user


```

---

#### 1.1.1.1 Memory 系统示例

**说明**: Memory 系统用于存储 Agent 的长期记忆、知识库和工作日志。

**示例 1: 记忆索引 `memory/MEMORY.md`**

```markdown
# Alice - 记忆索引

## 当前上下文
- 正在进行: Cove 系统架构设计 v3
- 最近任务: 跨层一致性验证（Task #3）
- 待办事项: P1 问题修复

## 知识库索引
- [架构模式](knowledge/architecture-patterns.md) - 系统架构设计模式和最佳实践
- [技术选型](knowledge/tech-stack.md) - 技术栈选型决策记录
- [代码规范](knowledge/coding-standards.md) - 团队代码规范和风格指南

## 工作日志
- [2026-05-04](diary/2026-05-04.md) - 完成跨层一致性验证
- [2026-05-03](diary/2026-05-03.md) - Dual-Write Infrastructure 设计
- [2026-05-02](diary/2026-05-02.md) - Entity Layer 架构设计

## 错误记录
见 `errors.jsonl` - 包含所有错误和解决方案的结构化日志
```

**示例 2: 知识库 `memory/knowledge/architecture-patterns.md`**

```markdown
# 架构模式

## 分层架构（Layered Architecture）

**定义**: 将系统划分为多个层次，每层只依赖下层，不依赖上层。

**Cove 系统应用**:
- Entity Layer: 领域模型和数据结构
- Service Layer: 业务逻辑和服务编排
- API Layer: 接口定义和协议转换
- Runtime Layer: 运行时管理和资源调度

**优点**:
- 高内聚低耦合
- 易于测试和维护
- 清晰的依赖关系

**注意事项**:
- 避免跨层调用
- 每层职责单一
- 接口设计要稳定
```

**示例 3: 工作日志 `memory/diary/2026-05-04.md`**

```markdown
# 2026-05-04 工作日志

## 完成的工作

### Task #3: 跨层一致性验证
- 参与架构文档 review
- 验证 Entity Layer 与其他层的一致性
- 发现 5 个 [Review] 标记需要处理

**关键发现**:
- 配置继承机制需要明确说明
- Memory 和 Workspace 需要提供示例
- MessageEntity 的 sender_avatar 字段存在数据冗余

**决策**:
- 采用 YAML frontmatter + Markdown 正文格式
- 外部 Agent 同步时创建副本而非引用
- 移除 MessageEntity 的 sender_avatar 字段

## 学到的经验

1. **API 友好设计**: 配置文件不仅给人看，更要方便 API 调用
2. **数据独立性**: 外部系统同步时应创建副本，避免数据污染
3. **避免冗余**: 关联数据应通过引用而非复制

## 明天计划

- 完成 Entity Layer 文档修改
- 协助处理 P1 问题
```

---

#### 1.1.1.2 Workspace 示例

**说明**: Workspace 用于存储 Agent 的工作文件、子任务和临时数据。

**示例 1: 子任务工作区 `workspace/subtask/task-001/`**

```
workspace/subtask/task-001/
├── README.md              # 任务说明
├── plan.md                # 实施计划
├── code/                  # 代码文件
│   ├── entity.py
│   └── service.py
├── tests/                 # 测试文件
│   └── test_entity.py
└── artifacts/             # 产出物
    ├── design.png
    └── report.md
```

**task-001/README.md 示例**:
```markdown
# Task #001: Entity Layer 设计

**状态**: In Progress
**负责人**: Alice
**开始时间**: 2026-05-02
**预计完成**: 2026-05-04

## 任务目标
设计 Cove 系统的 Entity Layer，包含所有领域模型定义。

## 工作内容
1. ✅ 定义 AgentEntity 结构
2. ✅ 定义 MessageEntity 结构
3. 🔄 添加配置继承机制说明
4. ⏳ 添加 Memory 和 Workspace 示例
```

**示例 2: 对话上下文 `workspace/conversation/conv-001.jsonl`**

```jsonl
{"role": "user", "content": "请设计 Entity Layer", "timestamp": "2026-05-02T10:00:00Z"}
{"role": "assistant", "content": "我会设计包含 AgentEntity、MessageEntity 等核心实体的 Entity Layer", "timestamp": "2026-05-02T10:01:00Z"}
{"role": "user", "content": "需要支持配置继承", "timestamp": "2026-05-02T10:05:00Z"}
{"role": "assistant", "content": "好的，我会添加配置继承机制说明", "timestamp": "2026-05-02T10:06:00Z"}
```

**示例 3: 临时文件 `workspace/temp/`**

```
workspace/temp/
├── draft-entity-design.md     # 草稿文件
├── review-notes.txt           # Review 笔记
└── cache/                     # 缓存数据
    └── api-response.json
```

**说明**:
- `subtask/`: 每个子任务有独立的工作目录，包含代码、测试、文档
- `conversation/`: 对话上下文以 JSONL 格式存储，便于恢复和分析
- `temp/`: 临时文件和缓存，可定期清理

---

#### 1.1.1.3 错误日志示例：`memory/errors.jsonl`

**说明**: 错误日志以 JSONL 格式存储，每行一个 JSON 对象，记录 Agent 执行过程中遇到的错误和解决方案。

**示例文件**: `memory/errors.jsonl`

```jsonl
{"timestamp":"2026-05-02T10:15:30Z","error_id":"err-001","error_type":"ToolError","tool_name":"Read","error_message":"文件不存在: /path/to/missing-file.md","severity":"warning","context":{"task_id":"task-001","execution_id":"exec-001","file_path":"/path/to/missing-file.md"},"resolved":true,"resolution":"创建了缺失的文件","resolved_at":"2026-05-02T10:16:00Z"}
{"timestamp":"2026-05-02T11:20:15Z","error_id":"err-002","error_type":"APIError","tool_name":"Agent","error_message":"API rate limit exceeded","severity":"error","context":{"task_id":"task-002","execution_id":"exec-002","api_endpoint":"https://api.anthropic.com/v1/messages","status_code":429},"resolved":true,"resolution":"等待 60 秒后重试成功","resolved_at":"2026-05-02T11:21:30Z"}
{"timestamp":"2026-05-03T09:45:00Z","error_id":"err-003","error_type":"ValidationError","tool_name":"Write","error_message":"YAML 格式错误: 缩进不正确","severity":"warning","context":{"task_id":"task-003","execution_id":"exec-003","file_path":"config/runtime.yaml","line":15},"resolved":true,"resolution":"修正了 YAML 缩进","resolved_at":"2026-05-03T09:46:00Z"}
```

**字段说明**:
- `timestamp`: 错误发生时间（ISO 8601 格式）
- `error_id`: 错误唯一标识
- `error_type`: 错误类型（ToolError、APIError、ValidationError、PermissionError、TimeoutError 等）
- `tool_name`: 触发错误的工具名称
- `error_message`: 错误消息
- `severity`: 严重程度（info、warning、error、critical）
- `context`: 错误上下文（task_id、execution_id、相关参数等）
- `resolved`: 是否已解决
- `resolution`: 解决方案描述
- `resolved_at`: 解决时间

**完整示例**: 见 `../errors.jsonl`

---

#### 1.1.2 运行时配置：`runtime.yaml`

**说明**: 包含 Model、Context、Retry、API 配置，支持继承默认配置

```yaml
# agents/agent-001/runtime.yaml
# AgentEntity 运行时配置文件

# 模型配置（Model）
model:
  provider: "anthropic"                  # 提供商: anthropic | openai | custom
  model_name: "claude-opus-4.5"          # 模型名称
  temperature: 0.7                       # 温度参数
  max_tokens: 8192                       # 最大 token 数
  top_p: 0.9                            # Top-p 采样
  thinking_budget: 10000                 # 思考预算（Extended Thinking）

# API 配置（支持不同 Agent 使用不同 API）
api:
  base_url: "https://api.anthropic.com/v1"               # API 基础 URL
  api_key: "${ANTHROPIC_API_KEY}"                        # API Key（环境变量）
  timeout_seconds: 300                                   # 请求超时（秒）
  headers:                                               # 自定义请求头
    "anthropic-version": "2023-06-01"
    "x-custom-header": "value"
  inherit_default: true                                  # 是否继承默认配置

# 上下文配置（Context）
context:
  max_context_window: 200000             # 最大上下文窗口
  context_retention: "auto"              # 上下文保留策略: auto | manual | none
  compression_threshold: 0.8             # 压缩阈值（80% 时触发）
  compression_strategy: "structured"     # 压缩策略: structured | summary | hybrid

# 重试配置（Retry）
retry:
  max_retries: 3                         # 最大重试次数
  backoff_strategy: "exponential"        # 退避策略: none | linear | exponential
  initial_delay_ms: 1000                 # 初始延迟（毫秒）
  max_delay_ms: 30000                    # 最大延迟（毫秒）
  retry_on_errors:                       # 重试的错误类型
    - "rate_limit_error"
    - "timeout_error"
    - "server_error"

# 速率限制（Rate Limit）
rate_limit:
  requests_per_minute: 60                # 每分钟最大请求数
  tokens_per_minute: 200000              # 每分钟最大 token 数
  concurrent_requests: 5                 # 最大并发请求数

# 缓存配置（Cache）
cache:
  enabled: true                          # 是否启用缓存
  cache_type: "prompt_caching"           # 缓存类型: prompt_caching | response_caching
  ttl_seconds: 3600                      # 缓存过期时间（秒）
```

---

#### 1.1.3 角色配置：`persona.yaml`（简化版）

**说明**: 简化的角色配置，保留核心功能，为语音和虚拟形象预留扩展空间

```yaml
# agents/agent-001/persona.yaml
# AgentEntity 角色配置文件（简化版）

# 基础角色信息
persona:
  name: "Alice"                          # 角色名称
  title: "架构师"                         # 角色头衔
  description: "经验丰富的软件架构师"      # 简短描述
  backstory: |                           # 背景故事（可选）
    Alice 拥有 8 年全栈开发经验，擅长设计高可用分布式系统。
    热爱学习新技术，善于通过代码审查帮助团队成长。

# 外形配置（Appearance）- 为虚拟形象预留
appearance:
  avatar: "avatars/alice.png"            # 2D 头像
  avatar_3d: "avatars/alice.glb"         # 3D 模型（可选，GLB 格式）
  style: "professional"                  # 风格: casual | professional | creative

# 语音配置（Voice）- 为语音交互预留
voice:
  enabled: false                         # 是否启用语音
  voice_id: "voice-alice-001"            # 语音 ID
  provider: "elevenlabs"                 # 提供商: elevenlabs | azure | google
  language: "zh-CN"                      # 语言
  tone: "professional"                   # 语气: professional | friendly | casual

# 语言风格（Language Style）
language_style:
  formality: "professional"              # 正式程度: casual | professional | formal
  verbosity: "concise"                   # 冗长程度: concise | moderate | verbose
  technical_level: "expert"              # 技术水平: beginner | intermediate | expert
  preferred_language: "zh-CN"            # 首选语言

# 性格特征（Personality）- 简化为核心特质
personality:
  traits:                                # 核心特质（可选）
    - "注重质量"
    - "善于协作"
    - "持续学习"
  strengths:                             # 优势领域
    - "系统架构设计"
    - "技术选型"
    - "代码审查"
```

---

#### 1.1.4 权限配置：`permissions.yaml`

```yaml
# agents/agent-001/permissions.yaml
# AgentEntity 权限配置文件

# 文件访问权限
file_access:
  read: ["**/*"]                         # 可读文件路径（glob 模式）
  write: ["src/**/*", "docs/**/*"]       # 可写文件路径
  execute: ["scripts/**/*.sh"]           # 可执行脚本
  forbidden:                             # 禁止访问的路径
    - ".env"
    - "secrets/**/*"
    - "*.key"

# 网络访问权限
network_access:
  allowed_domains:                       # 允许访问的域名
    - "github.com"
    - "api.anthropic.com"
    - "*.example.com"
  forbidden_domains:                     # 禁止访问的域名
    - "malicious-site.com"
  allowed_ports: [80, 443, 8080]         # 允许访问的端口

# 系统访问权限
system_access:
  allowed_commands:                      # 允许执行的命令
    - "git"
    - "npm"
    - "python"
    - "docker"
  forbidden_commands:                    # 禁止执行的命令
    - "rm -rf /"
    - "sudo"
    - "chmod 777"
  max_process_count: 10                  # 最大进程数
  max_memory_mb: 2048                    # 最大内存使用（MB）
  max_cpu_percent: 50                    # 最大 CPU 使用率（%）

# 数据访问权限
data_access:
  allowed_databases:                     # 允许访问的数据库
    - "postgres://localhost/dev_db"
  allowed_tables:                        # 允许访问的表
    - "users"
    - "projects"
    - "tasks"
  forbidden_operations:                  # 禁止的操作
    - "DROP TABLE"
    - "TRUNCATE"
  read_only: false                       # 是否只读

# Agent 交互权限
agent_interaction:
  can_spawn_subagents: true              # 是否可以创建子 Agent
  max_subagents: 5                       # 最大子 Agent 数量
  can_send_messages: true                # 是否可以发送消息
  can_create_tasks: true                 # 是否可以创建任务
  can_assign_tasks: true                 # 是否可以分配任务
  allowed_channels:                      # 允许访问的频道
    - "#general"
    - "#dev"
    - "#architecture"
```

---

