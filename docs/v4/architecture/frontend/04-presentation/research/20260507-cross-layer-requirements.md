# Cross-Layer Requirements Analysis (跨层需求分析)

> **日期**: 2026-05-07  
> **分析人**: FrontendEngineer  
> **目的**: 识别前端文档中涉及的跨层需求，明确需要 Backend 和 Runtime 层支持的功能

---

## 1. 概述

在前端文档优化过程中，发现以下文档包含跨层内容：
- **01-api-integration.md** - 前端与后端的 API 集成
- **02-feature-flows.md** - 完整的功能调用流程（前端 → 后端 → Runtime）
- **04-feishu-integration-ui.md** - 飞书集成的前端适配

这些文档描述了前端需要调用的后端 API 和功能，但**表现层只负责 UI 和调用**，实际的业务逻辑和数据处理由 Backend 和 Runtime 层负责。

本文档列出前端依赖的后端功能，供 Backend 和 Runtime 层参考。

---

## 2. 需要 Backend 层支持的功能

### 2.1 核心 API 端点（来自 01-api-integration.md）

前端需要以下 Backend API 端点：

#### 2.1.1 ProjectService
```
GET    /api/v1/projects              // 列出所有项目
GET    /api/v1/projects/:id           // 获取项目详情
POST   /api/v1/projects               // 创建项目
PUT    /api/v1/projects/:id           // 更新项目
DELETE /api/v1/projects/:id           // 删除项目
GET    /api/v1/projects/:id/okrs      // 获取项目的 OKRs
GET    /api/v1/projects/:id/channels  // 获取项目的频道
```

#### 2.1.2 MessageService
```
GET    /api/v1/channels/:channelId/messages       // 获取消息列表（分页）
POST   /api/v1/channels/:channelId/messages       // 发送消息
PUT    /api/v1/messages/:id                       // 编辑消息
DELETE /api/v1/messages/:id                       // 删除消息
POST   /api/v1/messages/:id/reactions             // 添加 Reaction
POST   /api/v1/messages/:id/convert-to-task       // 转换为任务
```

**关键需求**：
- 消息列表需要支持**分页**（`limit` 和 `before` 参数）
- 发送消息需要返回完整的消息对象（包含 `message_id`）
- 需要支持 **@mentions 解析**
- 需要通过 **WebSocket 推送**新消息给频道成员

#### 2.1.3 TaskService
```
GET    /api/v1/channels/:channelId/tasks    // 获取任务列表
POST   /api/v1/tasks                        // 创建任务
POST   /api/v1/tasks/:id/claim              // 认领任务
POST   /api/v1/tasks/:id/unclaim            // 取消认领
PUT    /api/v1/tasks/:id/status             // 更新任务状态
POST   /api/v1/tasks/:id/comments           // 添加评论
```

**关键需求**：
- 认领任务需要**冲突检测**（返回 409 状态码如果任务已被认领）
- 任务状态流转：`todo` → `in_progress` → `in_review` → `done`

#### 2.1.4 AgentRuntimeService
```
GET    /api/v1/agents                      // 列出所有 Agent
GET    /api/v1/agents/:id                  // 获取 Agent 详情
GET    /api/v1/agents/:id/status           // 获取 Agent 状态
POST   /api/v1/agents/:id/start            // 启动 Agent
POST   /api/v1/agents/:id/stop             // 停止 Agent
POST   /api/v1/agents/:id/export-state     // 导出 Agent 状态
POST   /api/v1/agents/:id/import-state     // 导入 Agent 状态
GET    /api/v1/agents/:id/executions       // 获取 Agent 执行记录
```

**关键需求**：
- Agent 状态需要**实时更新**（前端会每 5 秒轮询）
- 导出状态需要返回完整的 JSON 对象
- 导入状态需要验证 JSON 格式

#### 2.1.5 ChannelService
```
GET    /api/v1/channels/:id                // 获取频道详情
POST   /api/v1/channels                    // 创建频道
PUT    /api/v1/channels/:id                // 更新频道
POST   /api/v1/channels/:id/members        // 添加成员
DELETE /api/v1/channels/:id/members/:userId // 移除成员
GET    /api/v1/channels/:id/members        // 列出频道成员
GET    /api/v1/channels/:id/agents         // 获取频道内的 Agent
```

#### 2.1.6 UserService
```
GET    /api/v1/users/:id                   // 获取用户详情
PUT    /api/v1/users/:id                   // 更新用户
GET    /api/v1/users/:id/profile           // 获取用户资料
PUT    /api/v1/users/:id/settings          // 更新用户设置
```

#### 2.1.7 DeviceService
```
GET    /api/v1/devices                     // 列出所有设备
GET    /api/v1/devices/:id                 // 获取设备详情
PUT    /api/v1/devices/:id/status          // 更新设备状态
```

