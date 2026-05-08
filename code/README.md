# Cove 代码实现目录

> **版本**: v4.0  
> **日期**: 2026-05-08  
> **状态**: 目录结构已创建，待实现

本目录包含 Cove 项目的完整代码实现，按照 V4 架构设计组织。

## 目录结构

```
code/
├── backend/                    # 后端代码
│   ├── shared/                 # 后端共享代码
│   │   ├── types/              # 共享类型定义
│   │   ├── utils/              # 工具函数
│   │   ├── errors/             # 错误定义
│   │   └── constants/          # 常量定义
│   ├── 01-domain/              # 领域层
│   │   ├── models/             # 领域模型（实体定义）
│   │   │   ├── agent/          # Agent 实体
│   │   │   ├── project/        # Project 实体
│   │   │   ├── user/           # User 实体
│   │   │   ├── channel/        # Channel 实体
│   │   │   ├── message/        # Message 实体
│   │   │   ├── task/           # Task 实体
│   │   │   ├── okr/            # OKR 实体
│   │   │   ├── workflow/       # Workflow 实体
│   │   │   ├── execution/      # Execution 实体
│   │   │   ├── device/         # Device 实体
│   │   │   ├── server/         # Server 实体
│   │   │   ├── member/         # Member 实体
│   │   │   ├── conversation/   # Conversation 实体
│   │   │   ├── attachment/     # Attachment 实体
│   │   │   ├── reaction/       # Reaction 实体
│   │   │   └── thread/         # Thread 实体
│   │   ├── services/           # 领域服务（跨实体业务规则）
│   │   │   ├── task_assignment/        # 任务分配策略
│   │   │   ├── okr_progress/           # OKR 进度计算
│   │   │   ├── workflow_validation/    # 工作流依赖验证
│   │   │   ├── permission_evaluation/  # 权限评估
│   │   │   └── message_mention/        # 消息 @mention 解析
│   │   └── research/           # 领域层调研报告
│   ├── 02-application/         # 应用层
│   │   ├── runtime/            # 运行时组件（生命周期管理）
│   │   │   ├── agent_daemon/   # Agent 守护进程
│   │   │   ├── channel_runtime/# Channel 运行时
│   │   │   ├── workflow_runtime/# Workflow 运行时
│   │   │   └── execution_runtime/# Execution 运行时
│   │   ├── services/           # 应用服务（业务流程编排）
│   │   │   ├── project/        # Project 服务
│   │   │   ├── agent/          # Agent 服务
│   │   │   ├── channel/        # Channel 服务
│   │   │   ├── message/        # Message 服务
│   │   │   ├── task/           # Task 服务
│   │   │   ├── okr/            # OKR 服务
│   │   │   ├── workflow/       # Workflow 服务
│   │   │   ├── execution/      # Execution 服务
│   │   │   ├── user/           # User 服务
│   │   │   └── server/         # Server 服务
│   │   └── research/           # 应用层调研报告
│   └── 03-infrastructure/      # 基础设施层
│       ├── adapters/           # 框架适配器
│       │   ├── openclaw/       # OpenClaw Gateway 适配
│       │   ├── claude_code/    # Claude Code 本地执行适配
│       │   └── generic/        # 通用适配器
│       ├── api/                # REST API 端点实现
│       │   ├── design/         # API 设计文档
│       │   ├── code/           # API 实现代码
│       │   ├── examples/       # API 使用示例
│       │   └── tests/          # API 测试
│       ├── auth/               # 认证授权
│       │   ├── design/         # 认证设计文档
│       │   ├── code/           # 认证实现代码
│       │   ├── examples/       # 认证使用示例
│       │   └── tests/          # 认证测试
│       ├── cli/                # CLI 客户端
│       │   ├── design/         # CLI 设计文档
│       │   ├── commands/       # CLI 命令实现
│       │   └── examples/       # CLI 使用示例
│       ├── database/           # 数据持久化
│       │   ├── design/         # 数据库设计文档
│       │   ├── migrations/     # 数据库迁移脚本
│       │   └── repositories/   # Repository 实现
│       ├── websocket/          # WebSocket 实时通信
│       │   ├── design/         # WebSocket 设计文档
│       │   ├── code/           # WebSocket 实现代码
│       │   ├── examples/       # WebSocket 使用示例
│       │   └── tests/          # WebSocket 测试
│       └── research/           # 基础设施层调研报告
└── frontend/                   # 前端代码
    └── 04-presentation/        # 表现层
        ├── features/           # 功能域（按功能组织）
        │   ├── chat/           # Chat 功能域
        │   │   ├── components/ # Chat 组件
        │   │   ├── hooks/      # Chat Hooks
        │   │   ├── stores/     # Chat 状态管理
        │   │   └── services/   # Chat API 服务
        │   ├── task/           # Task 功能域
        │   │   ├── components/
        │   │   ├── hooks/
        │   │   ├── stores/
        │   │   └── services/
        │   ├── agent/          # Agent 功能域
        │   │   ├── components/
        │   │   ├── hooks/
        │   │   ├── stores/
        │   │   └── services/
        │   ├── okr/            # OKR 功能域
        │   │   ├── components/
        │   │   ├── hooks/
        │   │   ├── stores/
        │   │   └── services/
        │   ├── workflow/       # Workflow 功能域
        │   │   ├── components/
        │   │   ├── hooks/
        │   │   ├── stores/
        │   │   └── services/
        │   └── project/        # Project 功能域
        │       ├── components/
        │       ├── hooks/
        │       ├── stores/
        │       └── services/
        ├── shared/             # 共享组件和工具
        │   ├── components/     # 通用 UI 组件
        │   ├── hooks/          # 通用 Hooks
        │   └── utils/          # 工具函数
        ├── core/               # 核心基础设施
        │   ├── api/            # API 客户端
        │   ├── auth/           # 认证模块
        │   ├── router/         # 路由配置
        │   └── config/         # 应用配置
        └── research/           # 表现层调研报告
```

