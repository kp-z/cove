# V4 架构文档

> **版本**: v4.0  
> **日期**: 2026-05-06  
> **维护者**: @Alice

---

## 目录结构

```
docs/v4/architecture/
├── README.md              # 主索引 + AI 查询入口
├── research/              # 整体架构调研报告
├── 01-entities/
│   └── research/          # 实体层调研报告
├── 02-runtime/
│   └── research/          # 运行时层调研报告
├── 03-backend/
│   └── research/          # 后端层调研报告
└── 04-frontend/
    └── research/          # 前端层调研报告
```

**调研报告命名规范**: `YYYYMMDD-<topic>.md`，格式见各层 `research/RESEARCH-FORMAT.md`

---

## 🤖 AI 查询指南

**查询流程**：
1. 搜索下方索引中的关键词，定位相关文档
2. 读取目标文档的 header（前 50-100 行），确认相关性
3. 深入阅读具体章节

### 文档索引

| 文档 | 关键词 | 适用场景 |
|------|--------|---------|
| [01-entities/README.md](./01-entities/README.md) | AgentEntity, ChannelEntity, MessageEntity, TaskEntity, OKREntity, WorkflowEntity, ExecutionEntity, ProjectEntity, UserEntity, DeviceEntity | 实体定义、数据模型、配置格式 |
| [02-runtime/design/runtime-layer.md](./02-runtime/design/runtime-layer.md) | AgentDaemon, ChannelRuntime, WorkflowRuntime, ExecutionRuntime, 生命周期管理, 消息队列, 触发器, 插件系统, 并发控制, 崩溃恢复, Memory管理, OpenClaw, Skills System, State Export/Import | Agent 启动/运行/停止流程、消息路由、故障恢复、OpenClaw 集成 |
| [03-backend/04-backend-api.md](./03-backend/04-backend-api.md) | REST API, WebSocket, JWT, OAuth2, RBAC, SAGA, API Gateway, 限流, 熔断, 数据迁移, 飞书, Webhook, Plugin, Trigger | API 接口设计、认证授权、事务管理、飞书集成 |
| [04-frontend/05-frontend-layer.md](./04-frontend/05-frontend-layer.md) | React, TypeScript, Zustand, React Query, 虚拟滚动, Chat组件, Task卡片, AgentBar | 页面组件设计、状态管理、性能优化 |

### 按实体快速查询

| 实体 | 定义文档 | Runtime | API |
|------|---------|---------|-----|
| Agent | [01-entities/agent/agent-entity.md](./01-entities/agent/agent-entity.md) | 02-runtime §2.1 | 03-backend §3.5 |
| Channel | [01-entities/channel/channel-entity.md](./01-entities/channel/channel-entity.md) | 02-runtime §2.2 | 03-backend §3.2 |
| Message | [01-entities/message/message-entity.md](./01-entities/message/message-entity.md) | 02-runtime §2.4 | 03-backend §3.3 |
| Task | [01-entities/task/task-entity.md](./01-entities/task/task-entity.md) | - | 03-backend §3.4 |
| OKR | [01-entities/okr/okr-entity.md](./01-entities/okr/okr-entity.md) | - | - |
| Workflow | [01-entities/workflow/workflow-entity.md](./01-entities/workflow/workflow-entity.md) | 02-runtime §2.6 | 03-backend §3.9 |
| Execution | [01-entities/execution/execution-entity.md](./01-entities/execution/execution-entity.md) | 02-runtime §2.7 | 03-backend §3.6 |
| Project | [01-entities/project/project-entity.md](./01-entities/project/project-entity.md) | - | - |
| User | [01-entities/user/user-entity.md](./01-entities/user/user-entity.md) | - | 03-backend §3.1 |
| Device | [01-entities/device/device-entity.md](./01-entities/device/device-entity.md) | - | - |

---

**最后更新**: 2026-05-06 | **团队**: #oa-refactor
