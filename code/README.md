# Cove 代码实现目录

> **版本**: v4.0  
> **日期**: 2026-05-08  
> **状态**: 目录结构已创建，待实现

本目录包含 Cove 项目的完整代码实现，按照 V4 架构设计组织。

## 目录结构

```
code/
├── cloud/                      # 云端代码
│   ├── backend/                # 后端代码
│   │   └── src/
│   │       ├── domain/         # 领域层
│   │       │   ├── models/     # 领域模型（实体定义）
│   │       │   │   ├── agent/          # Agent 实体
│   │       │   │   ├── project/        # Project 实体
│   │       │   │   ├── user/           # User 实体
│   │       │   │   ├── channel/        # Channel 实体
│   │       │   │   ├── message/        # Message 实体
│   │       │   │   ├── task/           # Task 实体
│   │       │   │   ├── workflow/       # Workflow 实体
│   │       │   │   ├── device/         # Device 实体
│   │       │   │   ├── realm/          # Realm 实体
│   │       │   │   ├── adapter/        # Adapter 实体
│   │       │   │   └── thread/         # Thread 实体
│   │       │   ├── services/   # 领域服务（跨实体业务规则）
│   │       │   └── message-orchestrator/  # 消息编排
│   │       ├── application/    # 应用层
│   │       │   ├── services/   # 应用服务（业务流程编排）
│   │       │   │   ├── agent/          # Agent 服务
│   │       │   │   ├── channel/        # Channel 服务
│   │       │   │   ├── message/        # Message 服务
│   │       │   │   ├── task/           # Task 服务
│   │       │   │   ├── workflow/       # Workflow 服务
│   │       │   │   ├── realm/          # Realm 服务
│   │       │   │   ├── user/           # User 服务
│   │       │   │   ├── device/         # Device 服务
│   │       │   │   └── adapter/        # Adapter 服务
│   │       │   ├── interfaces/ # 接口定义
│   │       │   └── context/    # 应用上下文
│   │       ├── infrastructure/ # 基础设施层
│   │       │   ├── repositories/  # 数据持久化
│   │       │   ├── database/      # 数据库
│   │       │   ├── trpc/          # tRPC API 路由
│   │       │   ├── websocket/     # WebSocket 实时通信
│   │       │   ├── events/        # 事件处理
│   │       │   ├── persistence/   # 持久化
│   │       │   └── storage/       # 存储服务
│   │       └── common/         # 共享代码
│   │           ├── errors/     # 错误定义
│   │           └── types/      # 共享类型
│   └── frontend/               # 前端代码
│       └── src/
│           ├── features/       # 功能域（按业务功能组织）
│           │   ├── agent/      # Agent 功能域
│           │   ├── auth/       # 认证功能域
│           │   ├── channel/    # Channel 功能域
│           │   ├── chat/       # Chat 功能域
│           │   ├── dashboard/  # Dashboard 功能域
│           │   ├── okr/        # OKR 功能域
│           │   ├── project/    # Project 功能域
│           │   ├── realm/      # Realm 功能域
│           │   ├── task/       # Task 功能域
│           │   ├── workflow/   # Workflow 功能域
│           │   └── terminal/   # Terminal 功能域
│           ├── core/           # 核心基础设施
│           │   ├── auth/       # 认证模块
│           │   ├── router/     # 路由配置
│           │   ├── services/   # 核心服务
│           │   └── stores/     # 全局状态
│           ├── shared/         # 共享组件和工具
│           │   ├── components/ # 通用 UI 组件
│           │   ├── hooks/      # 通用 Hooks
│           │   ├── types/      # 类型定义
│           │   └── utils/      # 工具函数
│           └── lib/            # 第三方库封装
│               └── trpc/       # tRPC 客户端
├── local/                      # 本地设备客户端
│   └── src/
│       ├── domain/             # 领域层
│       │   ├── agent-runtime/      # Agent 运行时
│       │   ├── configuration/      # 配置管理
│       │   ├── device-lifecycle/   # 设备生命周期
│       │   ├── execution-mode/     # 执行模式
│       │   └── feature-flag/       # 特性开关
│       ├── infrastructure/     # 基础设施层
│       │   ├── adapters/       # 框架适配器
│       │   │   └── adapter-manager.ts  # 适配器管理
│       │   ├── gateway/        # 后端网关
│       │   │   └── trpc-backend-gateway.ts  # tRPC 网关
│       │   ├── logger/         # 日志服务
│       │   └── storage/        # 本地存储
│       └── deprecated/         # 待清理的旧代码
└── monitor/                    # 监控配置
    ├── grafana/                # Grafana 监控配置
    └── prometheus/             # Prometheus 监控配置
```

## 架构分层说明

### Backend (云端后端) - 3 层 DDD 架构