#### 2.1.8 OKRService
```
POST   /api/v1/okrs                        // 创建 OKR
PUT    /api/v1/okrs/:id                    // 更新 OKR
PUT    /api/v1/okrs/:id/kr/:krId/progress  // 更新 KR 进度
POST   /api/v1/okrs/:id/link-workflow      // 关联工作流
GET    /api/v1/projects/:projectId/okrs    // 列出项目的 OKRs
```

#### 2.1.9 WorkflowService
```
POST   /api/v1/workflows                   // 创建工作流
PUT    /api/v1/workflows/:id               // 更新工作流
POST   /api/v1/workflows/:id/start         // 启动工作流
POST   /api/v1/workflows/:id/stop          // 停止工作流
GET    /api/v1/workflows                   // 列出工作流
```

#### 2.1.10 ExecutionService
```
GET    /api/v1/executions/:id              // 获取执行详情
GET    /api/v1/executions/:id/logs         // 获取执行日志
GET    /api/v1/agents/:agentId/executions  // 列出 Agent 的执行记录
POST   /api/v1/executions/:id/cancel       // 取消执行
```

#### 2.1.11 ServerService
```
POST   /api/v1/servers                     // 创建 Server
POST   /api/v1/servers/:id/start           // 启动 Server
POST   /api/v1/servers/:id/stop            // 停止 Server
DELETE /api/v1/servers/:id                 // 删除 Server
GET    /api/v1/servers/:id/status          // 获取 Server 状态
GET    /api/v1/servers                     // 列出所有 Server
```

---

### 2.2 WebSocket 实时推送（来自 02-feature-flows.md）

前端需要 Backend 通过 WebSocket 推送以下事件：

#### 2.2.1 消息相关事件
```typescript
// 新消息
{
  type: 'new_message',
  data: {
    message_id: string,
    channel_id: string,
    content: string,
    author: User,
    created_at: string,
    mentions: string[]
  }
}

// 消息编辑
{
  type: 'message_updated',
  data: {
    message_id: string,
    channel_id: string,
    content: string,
    updated_at: string
  }
}

// 消息删除
{
  type: 'message_deleted',
  data: {
    message_id: string,
    channel_id: string
  }
}
```

#### 2.2.2 任务相关事件
```typescript
// 任务状态变更
{
  type: 'task_status_changed',
  data: {
    task_id: string,
    channel_id: string,
    status: 'todo' | 'in_progress' | 'in_review' | 'done',
    assignee_id?: string
  }
}

// 任务被认领
{
  type: 'task_claimed',
  data: {
    task_id: string,
    channel_id: string,
    assignee_id: string
  }
}
```

#### 2.2.3 Agent 状态事件
```typescript
// Agent 状态变更
{
  type: 'agent_status_changed',
  data: {
    agent_id: string,
    status: 'idle' | 'running' | 'stopped' | 'error',
    timestamp: string
  }
}

// Agent 执行完成
{
  type: 'execution_completed',
  data: {
    execution_id: string,
    agent_id: string,
    status: 'success' | 'failed',
    result?: any
  }
}
```

**关键需求**：
- WebSocket 连接需要支持**认证**（通过 token）
- 需要支持**频道订阅**（用户只接收自己加入的频道的消息）
- 需要支持**断线重连**和**消息补发**

---

### 2.3 飞书集成（来自 04-feishu-integration-ui.md）

前端需要 Backend 提供以下飞书集成功能：

#### 2.3.1 OAuth 认证
```
GET    /api/v1/auth/feishu/callback        // 处理飞书 OAuth 回调
POST   /api/v1/auth/feishu/login           // 飞书登录
```

**关键需求**：
- 需要验证 OAuth `state` 参数防止 CSRF 攻击
- 需要返回 JWT token 用于后续 API 调用
- 需要创建或关联 Slock 用户账号

#### 2.3.2 用户映射
```
GET    /api/v1/users/:id/feishu-mapping    // 获取飞书用户映射
POST   /api/v1/users/:id/feishu-mapping    // 创建飞书用户映射
DELETE /api/v1/users/:id/feishu-mapping    // 删除飞书用户映射
```

#### 2.3.3 同步状态
```
GET    /api/v1/feishu/sync-status          // 获取飞书同步状态
POST   /api/v1/feishu/sync                 // 手动触发同步
```

**关键需求**：
- 需要定期同步飞书用户信息（头像、昵称等）
- 需要处理飞书用户删除/离职的情况

---

## 3. 需要 Runtime 层支持的功能

### 3.1 Agent 状态管理

前端通过 Backend API 调用 Runtime 层的 Agent 管理功能：

```
POST   /api/v1/agents/:id/start            // 启动 Agent
POST   /api/v1/agents/:id/stop             // 停止 Agent
GET    /api/v1/agents/:id/status           // 获取 Agent 状态
```

**Runtime 层需要提供**：
- Agent 启动/停止的实际执行逻辑
- Agent 状态的实时查询接口
- Agent 执行日志的存储和查询

---

### 3.2 Agent 状态导出/导入

前端通过 Backend API 调用 Runtime 层的状态管理功能：

