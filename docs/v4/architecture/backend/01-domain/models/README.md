# Domain Layer (领域层)

> **版本**: v4.0  
> **日期**: 2026-05-07  
> **关键词**: `AgentEntity`, `ChannelEntity`, `MessageEntity`, `TaskEntity`, `OKREntity`, `WorkflowEntity`, `ExecutionEntity`, `ProjectEntity`, `UserEntity`, `DeviceEntity`, `ServerEntity`, `MemberEntity`, `ConversationEntity`, `YAML配置`, `文件结构`, `数据模型`, `实体关联`, `配置继承`

**本文档包含**:
- 14 个核心实体类型的概览和设计原则
- 实体之间的关联关系和引用机制
- 配置继承机制和默认值策略
- 外部 Agent 兼容性方案（多种 Agent Runtime）

**适用场景**:
- 快速了解系统的实体架构和设计原则
- 理解实体之间的关联关系
- 查找特定实体的详细文档链接

**详细文档**:
- 每个实体的完整数据结构定义见各实体子目录（如 `agent/`, `project/` 等）
- 每个实体的配置示例见各实体的 `examples/` 子目录

**相关文档**:
- [Application Layer](../../02-application/runtime/design/runtime-layer.md) - 实体的运行时状态管理
- [Backend API](../../03-infrastructure/04-backend-api.md) - 实体的 CRUD API 接口

---

## 一、Domain Layer 概述

Domain Layer（领域层）定义了系统中所有核心领域模型的数据结构、配置格式和关联关系。领域层是系统的数据基础，所有上层服务都基于这些实体进行操作。

### 设计原则

1. **单一职责**：每个实体只负责一个领域概念的数据定义
2. **配置分离**：将配置拆分为多个文件，便于管理和扩展
3. **格式选择**：
   - **YAML** 用于结构化配置（适合机器读取、验证、序列化）
   - **Markdown** 用于文档和知识（适合人类阅读、编辑、版本控制）
4. **避免冗余**：关联数据通过引用而非复制，保持数据一致性
5. **配置继承**：支持默认配置继承，减少重复配置
6. **外部兼容**：兼容 Runtime Framework、Agent Runtime 等外部 Agent 框架

### 核心实体列表

| 实体 | 说明 | 详细文档 |
|------|------|----------|
| **AgentEntity** | AI 智能体，执行任务的核心单元 | [agent/agent-entity.md](./agent/agent-entity.md) |
| **ProjectEntity** | 项目，组织 Agent、Channel、OKR 的容器 | [project/project-entity.md](./project/project-entity.md) |
| **UserEntity** | 用户，人类参与者 | [user/user-entity.md](./user/user-entity.md) |
| **ChannelEntity** | 频道，消息和任务的组织单元 | [channel/channel-entity.md](./channel/channel-entity.md) |
| **MessageEntity** | 消息，通信的基本单元 | [message/message-entity.md](./message/message-entity.md) |
| **TaskEntity** | 任务，工作的基本单元 | [task/task-entity.md](./task/task-entity.md) |
| **OKREntity** | 目标与关键结果，项目级目标管理 | [okr/okr-entity.md](./okr/okr-entity.md) |
| **WorkflowEntity** | 工作流，任务编排和自动化 | [workflow/workflow-entity.md](./workflow/workflow-entity.md) |
| **ExecutionEntity** | 执行记录，Agent 执行任务的日志 | [execution/execution-entity.md](./execution/execution-entity.md) |
| **DeviceEntity** | 设备，运行 Agent 的计算设备 | [device/device-entity.md](./device/device-entity.md) |
| **ServerEntity** | 服务器，运行 Agent 的后端服务器 | [server/server-entity.md](./server/server-entity.md) |
| **MemberEntity** | 成员关系，User/Agent 与 Channel 的关系 | [member/member-entity.md](./member/member-entity.md) |
| **ConversationEntity** | 对话上下文，Agent 的多轮对话管理 | [conversation/conversation-entity.md](./conversation/conversation-entity.md) |

### 辅助实体列表

| 实体 | 说明 | 详细文档 |
|------|------|----------|
| **AttachmentEntity** | 附件，消息中的文件和图片 | [attachment/attachment-entity.md](./attachment/attachment-entity.md) |
| **ReactionEntity** | 反应，消息的 Emoji 互动 | [reaction/reaction-entity.md](./reaction/reaction-entity.md) |
| **ThreadEntity** | 线程，消息的子对话 | [thread/thread-entity.md](./thread/thread-entity.md) |

