# Infrastructure Layer (基础设施层)

> **版本**: v4.0  
> **日期**: 2026-05-08

Infrastructure Layer 负责技术基础设施实现，提供系统的技术能力，包括 API 端点、认证授权、WebSocket 通信、CLI 客户端、数据持久化等。

**职责边界**：
- ✅ 技术实现：HTTP/WebSocket 协议处理、数据库访问、外部服务集成
- ✅ 接口适配：将外部请求转换为应用层调用
- ❌ 业务逻辑：业务规则和流程编排属于 Application Layer

## 目录结构

```
backend/03-infrastructure/
├── 04-backend-api.md      # Backend API 完整设计文档
├── api/                   # REST API 端点实现
│   ├── design/
│   ├── code/
│   ├── examples/
│   └── tests/
├── auth/                  # 认证授权
│   ├── design/
│   ├── code/
│   ├── examples/
│   └── tests/
├── cli/                   # CLI 客户端
│   ├── design/
│   │   └── cli-architecture.md
│   ├── commands/
│   │   ├── README.md
│   │   ├── message-send.md
│   │   ├── message-read.md
│   │   ├── task-list.md
│   │   ├── task-claim.md
│   │   ├── task-update.md
│   │   └── server-info.md
│   └── examples/
├── database/              # 数据持久化（Repository 实现）
│   ├── design/
│   ├── migrations/
│   └── repositories/
├── websocket/             # WebSocket 实时通信
│   ├── design/
│   ├── code/
│   ├── examples/
│   └── tests/
└── research/              # 基础设施层调研报告
```

**注意**：`services/` 目录已废弃，业务逻辑实现已移至 [Application Services](../02-application/services/README.md)。

## 核心组件

### 1. Backend API

REST API 和 GraphQL 接口实现，处理 HTTP 请求并调用 Application Services。

**文档**: [04-backend-api.md](./04-backend-api.md)

**职责**:
- HTTP 请求处理和参数验证
- 调用 Application Services 执行业务逻辑
- 响应格式化和错误处理
- API 文档生成（OpenAPI/Swagger）

**示例**:
```python
@router.post("/tasks/{task_id}/claim")
async def claim_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends()  # 注入 Application Service
):
    # API 层只负责 HTTP 处理
    result = task_service.claim_task(task_id, current_user.id)
    
    if result.is_err():
        raise HTTPException(status_code=400, detail=str(result.error))
    
    return TaskResponse.from_entity(result.value)
```

### 2. CLI 客户端

Slock 命令行工具，为用户提供便捷的命令行界面。

**文档**: [cli/design/cli-architecture.md](./cli/design/cli-architecture.md)

**命令分类**:
- `message` - 消息管理（send, read, search, check）
- `task` - 任务管理（list, create, claim, unclaim, update）
- `channel` - 频道管理（list, members, leave）
- `thread` - 线程管理（unfollow）
- `server` - 服务器管理（info）
- `profile` - 用户配置（show, update）
- `reminder` - 提醒管理（schedule, list, cancel）
- `attachment` - 附件管理（upload, view）

**命令参考**: [cli/commands/README.md](./cli/commands/README.md)

### 3. 认证授权

JWT Token 认证、OAuth2 集成、RBAC 权限控制。

**功能**:
- JWT Token 生成和验证
- OAuth2 第三方登录（GitHub, Google）
- 基于角色的访问控制（RBAC）
- API Key 管理

### 4. WebSocket 通信

实时消息推送、在线状态同步、事件通知。

**功能**:
- 实时消息推送
- 在线状态同步
- 任务状态变更通知
- Agent 状态变更通知

### 5. 数据持久化

Repository 接口的具体实现，负责数据库访问。

**功能**:
- PostgreSQL 数据库访问
- Redis 缓存管理
- 数据库迁移脚本
- 查询优化和索引管理

## 技术栈

| 组件 | 技术选型 |
|------|----------|
| **API 框架** | FastAPI (Python) / Express (Node.js) |
| **数据库** | PostgreSQL |
| **缓存** | Redis |
| **消息队列** | RabbitMQ / Redis Streams |
| **WebSocket** | Socket.IO / ws |
| **认证** | JWT + OAuth2 |
| **CLI** | Go / Rust |

## 与其他层的关系

```
Frontend (04-presentation)
    ↓ HTTP/WebSocket
Infrastructure API (03-infrastructure)
    ↓ 调用
Application Services (02-application)
    ↓ 使用
Domain Models (01-domain)
```

**职责划分**:

| 层级 | 职责 | 示例 |
|------|------|------|
| **Infrastructure** | 技术实现 | HTTP 请求处理、数据库访问、WebSocket 推送 |
| **Application** | 业务流程编排 | 任务认领流程、消息发送流程、工作流执行 |
| **Domain** | 业务规则 | 任务状态流转规则、权限验证规则 |

**依赖方向**:
- Infrastructure 调用 Application Services（不直接操作 Domain）
- Application Services 使用 Domain Models 和 Runtime
- Domain Models 不依赖任何外层

## 相关文档

- [Backend API 完整设计](./04-backend-api.md)
- [CLI 架构设计](./cli/design/cli-architecture.md)
- [CLI 命令参考](./cli/commands/README.md)
- [Application Services](../02-application/services/README.md) - 业务逻辑层
- [Application Runtime](../02-application/runtime/design/runtime-layer.md) - 运行时组件
- [Domain Models](../01-domain/models/README.md) - 领域模型
- [Domain Services](../01-domain/services/README.md) - 领域服务

---

**最后更新**: 2026-05-08 | **维护者**: @Alice
