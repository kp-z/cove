# Local-Backend 通信架构设计方案

**作者**: InfraEngineer  
**日期**: 2026-05-18  
**状态**: 待审核  

---

## 1. 概述

本方案设计 Cove 项目的混合部署架构，将系统分为：
- **Backend + Frontend**: 部署到远程服务器
- **Local**: 部署到用户本地机器

通过 WebSocket 实现 Local 和 Backend 的双向通信。

---

## 2. 目录结构

### 2.1 推荐命名

使用 `local` 作为本地运行时目录名，简洁直接。

```
cove/code/
├── backend/      # 服务器端（部署到远程服务器）
├── frontend/     # 前端（部署到远程服务器）
└── local/        # 本地运行时（用户本地运行）
```

### 2.2 完整目录结构

```
cove/
├── code/
│   ├── backend/              # API Server（部署到服务器）
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── trpc/        # tRPC 路由
│   │   │   ├── gateway/     # 🆕 Local 通信层
│   │   │   │   ├── connection-manager.ts
│   │   │   │   ├── message-router.ts
│   │   │   │   ├── task-dispatcher.ts
│   │   │   │   ├── file-proxy.ts
│   │   │   │   └── websocket-handler.ts
│   │   │   └── ...
│   │   ├── prisma/
│   │   └── package.json
│   │
│   ├── frontend/             # 前端（部署到服务器）
│   │   ├── src/
│   │   ├── dist/
│   │   └── package.json
│   │
│   └── local/                # 🆕 本地运行时（本地运行）
│       ├── src/
│       │   ├── main.ts                    # 入口文件
│       │   ├── config.ts                  # 配置管理
│       │   ├── websocket-client.ts        # WebSocket 客户端
│       │   ├── message-handler.ts         # 消息处理器
│       │   ├── agent-executor.ts          # Agent 执行器
│       │   ├── file-manager.ts            # 文件管理器
│       │   └── heartbeat.ts               # 心跳管理
│       ├── .cove/                         # 数据目录（移动现有的）
│       │   ├── agents/
│       │   │   └── {agent-id}/
│       │   │       ├── agent.md
│       │   │       ├── memory/
│       │   │       └── workspace/
│       │   └── storage/
│       │       ├── messages/
│       │       └── channels/
│       ├── config.example.json            # 配置示例
│       └── package.json
│
└── docs/                     # 文档
```

---

