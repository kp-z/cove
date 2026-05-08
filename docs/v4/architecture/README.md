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
├── 01-domain/
│   ├── models/            # 领域模型（实体定义）
│   └── research/          # 领域层调研报告
├── 02-application/
│   ├── runtime/           # 运行时组件（生命周期管理）
│   └── research/          # 应用层调研报告
├── 03-infrastructure/
│   └── research/          # 基础设施层调研报告
└── 04-presentation/
    └── research/          # 表现层调研报告
```

**调研报告命名规范**: `YYYYMMDD-<topic>.md`，格式见各层 `research/RESEARCH-FORMAT.md`

---

## 🏗️ 架构分层说明

| 层 | 目录 | 职责 |
|----|------|------|
| **Domain Layer** | `01-domain/` | 领域模型定义（实体、值对象、业务规则） |
| **Application Layer** | `02-application/` | 应用逻辑编排（运行时管理、生命周期、调度） |
| **Infrastructure Layer** | `03-infrastructure/` | 技术基础设施（API、数据库、外部服务） |
| **Presentation Layer** | `04-presentation/` | 用户界面（Web UI、组件、状态管理） |

**依赖方向**：
```
04-presentation → 03-infrastructure → 02-application → 01-domain
```

---

## 🤖 AI 查询指南

**查询流程**：
1. 搜索下方索引中的关键词，定位相关文档
2. 读取目标文档的 header（前 50-100 行），确认相关性
3. 深入阅读具体章节

### 文档索引

| 文档 | 关键词 | 适用场景 |
|------|--------|---------|
| [01-domain/models/README.md](./01-domain/models/README.md) | AgentEntity, ChannelEntity, MessageEntity, TaskEntity, OKREntity, WorkflowEntity, ExecutionEntity, ProjectEntity, UserEntity, DeviceEntity | 实体定义、数据模型、配置格式 |
| [02-application/runtime/design/runtime-layer.md](./02-application/runtime/design/runtime-layer.md) | AgentDaemon, ChannelRuntime, WorkflowRuntime, ExecutionRuntime, 生命周期管理, 消息队列, 触发器, 插件系统, 并发控制, 崩溃恢复, Memory管理, OpenClaw, Skills System, State Export/Import | Agent 启动/运行/停止流程、消息路由、故障恢复、OpenClaw 集成 |
| [03-infrastructure/04-backend-api.md](./03-infrastructure/04-backend-api.md) | REST API, WebSocket, JWT, OAuth2, RBAC, SAGA, API Gateway, 限流, 熔断, 数据迁移, 飞书, Webhook, Plugin, Trigger | API 接口设计、认证授权、事务管理、飞书集成 |
| [04-presentation/frontend-layer.md](./04-presentation/frontend-layer.md) | React, TypeScript, Zustand, React Query, 虚拟滚动, Chat组件, Task卡片, AgentBar | 页面组件设计、状态管理、性能优化 |

### 按实体快速查询

| 实体 | 定义文档 | Application | API |
|------|---------|-------------|-----|
| Agent | [01-domain/models/agent/agent-entity.md](./01-domain/models/agent/agent-entity.md) | 02-application §2.1 | 03-infrastructure §3.5 |
| Channel | [01-domain/models/channel/channel-entity.md](./01-domain/models/channel/channel-entity.md) | 02-application §2.2 | 03-infrastructure §3.2 |
| Message | [01-domain/models/message/message-entity.md](./01-domain/models/message/message-entity.md) | 02-application §2.4 | 03-infrastructure §3.3 |
| Task | [01-domain/models/task/task-entity.md](./01-domain/models/task/task-entity.md) | - | 03-infrastructure §3.4 |
| OKR | [01-domain/models/okr/okr-entity.md](./01-domain/models/okr/okr-entity.md) | - | - |
| Workflow | [01-domain/models/workflow/workflow-entity.md](./01-domain/models/workflow/workflow-entity.md) | 02-application §2.6 | 03-infrastructure §3.9 |
| Execution | [01-domain/models/execution/execution-entity.md](./01-domain/models/execution/execution-entity.md) | 02-application §2.7 | 03-infrastructure §3.6 |
| Project | [01-domain/models/project/project-entity.md](./01-domain/models/project/project-entity.md) | - | - |
| User | [01-domain/models/user/user-entity.md](./01-domain/models/user/user-entity.md) | - | 03-infrastructure §3.1 |
| Device | [01-domain/models/device/device-entity.md](./01-domain/models/device/device-entity.md) | - | - |

---

**最后更新**: 2026-05-08 | **团队**: #cove-refactor