---

## 二、实体关联关系

### 2.1 核心关联图

```
ProjectEntity (项目)
├── OKREntity (目标)
│   └── WorkflowEntity (工作流)
│       └── TaskEntity (任务)
│           └── ExecutionEntity (执行记录)
├── ChannelEntity (频道)
│   ├── MemberEntity (成员关系)
│   ├── MessageEntity (消息)
│   ├── TaskEntity (任务)
│   └── AgentEntity (Agent 池)
├── AgentEntity (项目专属 Agent)
│   └── ConversationEntity (对话上下文)
└── UserEntity (项目成员)

UserEntity (用户)
├── DeviceEntity (设备)
└── AgentEntity (用户创建的 Agent)

ServerEntity (服务器)
└── AgentEntity (运行在服务器上的 Agent)
```

### 2.2 关联关系说明

#### 项目层级关系
- **Project → OKR**: 一个项目包含多个 OKR（按季度组织）
- **OKR → Workflow**: 一个 Key Result 可以关联多个 Workflow
- **Workflow → Task**: 一个 Workflow 通过 Step 引用多个 Task
- **Task → Task**: Task 通过 depends_on 表达数据依赖关系
- **Task → Execution**: 一个 Task 可以有多次执行记录

#### 通信层级关系
- **Project → Channel**: 一个项目包含多个频道
- **Channel → Member**: 一个频道包含多个成员关系
- **Channel → Message**: 一个频道包含多条消息
- **Channel → Task**: 一个频道可以管理多个任务
- **Channel → Agent Pool**: 一个频道可以访问多个 Agent

#### 用户和 Agent 关系
- **User → Agent**: 用户可以创建和管理多个 Agent
- **User → Device**: 用户可以通过多个设备访问系统
- **Agent → Task**: Agent 可以被分配多个任务
- **Agent → Execution**: Agent 执行任务产生执行记录
- **Agent → Conversation**: Agent 管理多个并发对话

#### 服务器和设备关系
- **Server → Agent**: 一个服务器可以运行多个 Agent
- **Device → Server**: 一个设备可以运行多个 Server 实例

#### 引用机制
- **通过 ID 引用**：实体之间通过唯一 ID 建立关联（如 `agent_id`, `task_id`）
- **避免数据冗余**：不复制关联实体的数据，通过 ID 查询获取最新数据
- **示例**：MessageEntity 不存储 `sender_avatar`，而是通过 `sender_id` 引用 UserEntity/AgentEntity 获取最新头像

---

## 二-B、Aggregate Root 边界（DDD）

### 定义

Aggregate Root 是一致性边界的入口，负责维护内部所有实体的业务不变量。跨 Aggregate 只能通过 ID 引用，不能直接持有对象。

### Aggregate 划分

| Aggregate Root | 内部实体/Value Object | 说明 |
|---------------|----------------------|------|
| **AgentEntity** | memory_config（VO）, config_files（VO） | Agent 是独立的执行单元 |
| **ProjectEntity** | 无（通过 ID 关联 Channel、OKR、Agent） | 项目是顶层容器 |
| **ChannelEntity** | ThreadEntity（内部）, ReactionEntity（VO） | 频道管理消息和线程 |
| **MessageEntity** | AttachmentEntity（内部）, ReactionEntity（VO） | 消息是通信基本单元 |
| **TaskEntity** | 无（通过 ID 关联 Execution、Workflow） | 任务是独立工作单元 |
| **OKREntity** | KeyResult（内部 Entity，通过 kr_id 区分） | OKR 管理目标和关键结果 |
| **WorkflowEntity** | Step（Value Object，通过 id 在 Workflow 内标识） | 工作流管理任务编排 |
| **ExecutionEntity** | 无（日志是追加写入的记录） | 执行记录是不可变日志 |
| **UserEntity** | 无（通过 ID 关联 Device、Agent） | 用户是独立身份 |
| **DeviceEntity** | 无 | 设备是独立计算资源 |
| **ServerEntity** | 无（通过 ID 关联 Agent） | 服务器是独立基础设施 |
| **MemberEntity** | 无（通过 ID 关联 Channel、User/Agent） | 成员关系是独立实体 |
| **ConversationEntity** | 无（通过 ID 关联 Agent、Channel、Message） | 对话上下文是独立实体 |

### Value Object 定义

以下结构在多个实体中复用，定义为 Value Object（无独立 ID，通过值区分）：