## 3. 架构设计

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户浏览器                            │
│                    (http://server.com)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/WebSocket
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend (服务器端)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  tRPC API    │  │  WebSocket   │  │  PostgreSQL  │      │
│  │   Server     │  │   Gateway    │  │   Database   │      │
│  └──────────────┘  └──────┬───────┘  └──────────────┘      │
└─────────────────────────────┼──────────────────────────────┘
                              │ WebSocket (wss://)
                              │ 双向通信
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Local (本地运行时)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  WebSocket   │  │    Agent     │  │    File      │      │
│  │   Client     │→ │   Executor   │→ │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  .cove/                                                      │
│  ├── agents/     # Agent 定义和 Memory                       │
│  └── storage/    # 文件存储                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 组件职责

#### Backend (服务器端)
- **tRPC API Server**: 处理前端 HTTP 请求
- **WebSocket Gateway**: 管理与 Local 的 WebSocket 连接
- **PostgreSQL Database**: 存储业务数据（User, Project, Channel, Message 元数据等）

#### Local (本地运行时)
- **WebSocket Client**: 连接到 Backend，接收任务和发送结果
- **Agent Executor**: 执行 Agent 任务（调用 Claude API）
- **File Manager**: 管理本地文件（Agent Memory, Workspace, Storage）

---

## 4. 通信协议

### 4.1 连接建立

**Local 启动流程：**
```
1. Local 启动时读取配置（服务器地址、认证 Token）
2. 建立 WebSocket 连接到 Backend
   wss://server.com/gateway/connect?token=xxx
3. Backend 验证 Token，建立连接
4. Local 发送心跳保持连接
```

**Backend 端实现：**
```typescript
// backend/src/gateway/connection-manager.ts
class ConnectionManager {
  // 管理所有 Local 连接
  private connections: Map<userId, WebSocket>
  
  // 验证连接
  async authenticate(token: string): Promise<User>
  
  // 注册连接
  registerConnection(userId: string, ws: WebSocket)
  
  // 发送消息到指定 Local
  sendToLocal(userId: string, message: Message)
}
```

**Local 端实现：**
```typescript
// local/src/websocket-client.ts
class WebSocketClient {
  private ws: WebSocket
  private reconnectAttempts = 0
  
  // 连接到服务器
  async connect(serverUrl: string, token: string)
  
  // 发送消息
  send(message: Message)
  
  // 接收消息
  onMessage(handler: (msg: Message) => void)
  
  // 自动重连
  reconnect()
}
```

---

### 4.2 消息格式

**统一消息格式（JSON）：**
```typescript
interface Message {
  id: string              // 消息 ID
  type: MessageType       // 消息类型
  payload: any            // 消息内容
  timestamp: number       // 时间戳
  requestId?: string      // 请求 ID（用于响应匹配）
}

enum MessageType {
  // Local → Backend
  HEARTBEAT = 'heartbeat',
  TASK_RESULT = 'task_result',
  FILE_CONTENT = 'file_content',
  ERROR = 'error',
  
  // Backend → Local
  TASK_REQUEST = 'task_request',
  FILE_REQUEST = 'file_request',
  AGENT_COMMAND = 'agent_command',
}
```

---

### 4.3 通信场景

#### 场景 1：用户在 Web 端发送消息给 Agent

```
1. 用户在浏览器输入消息
   ↓
2. Frontend 调用 tRPC API
   trpc.message.send({ channelId, content })
   ↓
3. Backend 接收请求，存入数据库
   ↓
4. Backend 通过 WebSocket 发送任务到 Local
   {
     type: 'TASK_REQUEST',
     payload: {
       taskId: 'xxx',
       agentId: 'yyy',
       action: 'process_message',
       data: { messageId, content }
     }
   }
   ↓
5. Local 接收任务，执行 Agent
   ↓
6. Local 返回结果到 Backend
   {
     type: 'TASK_RESULT',
     payload: {
       taskId: 'xxx',
       status: 'success',
       result: { response: '...' }
     }
   }
   ↓
7. Backend 存储结果到数据库
   ↓
8. Backend 通过 WebSocket 推送到 Frontend
   ↓
9. 用户在浏览器看到 Agent 回复
```

#### 场景 2：Web 端查看 Agent Memory

```
1. 用户点击查看 Memory
   ↓
2. Frontend 调用 tRPC API
   trpc.agent.getMemory({ agentId })
   ↓
3. Backend 检查数据库，发现 Memory 在本地
   ↓
4. Backend 通过 WebSocket 请求 Local
   {
     type: 'FILE_REQUEST',
     payload: {
       requestId: 'xxx',
       agentId: 'yyy',
       path: 'memory/MEMORY.md'
     }
   }
   ↓
5. Local 读取本地文件
   ↓
6. Local 返回文件内容
   {
     type: 'FILE_CONTENT',
     payload: {
       requestId: 'xxx',
       content: '...',
       metadata: { size, mtime }
     }
   }
   ↓
7. Backend 返回给 Frontend
   ↓
8. 用户在浏览器看到 Memory 内容
```

#### 场景 3：心跳保活

```
Local 每 30 秒发送心跳：
{
  type: 'HEARTBEAT',
  payload: {
    status: 'online',
    activeAgents: ['agent-1', 'agent-2'],
    systemInfo: { cpu, memory }
  }
}

Backend 响应：
{
  type: 'HEARTBEAT_ACK',
  payload: { timestamp }
}

如果 60 秒没有心跳，Backend 标记 Local 为离线。
```

---

## 5. 数据存储策略

### 5.1 数据存储位置

| 数据类型 | 存储位置 | 访问方式 |
|---------|---------|---------|
| User, Project, Channel | Backend DB | tRPC API |
| Message 元数据 | Backend DB | tRPC API |
| Message 内容 | Local 文件 | WebSocket 请求 |
| Agent 定义 (Frontmatter) | Backend DB | tRPC API |
| Agent 定义 (完整文档) | Local 文件 | WebSocket 请求 |
| Agent Memory | Local 文件 | WebSocket 请求 |
| Agent Workspace | Local 文件 | WebSocket 请求 |
| Attachments | Local 文件 | WebSocket 请求 |

### 5.2 同步策略

**启动时同步：**
```
1. Local 启动时扫描 .cove/agents/
2. 解析所有 agent.md 的 Frontmatter
3. 通过 WebSocket 发送到 Backend
4. Backend 更新数据库（upsert）
```

**运行时同步：**
```
1. Local 修改 agent.md 时
2. 解析新的 Frontmatter
3. 发送更新到 Backend
4. Backend 更新数据库
```

---

## 6. 配置管理

### 6.1 Local 配置文件

**config.json:**
```json
{
  "server": {
    "url": "wss://server.com/gateway",
    "token": "your-auth-token"
  },
  "local": {
    "dataDir": ".cove",
    "heartbeatInterval": 30000,
    "reconnectDelay": 5000,
    "maxReconnectAttempts": 10
  },
  "agent": {
    "maxConcurrent": 5,
    "taskTimeout": 60000
  }
}
```

### 6.2 认证方案

**Token 生成：**
```
1. 用户在 Web 端登录
2. Backend 生成 JWT Token
3. 用户复制 Token 到 Local 配置文件
4. Local 使用 Token 连接
```

**Token 格式：**
```typescript
interface TokenPayload {
  userId: string
  exp: number        // 过期时间
  scope: string[]    // 权限范围
}
```

---

## 7. 安全设计

### 7.1 传输安全
- **TLS 加密**: 使用 wss:// 协议（WebSocket over TLS）
- **Token 验证**: 每次连接验证 JWT Token
- **Token 过期**: Token 有效期 30 天，过期后需要重新生成

### 7.2 数据安全
- **路径验证**: 文件请求验证路径，防止路径遍历攻击
- **权限检查**: 验证用户是否有权限访问请求的资源
- **速率限制**: 限制消息频率，防止滥用

### 7.3 错误处理

**连接错误：**
- 自动重连（指数退避）
- 最大重试次数：10 次
- 重连间隔：5s, 10s, 20s, 40s, 80s, ...

**任务错误：**
- 超时时间：60 秒
- 超时后返回错误
- 错误日志记录到本地文件

---

## 8. 实施计划

### Phase 1：创建 Local 目录结构（1 天）

**任务：**
1. 创建 `code/local/` 目录
2. 移动 `code/.cove/` 到 `code/local/.cove/`
3. 创建基础文件结构
4. 初始化 package.json

**交付物：**
- `local/src/` 目录结构
- `local/package.json`
- `local/config.example.json`
- `local/.cove/` 数据目录

---

### Phase 2：实现 Backend Gateway（2 天）

**任务：**
1. 创建 `backend/src/gateway/` 目录
2. 实现 ConnectionManager（连接管理）
3. 实现 MessageRouter（消息路由）
4. 实现 TaskDispatcher（任务分发）
5. 实现 FileProxy（文件代理）
6. 实现 WebSocketHandler（WebSocket 处理器）

**核心功能：**
- WebSocket 服务器（监听 `/gateway` 路径）
- 连接认证和管理
- 消息路由（根据 type 分发）
- 任务队列（支持异步任务）
- 请求-响应匹配（requestId）

**交付物：**
- `backend/src/gateway/connection-manager.ts`
- `backend/src/gateway/message-router.ts`
- `backend/src/gateway/task-dispatcher.ts`
- `backend/src/gateway/file-proxy.ts`
- `backend/src/gateway/websocket-handler.ts`

---

### Phase 3：实现通信协议（2 天）

**Local 端实现：**
1. WebSocket 连接和重连
2. 消息发送和接收
3. 任务执行（调用 Agent Executor）
4. 文件读取（调用 File Manager）
5. 心跳发送

**Backend 端实现：**
1. 接收和验证连接
2. 消息分发
3. 任务分发到 Local
4. 文件请求代理
5. 心跳监控

**交付物：**
- `local/src/websocket-client.ts`
- `local/src/message-handler.ts`
- `local/src/heartbeat.ts`
- `backend/src/gateway/` 完整实现

---

### Phase 4：集成测试（1 天）

**测试场景：**
1. Local 启动并连接到 Backend
2. 发送消息给 Agent，验证响应
3. 查看 Agent Memory，验证文件读取
4. 断开连接，验证自动重连
5. 多个 Local 同时连接
6. 压力测试（并发任务）

**交付物：**
- 集成测试脚本
- 测试报告
- 性能基准

---

### Phase 5：前端集成（1 天）

**Frontend 修改：**
1. 显示 Local 连接状态（在线/离线）
2. 如果 Local 离线，禁用 Agent 相关功能
3. 实时显示 Agent 执行状态
4. 添加 Local 配置页面（生成 Token）

**交付物：**
- `frontend/src/components/LocalStatus.tsx`
- `frontend/src/components/LocalConfig.tsx`
- 更新相关页面

---

## 9. 工作量估算

| 阶段 | 工作内容 | 时间 | 人力 |
|-----|---------|------|------|
| Phase 1 | Local 目录结构 | 1 天 | 1 人 |
| Phase 2 | Backend Gateway | 2 天 | 1 人 |
| Phase 3 | 通信协议实现 | 2 天 | 1 人 |
| Phase 4 | 集成测试 | 1 天 | 1 人 |
| Phase 5 | 前端集成 | 1 天 | 1 人 |
| **总计** | | **7 天** | **1 人** |

---

## 10. 风险评估

### 10.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| WebSocket 连接不稳定 | 高 | 中 | 实现自动重连和任务队列 |
| 网络延迟影响体验 | 中 | 中 | 添加加载状态和超时提示 |
| Token 泄露风险 | 高 | 低 | 使用短期 Token + 刷新机制 |
| 文件同步冲突 | 中 | 低 | 实现文件锁和版本控制 |

### 10.2 实施风险

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| 现有代码需要大量修改 | 高 | 中 | 分阶段实施，保持向后兼容 |
| 测试覆盖不足 | 中 | 中 | 编写完整的集成测试 |
| 文档不完善 | 低 | 高 | 同步更新用户文档和开发文档 |

---

## 11. 后续优化

### 11.1 性能优化
- 消息批处理（减少 WebSocket 消息数量）
- 文件缓存（减少重复读取）
- 任务优先级队列（重要任务优先执行）

### 11.2 功能增强
- 支持多个 Local 实例（同一用户多台机器）
- Local 之间的 P2P 通信（减少服务器压力）
- 离线模式（Local 离线时缓存任务）

### 11.3 监控和运维
- Local 健康检查（CPU、内存、磁盘）
- 任务执行统计（成功率、平均耗时）
- 错误日志收集和分析

---

## 12. 总结

本方案设计了一个完整的 Local-Backend 通信架构，通过 WebSocket 实现双向通信，支持：
- ✅ 混合部署（Backend/Frontend 在服务器，Local 在本地）
- ✅ 实时通信（WebSocket 长连接）
- ✅ 安全认证（JWT Token）
- ✅ 自动重连（指数退避）
- ✅ 文件代理（透明访问本地文件）
- ✅ 任务分发（异步执行）

**预计工作量**: 7 天（1 人）  
**技术栈**: TypeScript + WebSocket + tRPC + Prisma  
**风险等级**: 中等（需要充分测试）

---

## 附录

### A. 参考项目
- **GitHub Desktop**: 本地 Git 操作 + 远程 GitHub 服务器
- **Docker Desktop**: 本地容器运行时 + 远程 Docker Hub
- **VS Code Remote**: 本地 VS Code + 远程服务器

### B. 相关文档
- [WebSocket API 文档](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [tRPC 文档](https://trpc.io/)
- [Prisma 文档](https://www.prisma.io/)

### C. 待讨论问题
1. Token 有效期设置为多久？（建议 30 天）
2. 是否需要支持多个 Local 实例？（建议 Phase 2 支持）
3. 文件上传大小限制？（建议 100MB）
4. 任务超时时间？（建议 60 秒）