## 架构分层说明

| 层 | 目录 | 职责 |
|----|------|------|
| **Domain Layer** | `backend/01-domain/` | **核心业务逻辑**：实体定义、值对象、领域服务（跨实体业务规则、验证逻辑） |
| **Application Layer** | `backend/02-application/` | **业务流程编排**：应用服务（用例实现、业务流程）、运行时组件（生命周期管理、调度） |
| **Infrastructure Layer** | `backend/03-infrastructure/` | **技术实现**：API 端点、认证授权、CLI 客户端、数据库访问、WebSocket、框架适配器 |
| **Presentation Layer** | `frontend/04-presentation/` | **用户界面**：功能域组件、共享组件、核心基础设施 |

**依赖方向**：
```
frontend/04-presentation → backend/03-infrastructure → backend/02-application → backend/01-domain
```

**关键原则**：
- **Domain Layer** 不依赖任何其他层，是纯业务逻辑
- **Application Layer** 只依赖 Domain Layer，编排业务流程
- **Infrastructure Layer** 实现技术细节，调用 Application Layer 的服务
- **Presentation Layer** 通过 Infrastructure Layer 的 API 与后端交互

## 设计亮点

### 1. Backend Shared 目录
- `shared/types/` - 跨层共享的类型定义
- `shared/utils/` - 通用工具函数
- `shared/errors/` - 统一错误定义
- `shared/constants/` - 全局常量

### 2. Domain Services 细化
- `task_assignment/` - 任务分配策略（跨 Task、Agent、User）
- `okr_progress/` - OKR 进度计算（跨 OKR、Task、Workflow）
- `workflow_validation/` - 工作流依赖验证
- `permission_evaluation/` - 权限评估逻辑
- `message_mention/` - @mention 解析和通知

### 3. Infrastructure Adapters
- `adapters/openclaw/` - OpenClaw Gateway 协议适配
- `adapters/claude_code/` - Claude Code 本地执行适配
- `adapters/generic/` - 通用框架适配器
- **职责**: 处理框架特定的实现细节，Runtime 层保持框架无关