```yaml
# OwnerRef（负责人引用）- 用于 OKREntity、TaskEntity 等
owner:
  id: "user-001"
  type: "human"   # human | agent

# AssigneeRef（分配对象引用）- 用于 TaskEntity
assignee:
  id: "agent-001"
  type: "agent"
  assigned_at: "2026-05-02T10:00:00Z"

# ActorRef（操作者引用）- 用于 created_by、updated_by
created_by:
  id: "user-001"
  type: "human"
```

### 业务不变量（Invariants）

| 实体 | 不变量 |
|------|--------|
| TaskEntity | 状态只能按 `todo → in_progress → in_review → done` 流转，不能跳步或回退（除非明确允许） |
| OKREntity | `current_value` 不能超过 `target_value`（percent/count 类型） |
| AgentEntity | `status: active` 时必须有 `framework` 配置 |
| ChannelEntity | DM 类型的频道成员数固定为 2 |
| ExecutionEntity | 执行记录创建后不可修改（追加写入） |
| MemberEntity | 同一个 User/Agent 在同一个 Channel 中只能有一个 Member 记录 |
| ConversationEntity | 同一个 Agent 在同一个 Channel/User 中同时只能有一个 active 对话 |

---

## 三、配置继承机制

### 3.1 继承原则

**默认配置位置**：`config/defaults/agent_defaults.yaml`

**继承优先级**：
```
Agent 配置 > 项目默认配置 > 系统默认配置
```

**可继承字段**：
- `runtime`: 运行时配置（Model、API、Context、Retry）
- `persona`: 角色配置（语音、外形、性格）
- `permissions`: 权限配置（文件、网络、系统访问）

**必须配置字段**：
- `agent_id`: Agent 唯一标识
- `name`: Agent 名称
- `framework`: Agent 框架（runtime_framework | runtime | custom）

### 3.2 继承示例

**系统默认配置** (`config/defaults/agent_defaults.yaml`):
```yaml
runtime:
  model:
    provider: "anthropic"
    model_name: "claude-opus-4.5"
    temperature: 0.7
  context:
    max_context_window: 200000
    auto_compact: true
```

**Agent 配置** (`agents/agent-001/runtime.yaml`):
```yaml
# 只覆盖需要修改的字段
runtime:
  model:
    temperature: 0.9  # 覆盖默认值
  # context 配置继承默认值
```

**最终生效配置**：
```yaml
runtime:
  model:
    provider: "anthropic"        # 继承
    model_name: "claude-opus-4.5"  # 继承
    temperature: 0.9             # 覆盖
  context:
    max_context_window: 200000   # 继承
    auto_compact: true           # 继承
```

---

## 四、外部 Agent 兼容性

### 4.1 兼容框架

- **Runtime Framework**: Anthropic 官方 Agent 框架
- **Agent Runtime**: 开源 Agent 框架
- **Custom**: 自定义 Agent 实现

### 4.2 同步策略

**同步方向**：单向同步（外部 → Cove）

**同步方式**：
1. 用户点击"同步"按钮
2. 系统读取外部 Agent 配置
3. 创建 Cove Agent 副本（而非引用）
4. 映射配置到 Cove 格式

**映射规则**：
- Runtime Framework `agent.md` → Cove `agent.md` + `runtime.yaml`
- Agent Runtime agent config → Cove `agent.md` + `runtime.yaml`

**数据独立性**：
- 外部修改不影响 Cove 系统
- Cove 修改不影响外部系统
- 需要同步时手动触发

### 4.3 同步示例

**Runtime Framework Agent** (`external/claude-code/agents/alice/agent.md`):
```markdown
---
name: "Alice"
model: "claude-opus-4.5"
temperature: 0.7
---

# Alice - 架构师

Alice 是一位经验丰富的架构师...
```

**同步后的 Cove Agent**:
- `agents/agent-001/agent.md`: 复制完整内容
- `agents/agent-001/runtime.yaml`: 提取 model、temperature 等配置
- `agents/agent-001/memory/`: 自动创建
- `agents/agent-001/workspace/`: 自动创建

---

## 五、实体详细文档

每个实体的完整数据结构定义、字段说明、配置示例见以下文档：

### 5.1 核心实体

- **[AgentEntity](./agent/agent-entity.md)**: AI 智能体的完整定义
  - 多文件分离架构（agent.md, runtime.yaml, persona.yaml, permissions.yaml）
  - Memory 系统（MEMORY.md, knowledge/, diary/, errors.jsonl）
  - Workspace 系统（subtask/, conversation/, temp/）
  - 配置继承和外部兼容性
  - 配置示例：[agent/examples/](./agent/examples/)