| 层 | 目录 | 职责 |
|----|------|------|
| **Domain Layer** | `cloud/backend/src/domain/` | **核心业务逻辑**：实体定义、值对象、领域服务（跨实体业务规则、验证逻辑） |
| **Application Layer** | `cloud/backend/src/application/` | **业务流程编排**：应用服务（用例实现、业务流程）、接口定义 |
| **Infrastructure Layer** | `cloud/backend/src/infrastructure/` | **技术实现**：tRPC API、数据库访问、WebSocket、事件处理、持久化 |
| **Common** | `cloud/backend/src/common/` | **共享代码**：错误定义、通用类型 |

**依赖方向**：
```
infrastructure → application → domain
```

### Frontend (云端前端) - 功能域 + 分层架构

| 层 | 目录 | 职责 |
|----|------|------|
| **Features** | `cloud/frontend/src/features/` | **功能域**：按业务功能组织（agent、chat、task、workflow 等），每个功能域包含 components、hooks、stores |
| **Core** | `cloud/frontend/src/core/` | **核心基础设施**：认证、路由、全局服务、全局状态 |
| **Shared** | `cloud/frontend/src/shared/` | **共享资源**：通用组件、Hooks、工具函数、类型定义 |
| **Lib** | `cloud/frontend/src/lib/` | **第三方库封装**：tRPC 客户端等 |

### Local (本地设备客户端) - 2 层简化 DDD 架构

| 层 | 目录 | 职责 |
|----|------|------|
| **Domain Layer** | `local/src/domain/` | **核心业务逻辑**：Agent 运行时、配置管理、设备生命周期、执行模式、特性开关 |
| **Infrastructure Layer** | `local/src/infrastructure/` | **技术实现**：框架适配器、后端网关（tRPC）、日志、本地存储 |

**依赖方向**：
```
infrastructure → domain
```

**关键原则**：
- **Backend**: Domain Layer 不依赖任何其他层，是纯业务逻辑
- **Backend**: Application Layer 只依赖 Domain Layer，编排业务流程
- **Backend**: Infrastructure Layer 实现技术细节，调用 Application Layer 的服务
- **Frontend**: Features 高内聚低耦合，通过 Core 和 Shared 通信
- **Frontend**: Core 提供全局基础设施，Shared 提供可复用组件
- **Local**: 简化的 2 层架构，专注于本地执行和云端通信

## 设计亮点

### 1. Backend 三层 DDD 架构
- **Domain Layer**: 纯业务逻辑，无外部依赖
- **Application Layer**: 业务流程编排，依赖注入
- **Infrastructure Layer**: 技术实现细节，tRPC + Prisma + WebSocket
- **Common**: 跨层共享的类型、错误、常量

### 2. Frontend 功能域组织
- **高内聚**: 每个功能域包含完整的 components/hooks/stores
- **低耦合**: 功能域之间通过 shared/ 和 core/ 通信
- **易协作**: 不同团队可以并行开发不同功能域
- **类型安全**: tRPC 端到端类型推断

### 3. Local 设备客户端
- **简化 DDD**: 2 层架构（domain + infrastructure）
- **适配器模式**: 支持多种 AI 框架（Claude Code CLI、Anthropic API、OpenAI API）
- **网关通信**: 通过 tRPC WebSocket 与云端通信
- **本地优先**: 配置和执行状态本地存储（SQLite）

### 4. 全栈类型安全
- **tRPC**: 前后端共享类型定义，自动类型推断
- **Prisma**: 数据库类型安全，自动生成 TypeScript 类型
- **Zod**: 运行时数据验证
- **TypeScript**: 严格模式，减少运行时错误

### 5. 测试策略

**核心原则**: 测试文件与源码同级放置

#### 测试文件命名规范
- **实体测试**: `*.entity.test.ts` - 放在实体文件旁边
- **服务测试**: `*.service.test.ts` - 放在服务文件旁边
- **组件测试**: `*.test.tsx` - 放在组件文件旁边
- **Hooks 测试**: `*.test.ts` - 放在 hooks 文件旁边
- **Store 测试**: `*.test.ts` - 放在 store 文件旁边

#### 测试文件位置示例

**Backend 测试**:
```
cloud/backend/src/domain/models/agent/
├── agent.entity.ts
└── agent.entity.test.ts          ← 测试与源码同级

cloud/backend/src/application/services/project/
├── project.service.ts
└── project.service.test.ts
```

**Frontend 测试**:
```
cloud/frontend/src/features/chat/components/
├── ChatMessageList.tsx
└── ChatMessageList.test.tsx      ← 测试与源码同级

cloud/frontend/src/features/chat/hooks/
├── useChatMessages.ts
└── useChatMessages.test.ts
```

**Local 测试**:
```
local/src/domain/configuration/
├── configuration-service.ts
└── configuration-service.test.ts
```

#### 测试覆盖率要求
- **最低覆盖率**: 80%
- **测试类型**: 单元测试、集成测试、E2E 测试
- **测试框架**: Vitest (主要)、Playwright (E2E)

#### 优势
- ✅ 测试与代码物理距离近，便于同步维护
- ✅ 符合现代项目主流实践
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