### 4. Frontend 功能域组织
- **高内聚**: 每个功能域包含完整的 components/hooks/stores/services
- **低耦合**: 功能域之间通过 shared/ 和 core/ 通信
- **易协作**: 不同团队可以并行开发不同功能域

### 5. 测试策略

**核心原则**: 测试文件与源码同级放置（方案 A）

#### 测试文件命名规范
- **实体测试**: `*.entity.test.ts` - 放在实体文件旁边
- **服务测试**: `*.service.test.ts` - 放在服务文件旁边
- **组件测试**: `*.test.tsx` - 放在组件文件旁边
- **Hooks 测试**: `*.test.ts` - 放在 hooks 文件旁边
- **Store 测试**: `*.test.ts` - 放在 store 文件旁边

#### 测试文件位置示例

**Backend 测试**:
```
backend/01-domain/models/agent/
├── agent.entity.ts
└── agent.entity.test.ts          ← 测试与源码同级

backend/01-domain/services/task_assignment/
├── task-assignment.service.ts
└── task-assignment.service.test.ts

backend/02-application/services/project/
├── project.service.ts
└── project.service.test.ts

backend/02-application/runtime/agent_daemon/
├── agent-daemon.ts
└── agent-daemon.test.ts
```

**Frontend 测试**:
```
frontend/04-presentation/features/chat/components/
├── ChatMessageList.tsx
└── ChatMessageList.test.tsx      ← 测试与源码同级

frontend/04-presentation/features/chat/hooks/
├── useChatMessages.ts
└── useChatMessages.test.ts

frontend/04-presentation/features/task/stores/
├── useTaskStore.ts
└── useTaskStore.test.ts
```

#### 测试覆盖率要求
- **最低覆盖率**: 80%
- **测试类型**: 单元测试、集成测试、E2E 测试
- **测试框架**: Vitest (TypeScript/JavaScript)、Jest (备选)

#### 优势
- ✅ 测试与代码物理距离近，便于同步维护
- ✅ 符合现代项目主流实践（Jest、Vitest、pytest）
- ✅ 每层的测试职责清晰，边界明确
- ✅ 导入路径更短，相对引用简单
- ✅ 修改代码时能立即看到相关测试

## 实施计划

### 阶段 1：Domain Layer（领域层）
- [ ] 实现 16 个核心实体的数据模型
- [ ] 实现 5 个领域服务（业务规则、验证逻辑）
- [ ] 编写单元测试（测试与代码同级）

### 阶段 2：Application Layer（应用层）
- [ ] 实现 4 个 Runtime 组件（AgentDaemon、ChannelRuntime、WorkflowRuntime、ExecutionRuntime）
- [ ] 实现 10 个应用服务（ProjectService、AgentService、ChannelService 等）
- [ ] 编写集成测试

### 阶段 3：Infrastructure Layer（基础设施层）
- [ ] 实现 3 个框架适配器（OpenClaw、Claude Code、Generic）
- [ ] 实现 REST API 端点
- [ ] 实现认证授权系统
- [ ] 实现 CLI 客户端
- [ ] 实现数据库访问层（Repository）
- [ ] 实现 WebSocket 实时通信
- [ ] 编写 API 测试

### 阶段 4：Presentation Layer（表现层）
- [ ] 实现 6 个功能域（chat、task、agent、okr、workflow、project）
- [ ] 实现共享组件库（shared/components）
- [ ] 实现核心基础设施（core/api、core/auth、core/router）
- [ ] 编写 E2E 测试

## 相关文档

- [V4 架构文档](../docs/v4/architecture/README.md) - 完整的架构设计文档
- [Domain Layer 文档](../docs/v4/architecture/backend/01-domain/models/README.md) - 领域层设计
- [Application Layer 文档](../docs/v4/architecture/backend/02-application/runtime/design/runtime-layer.md) - 应用层设计
- [Infrastructure Layer 文档](../docs/v4/architecture/backend/03-infrastructure/README.md) - 基础设施层设计
- [Presentation Layer 文档](../docs/v4/architecture/frontend/04-presentation/frontend-layer.md) - 表现层设计

---

**最后更新**: 2026-05-08 | **维护者**: @Alice