- **[ProjectEntity](./project/project-entity.md)**: 项目的完整定义
  - 项目基础信息和路径配置
  - 关联的 Channel、Agent、OKR
  - 技术栈和项目配置
  - 项目状态和健康度
  - 配置示例：[project/examples/](./project/examples/)

- **[UserEntity](./user/user-entity.md)**: 用户的完整定义
  - 用户基础信息和权限
  - Memory 系统（偏好、历史、书签）
  - Workspace 和通知配置
  - 配置示例：[user/examples/](./user/examples/)

### 5.2 通信实体

- **[ChannelEntity](./channel/channel-entity.md)**: 频道的完整定义
  - 频道类型和成员管理
  - Agent 池、任务池、对话池
  - 通信规则和工作区
  - 配置示例：[channel/examples/](./channel/examples/)

- **[MessageEntity](./message/message-entity.md)**: 消息的完整定义
  - 消息内容和格式
  - 附件、@mention、引用
  - 反应和互动
  - 配置示例：[message/examples/](./message/examples/)

### 5.3 任务和目标实体

- **[TaskEntity](./task/task-entity.md)**: 任务的完整定义
  - 任务类型和状态
  - 分配信息和依赖关系
  - 运行配置和计划
  - 配置示例：[task/examples/](./task/examples/)

- **[OKREntity](./okr/okr-entity.md)**: OKR 的完整定义
  - 目标和关键结果
  - 进度跟踪
  - 关联的 Workflow 和 Task
  - 配置示例：[okr/examples/](./okr/examples/)

- **[WorkflowEntity](./workflow/workflow-entity.md)**: 工作流的完整定义
  - 工作流类型和节点
  - 边和条件
  - 触发器和执行历史
  - 配置示例：[workflow/examples/](./workflow/examples/)

### 5.4 执行和设备实体

- **[ExecutionEntity](./execution/execution-entity.md)**: 执行记录的完整定义
  - 执行日志（JSONL 格式）
  - Token 使用和成本统计
  - 文件修改记录
  - 配置示例：[execution/examples/](./execution/examples/)

- **[DeviceEntity](./device/device-entity.md)**: 设备的完整定义
  - 设备类型和信息
  - 会话管理
  - 安全配置
  - 配置示例：[device/examples/](./device/examples/)

- **[ServerEntity](./server/server-entity.md)**: 服务器的完整定义
  - 服务器类型和资源配置
  - 网络和安全配置
  - 容量限制和状态管理
  - 配置示例：[server/examples/](./server/examples/)

- **[MemberEntity](./member/member-entity.md)**: 成员关系的完整定义
  - 成员角色和权限
  - 成员状态和在线状态
  - 通知设置和统计信息
  - 配置示例：[member/examples/](./member/examples/)

- **[ConversationEntity](./conversation/conversation-entity.md)**: 对话上下文的完整定义
  - 对话类型和状态
  - 上下文管理和压缩
  - 消息统计和执行记录
  - 配置示例：[conversation/examples/](./conversation/examples/)

---

## 六、通用配置文档

Agent 专属配置文档（位于 `agent/` 目录下）：
- **[agent/config-directory.md](./agent/config-directory.md)**: Agent 配置目录结构说明
- **[agent/errors-jsonl.md](./agent/errors-jsonl.md)**: 错误日志格式说明（示例见 `agent/examples/agent-001/memory/errors.jsonl`）

---

## 七、最佳实践

### 7.1 配置管理

1. **使用配置继承**：避免重复配置，只覆盖需要修改的字段
2. **分离关注点**：将不同类型的配置拆分到不同文件
3. **版本控制**：所有配置文件纳入 Git 管理
4. **文档同步**：修改配置时同步更新相关文档

### 7.2 数据关联

1. **通过 ID 引用**：使用唯一 ID 建立实体关联
2. **避免冗余**：不复制关联实体的数据
3. **保持一致性**：修改实体时自动更新所有引用
4. **级联删除**：删除实体时处理所有关联关系

### 7.3 扩展性

1. **预留扩展字段**：使用 `meta` 字段存储扩展数据
2. **向后兼容**：新增字段时保持旧版本兼容
3. **版本标识**：在配置文件中标注版本号
4. **迁移脚本**：提供配置升级脚本

---

**最后更新**: 2026-05-05  
**维护者**: @kp-user