```
POST   /api/v1/agents/:id/export-state     // 导出 Agent 状态
POST   /api/v1/agents/:id/import-state     // 导入 Agent 状态
```

**Runtime 层需要提供**：
- 完整的 Agent 状态序列化（包括内存、上下文、配置）
- 状态导入的验证和恢复逻辑
- 状态版本兼容性检查

**状态格式示例**（来自 03-state-export-import-ui.md）：
```json
{
  "agent_id": "agent-123",
  "agent_name": "MyAgent",
  "exported_at": "2026-05-07T10:30:00Z",
  "version": "1.0",
  "state": {
    "memory": { ... },
    "context": { ... },
    "config": { ... }
  }
}
```

---

### 3.3 执行记录查询

前端通过 Backend API 查询 Runtime 层的执行记录：

```
GET    /api/v1/executions/:id              // 获取执行详情
GET    /api/v1/executions/:id/logs         // 获取执行日志
GET    /api/v1/agents/:agentId/executions  // 列出 Agent 的执行记录
```

**Runtime 层需要提供**：
- 执行记录的持久化存储
- 执行日志的流式输出（支持实时查看）
- 执行历史的分页查询

---

## 4. 前端的职责边界

### 4.1 前端只负责

1. **UI 渲染**：展示数据、接收用户输入
2. **API 调用**：通过 React Query 调用 Backend API
3. **状态管理**：管理前端的 UI 状态和缓存
4. **乐观更新**：提升用户体验（如发送消息时立即显示）
5. **错误处理**：展示错误提示、处理重试逻辑

### 4.2 前端不负责

1. **业务逻辑**：所有业务规则由 Backend 层处理
2. **数据持久化**：所有数据存储由 Backend 层负责
3. **权限验证**：前端只做 UI 层面的权限控制，真正的权限验证在 Backend
4. **Agent 运行时**：Agent 的启动、停止、状态管理由 Runtime 层负责
5. **数据同步**：飞书同步、消息推送等由 Backend 层负责

---

## 5. 跨层协作建议

### 5.1 API 设计原则

1. **RESTful 风格**：使用标准的 HTTP 方法（GET/POST/PUT/DELETE）
2. **统一的错误格式**：
   ```json
   {
     "error": {
       "code": "TASK_ALREADY_CLAIMED",
       "message": "任务已被其他人认领",
       "details": { ... }
     }
   }
   ```
3. **分页参数统一**：使用 `limit` 和 `before`/`after` 参数
4. **版本控制**：所有 API 路径包含版本号（如 `/api/v1/...`）

### 5.2 WebSocket 协议

1. **消息格式统一**：所有 WebSocket 消息包含 `type` 和 `data` 字段
2. **心跳机制**：每 30 秒发送一次 ping/pong
3. **断线重连**：前端自动重连，Backend 支持消息补发

### 5.3 错误处理

1. **HTTP 状态码**：
   - `401` - 未认证（前端跳转到登录页）
   - `403` - 无权限（前端显示权限不足提示）
   - `409` - 冲突（如任务已被认领）
   - `500` - 服务器错误（前端显示重试按钮）

2. **重试策略**：
   - 前端使用指数退避重试（1s, 2s, 4s, 8s...）
   - 最多重试 3 次
   - 网络错误和 5xx 错误才重试，4xx 错误不重试

---

## 6. 下一步行动

### 6.1 Backend 层需要做的

1. **实现所有 API 端点**（参考 2.1 节）
2. **实现 WebSocket 推送**（参考 2.2 节）
3. **实现飞书集成**（参考 2.3 节）
4. **编写 API 文档**（OpenAPI/Swagger 格式）

### 6.2 Runtime 层需要做的

1. **实现 Agent 状态管理**（参考 3.1 节）
2. **实现状态导出/导入**（参考 3.2 节）
3. **实现执行记录查询**（参考 3.3 节）
4. **提供 Runtime API 给 Backend 层调用**

### 6.3 表现层需要做的

1. **等待 Backend API 就绪后开始实现 UI**
2. **根据实际 API 响应格式调整 Hook 实现**
3. **编写 E2E 测试验证完整流程**

---

## 7. 总结

前端文档中的跨层内容已识别完毕：

- **01-api-integration.md** - 列出了所有需要 Backend 提供的 API 端点
- **02-feature-flows.md** - 描述了完整的调用流程，涉及 Frontend → Backend → Runtime
- **04-feishu-integration-ui.md** - 描述了飞书集成的前端适配，需要 Backend 提供 OAuth 和同步功能

**前端的职责**：只负责 UI 和 API 调用，不涉及业务逻辑和数据持久化。

**Backend 的职责**：提供所有 API 端点、WebSocket 推送、飞书集成、权限验证。

**Runtime 的职责**：提供 Agent 运行时管理、状态导出/导入、执行记录查询。

表现层已完成文档优化，等待 Backend 和 Runtime 层实现相应功能后，前端可以开始 UI 开发。
