# V4 架构文档

> **版本**: v4.0  
> **日期**: 2026-05-08  
> **维护者**: @Alice

---

## 目录结构

```
docs/v4/architecture/
├── README.md              # 主索引 + AI 查询入口
├── research/              # 整体架构调研报告
├── backend/               # 后端架构文档
│   ├── 01-domain/
│   │   ├── models/        # 领域模型（实体定义）
│   │   ├── services/      # 领域服务（跨实体业务规则）
│   │   └── research/      # 领域层调研报告
│   ├── 02-application/
│   │   ├── runtime/       # 运行时组件（生命周期管理）
│   │   ├── services/      # 应用服务（业务流程编排）
│   │   └── research/      # 应用层调研报告
│   └── 03-infrastructure/
│       ├── api/           # REST API 端点实现
│       ├── auth/          # 认证授权
│       ├── cli/           # CLI 客户端
│       ├── database/      # 数据持久化（Repository 实现）
│       ├── websocket/     # WebSocket 实时通信
│       └── research/      # 基础设施层调研报告
└── frontend/              # 前端架构文档
    └── 04-presentation/
        └── research/      # 表现层调研报告
```

**调研报告命名规范**: `YYYYMMDD-<topic>.md`，格式见各层 `research/RESEARCH-FORMAT.md`

---

## 🏗️ 架构分层说明

| 层 | 目录 | 职责 |
|----|------|------|
| **Domain Layer** | `backend/01-domain/` | **核心业务逻辑**：实体定义、值对象、领域服务（跨实体业务规则、验证逻辑） |
| **Application Layer** | `backend/02-application/` | **业务流程编排**：应用服务（用例实现、业务流程）、运行时组件（生命周期管理、调度） |
| **Infrastructure Layer** | `backend/03-infrastructure/` | **技术实现**：API 端点、认证授权、CLI 客户端、数据库访问、WebSocket、外部服务集成 |
| **Presentation Layer** | `frontend/04-presentation/` | **用户界面**：Web UI、组件、状态管理、用户交互 |

**依赖方向**：
```
frontend/04-presentation → backend/03-infrastructure → backend/02-application → backend/01-domain
```

**关键原则**：
- **Domain Layer** 不依赖任何其他层，是纯业务逻辑
- **Application Layer** 只依赖 Domain Layer，编排业务流程
- **Infrastructure Layer** 实现技术细节，调用 Application Layer 的服务
- **Presentation Layer** 通过 Infrastructure Layer 的 API 与后端交互

---

## 🤖 AI 查询指南

**查询流程**：
1. 搜索下方索引中的关键词，定位相关文档
2. 读取目标文档的 header（前 50-100 行），确认相关性
3. 深入阅读具体章节

### 文档索引

| 文档 | 关键词 | 适用场景 |
|------|--------|---------|
| [backend/01-domain/models/README.md](./backend/01-domain/models/README.md) | AgentEntity, ChannelEntity, MessageEntity, TaskEntity, OKREntity, WorkflowEntity, ExecutionEntity, ProjectEntity, UserEntity, DeviceEntity | 实体定义、数据模型、配置格式 |
| [backend/01-domain/services/README.md](./backend/01-domain/services/README.md) | 领域服务, 业务规则, 验证逻辑, 跨实体操作 | 领域层业务逻辑、验证规则、跨实体业务规则 |
| [backend/02-application/runtime/design/runtime-layer.md](./backend/02-application/runtime/design/runtime-layer.md) | AgentDaemon, ChannelRuntime, WorkflowRuntime, ExecutionRuntime, 生命周期管理, 消息队列, 触发器, 插件系统, 并发控制, 崩溃恢复, Memory管理, OpenClaw, Skills System, State Export/Import | Agent 启动/运行/停止流程、消息路由、故障恢复、OpenClaw 集成 |
| [backend/02-application/services/README.md](./backend/02-application/services/README.md) | 应用服务, 用例实现, 业务流程编排, 事务管理 | 应用层业务流程、用例实现、服务编排 |
| [backend/03-infrastructure/04-backend-api.md](./backend/03-infrastructure/04-backend-api.md) | REST API, WebSocket, JWT, OAuth2, RBAC, SAGA, API Gateway, 限流, 熔断, 数据迁移, 飞书, Webhook, Plugin, Trigger | API 接口设计、认证授权、事务管理、飞书集成 |
| [backend/03-infrastructure/cli/design/cli-architecture.md](./backend/03-infrastructure/cli/design/cli-architecture.md) | CLI, 命令行工具, slock, 客户端, message, task, channel, profile, reminder, attachment | CLI 架构设计、命令行工具使用、客户端实现 |
| [backend/03-infrastructure/cli/commands/README.md](./backend/03-infrastructure/cli/commands/README.md) | CLI 命令, message send, task claim, task update, server info | CLI 命令参考、使用示例 |
| [frontend/04-presentation/frontend-layer.md](./frontend/04-presentation/frontend-layer.md) | React, TypeScript, Zustand, React Query, 虚拟滚动, Chat组件, Task卡片, AgentBar | 页面组件设计、状态管理、性能优化 |

### 按实体快速查询

| 实体 | 定义文档 | Application | API |
|------|---------|-------------|-----|
| Agent | [backend/01-domain/models/agent/agent-entity.md](./backend/01-domain/models/agent/agent-entity.md) | backend/02-application §2.1 | backend/03-infrastructure §3.5 |
| Channel | [backend/01-domain/models/channel/channel-entity.md](./backend/01-domain/models/channel/channel-entity.md) | backend/02-application §2.2 | backend/03-infrastructure §3.2 |
| Message | [backend/01-domain/models/message/message-entity.md](./backend/01-domain/models/message/message-entity.md) | backend/02-application §2.4 | backend/03-infrastructure §3.3 |
| Task | [backend/01-domain/models/task/task-entity.md](./backend/01-domain/models/task/task-entity.md) | - | backend/03-infrastructure §3.4 |
| OKR | [backend/01-domain/models/okr/okr-entity.md](./backend/01-domain/models/okr/okr-entity.md) | - | - |
| Workflow | [backend/01-domain/models/workflow/workflow-entity.md](./backend/01-domain/models/workflow/workflow-entity.md) | backend/02-application §2.6 | backend/03-infrastructure §3.9 |
| Execution | [backend/01-domain/models/execution/execution-entity.md](./backend/01-domain/models/execution/execution-entity.md) | backend/02-application §2.7 | backend/03-infrastructure §3.6 |
| Project | [backend/01-domain/models/project/project-entity.md](./backend/01-domain/models/project/project-entity.md) | - | - |
| User | [backend/01-domain/models/user/user-entity.md](./backend/01-domain/models/user/user-entity.md) | - | backend/03-infrastructure §3.1 |
| Device | [backend/01-domain/models/device/device-entity.md](./backend/01-domain/models/device/device-entity.md) | - | - |

---

**最后更新**: 2026-05-08 | **团队**: #cove-refactor
