# 部署架构设计方案

## Context（背景）

当前项目是一个多租户协作平台，采用分层架构（Domain → Application → Infrastructure）。核心实体包括：

- **Server**：工作空间/团队空间（类似 Slack Workspace），是多租户隔离的基本单位
- **Device**：物理/虚拟计算资源，属于某个 Server，用于执行计算密集型任务
- **Agent**：AI 代理，执行任务需要调用 LLM
- **Task**：任务实体，可分配给 Agent 执行

**当前架构限制**：
- SQLite 单进程数据库（不支持并发写入）
- InMemoryEventBus（不支持跨进程通信）
- 本地文件存储（`.cove/storage/`）
- 所有服务运行在单个 Node.js 进程中

**部署需求**：
- 主服务器：部署前端 + 用户数据管理 + 任务调度
- Device：用户自己部署，执行实际的计算任务（Agent 执行、LLM 调用）
- Device 可能在防火墙后面，需要主动连接主服务器

---

## 推荐方案：Worker 节点模式

### 架构概述

Device 作为纯任务执行器（Worker），不存储业务数据，只负责计算密集型操作。主服务器负责所有数据管理和任务调度。

```
┌─────────────────────────────────────────────────────────────┐
│                      主服务器 (Main Server)                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)                                            │
│  └─ tRPC Client                                              │
├─────────────────────────────────────────────────────────────┤
│  Backend (Node.js)                                           │
│  ├─ tRPC API (HTTP + WebSocket)                             │
│  ├─ Application Services                                     │
│  │  ├─ TaskService (任务管理)                                │
│  │  ├─ DeviceService (设备管理)                              │
│  │  ├─ TaskDispatchService (任务调度) ← 新增                 │
│  │  └─ DeviceConnectionManager (设备连接管理) ← 新增          │
│  ├─ Domain Layer (业务逻辑)                                  │
│  └─ Infrastructure Layer                                     │
│     ├─ SQLite + File Storage (数据持久化)                    │
│     └─ InMemoryEventBus (事件总线)                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket (持久连接)
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Device 1    │  │  Device 2    │  │  Device 3    │
│  (Worker)    │  │  (Worker)    │  │  (Worker)    │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ DeviceAgent  │  │ DeviceAgent  │  │ DeviceAgent  │
│ ├─ WS Client │  │ ├─ WS Client │  │ ├─ WS Client │
│ ├─ Task      │  │ ├─ Task      │  │ ├─ Task      │
│ │  Executor  │  │ │  Executor  │  │ │  Executor  │
│ └─ Runtime   │  │ └─ Runtime   │  │ └─ Runtime   │
│    Adapters  │  │    Adapters  │  │    Adapters  │
│    (Claude,  │  │    (Claude,  │  │    (Claude,  │
│     OpenAI)  │  │     OpenAI)  │  │     OpenAI)  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 选择理由

1. **架构契合度高**：当前代码已经是单体架构，改造成本最低
2. **SQLite 限制**：边缘代理模式需要处理分布式数据同步，与 SQLite 单写限制冲突
3. **部署简单**：Device 无状态，易于扩展和维护
4. **故障恢复简单**：无数据一致性问题
5. **MVP 快速验证**：可以快速上线验证业务模型

---

## 实施计划

### 阶段 1：主服务器改造（核心基础设施）

#### 1.1 DeviceConnectionManager（设备连接管理器）

**文件位置**：`src/infrastructure/device/device-connection-manager.ts`

**职责**：
- 管理所有 Device 的 WebSocket 连接
- 处理 Device 注册、心跳、断线重连
- 提供任务分发接口

**核心接口**：
```typescript
class DeviceConnectionManager {
  private connections: Map<string, WebSocketConnection>
  
  // 注册 Device 连接
  registerDevice(deviceId: string, ws: WebSocket): void
  
  // 发送任务到 Device
  sendTask(deviceId: string, task: TaskPayload): Promise<void>
  
  // 处理心跳
  handleHeartbeat(deviceId: string): void
  
  // 获取在线 Device 列表
  getOnlineDevices(serverId?: string): DeviceEntity[]
  
  // 断开连接
  disconnectDevice(deviceId: string): void
}
```

#### 1.2 TaskDispatchService（任务调度服务）

**文件位置**：`src/application/services/task-dispatch/task-dispatch.service.ts`

**职责**：
- 选择最优 Device 执行任务
- 分发任务到 Device
- 处理任务结果和进度更新
- 任务超时和重新调度

**核心接口**：
```typescript
class TaskDispatchService {
  // 选择最优 Device（负载均衡）
  async selectDevice(task: TaskEntity): Promise<DeviceEntity>
  
  // 分发任务到 Device
  async dispatchTask(taskId: string, deviceId: string): Promise<void>
  
  // 处理任务进度更新
  async handleTaskProgress(taskId: string, progress: number): Promise<void>
  
  // 处理任务完成
  async handleTaskComplete(taskId: string, result: TaskResult): Promise<void>
  
  // 处理任务失败
  async handleTaskFailed(taskId: string, error: string): Promise<void>
  
  // 重新调度任务（Device 故障时）
  async rescheduleTask(taskId: string): Promise<void>
}
```

**调度策略**：
- 负载均衡：选择 CPU/内存使用率最低的 Device
- 亲和性：优先选择之前执行过相同 Agent 的 Device（缓存优化）
- 故障转移：Device 离线时自动重新调度任务

#### 1.3 扩展 DeviceService

**文件位置**：`src/application/services/device/device.service.ts`（已存在，需扩展）

**新增方法**：
```typescript
// 更新 Device 资源使用情况
async updateDeviceResources(deviceId: string, resources: {
  cpuUsage: number;
  memoryUsage: number;
  activeTaskCount: number;
}): Promise<DeviceEntity>

// 获取可用的 Device（在线且非维护状态）
async getAvailableDevices(serverId: string): Promise<DeviceEntity[]>
```

#### 1.4 扩展 TaskService

**文件位置**：`src/application/services/task/task.service.ts`（已存在，需扩展）

**新增字段**：
```typescript
interface TaskEntity {
  // ... 现有字段
  assignedDeviceId?: string;  // 分配的 Device ID
  dispatchedAt?: Date;        // 分发时间
  startedAt?: Date;           // 开始执行时间
  completedAt?: Date;         // 完成时间
  progress?: number;          // 执行进度 (0-1)
  executionLog?: string[];    // 执行日志
}
```

#### 1.5 WebSocket 路由

**文件位置**：`src/infrastructure/trpc/routers/device-ws.router.ts`（新增）

**端点**：
- `device.register`：Device 注册
- `device.heartbeat`：心跳
- `task.progress`：任务进度上报
- `task.complete`：任务完成
- `task.failed`：任务失败

**消息格式**：
```typescript
// Device → Server: 注册
{
  type: 'device.register',
  deviceId: 'device-xxx',
  specs: { cpu_cores: 8, memory_gb: 16 }
}

// Server → Device: 分发任务
{
  type: 'task.dispatch',
  taskId: 'task-xxx',
  payload: {
    agentId: 'agent-xxx',
    input: { ... }
  }
}

// Device → Server: 任务进度
{
  type: 'task.progress',
  taskId: 'task-xxx',
  progress: 0.5,
  status: 'running'
}

// Device → Server: 任务完成
{
  type: 'task.complete',
  taskId: 'task-xxx',
  result: { ... }
}
```

---

### 阶段 2：Device Agent 开发（独立项目）

#### 2.1 项目结构

**位置**：`device-agent/`（新建独立项目）

```
device-agent/
├── src/
│   ├── main.ts                    # 入口文件
│   ├── websocket/
│   │   ├── ws-client.ts           # WebSocket 客户端
│   │   └── reconnect-strategy.ts  # 重连策略
│   ├── executor/
│   │   ├── task-executor.ts       # 任务执行器
│   │   └── runtime-adapters/      # 运行时适配器
│   │       ├── claude-adapter.ts
│   │       └── openai-adapter.ts
│   ├── monitor/
│   │   └── resource-monitor.ts    # 资源监控
│   └── config/
│       └── device-config.ts       # 配置管理
├── package.json
├── tsconfig.json
└── .env.example
```

#### 2.2 WebSocket 客户端

**文件位置**：`device-agent/src/websocket/ws-client.ts`

**职责**：
- 连接主服务器
- 自动重连（指数退避：1s, 2s, 4s, 8s...）
- 发送心跳（每 30 秒）
- 接收任务分发

#### 2.3 任务执行器

**文件位置**：`device-agent/src/executor/task-executor.ts`

**职责**：
- 接收任务
- 调用对应的 Runtime Adapter
- 上报进度
- 返回结果

**核心接口**：
```typescript
class TaskExecutor {
  async execute(task: TaskPayload): Promise<TaskResult> {
    // 1. 解析任务类型
    // 2. 调用对应的 Runtime Adapter
    // 3. 定期上报进度
    // 4. 返回结果
  }
}
```

#### 2.4 Runtime Adapters

**复用现有代码**：
- 从主服务器的 `src/infrastructure/adapters/llm/` 复用代码
- 支持 Claude、OpenAI 等 LLM 提供商

---

### 阶段 3：故障恢复机制

#### 3.1 Device 故障检测

**心跳超时**：
- 30 秒未收到心跳 → 标记 Device 为 `offline`
- 正在执行的任务自动重新调度

**实现位置**：`DeviceConnectionManager`

#### 3.2 任务超时机制

**任务超时**：
- 默认 5 分钟超时
- 超时后自动重新调度到其他 Device

**实现位置**：`TaskDispatchService`

#### 3.3 Device 重连

**重连策略**：
- 指数退避：1s, 2s, 4s, 8s, 16s, 32s（最大 32 秒）
- 重连成功后重新注册
- 上报当前执行的任务状态

**实现位置**：`device-agent/src/websocket/reconnect-strategy.ts`

---

### 阶段 4：监控和日志

#### 4.1 Device 性能监控

**监控指标**：
- CPU 使用率
- 内存使用率
- 活跃任务数
- 任务队列长度

**上报频率**：每 60 秒

#### 4.2 任务执行日志

**日志收集**：
- Device 执行任务时生成日志
- 定期上传到主服务器
- 存储在 `.cove/storage/task-logs/{taskId}.log`

#### 4.3 前端管理界面

**新增页面**：
- Device 列表页（显示在线状态、资源使用情况）
- Device 详情页（显示任务历史、性能图表）
- 任务监控页（显示任务执行进度、日志）

---

## 关键文件

### 主服务器（需修改/新增）

- `src/infrastructure/device/device-connection-manager.ts`（新增）
- `src/application/services/task-dispatch/task-dispatch.service.ts`（新增）
- `src/application/services/device/device.service.ts`（扩展）
- `src/application/services/task/task.service.ts`（扩展）
- `src/infrastructure/trpc/routers/device-ws.router.ts`（新增）
- `src/infrastructure/trpc/routers/index.ts`（修改，添加 WebSocket 路由）
- `src/main.ts`（修改，初始化新服务）
- `src/domain/models/task/task.entity.ts`（扩展，添加 Device 相关字段）

### Device Agent（新建项目）

- `device-agent/src/main.ts`
- `device-agent/src/websocket/ws-client.ts`
- `device-agent/src/websocket/reconnect-strategy.ts`
- `device-agent/src/executor/task-executor.ts`
- `device-agent/src/executor/runtime-adapters/claude-adapter.ts`
- `device-agent/src/executor/runtime-adapters/openai-adapter.ts`
- `device-agent/src/monitor/resource-monitor.ts`
- `device-agent/src/config/device-config.ts`

---

## 数据存储策略

| 数据类型 | 存储位置 | 说明 |
|---------|---------|------|
| User/Server/Project | 主服务器 SQLite | 核心业务数据 |
| Task/Agent/Channel | 主服务器 SQLite | 任务和协作数据 |
| Message | 主服务器 SQLite + File | 消息索引 + 内容文件 |
| Device 元数据 | 主服务器 SQLite | Device 配置、状态 |
| Task 执行日志 | 主服务器 File | 执行过程日志 |
| Device 临时数据 | Device 内存 | 执行中的任务状态 |

---

## 验证计划

### 单元测试

- `DeviceConnectionManager` 的连接管理逻辑
- `TaskDispatchService` 的调度算法
- Device Agent 的重连策略

### 集成测试

1. **单 Device 场景**：
   - Device 注册 → 任务分发 → 任务执行 → 结果返回

2. **多 Device 负载均衡**：
   - 3 个 Device 注册
   - 分发 10 个任务
   - 验证任务均匀分布

3. **Device 故障转移**：
   - Device 执行任务中途断线
   - 验证任务自动重新调度到其他 Device

4. **网络分区**：
   - Device 断网 30 秒后恢复
   - 验证 Device 重连并继续工作

### E2E 测试

- 用户创建任务 → Device 执行 → 用户查看结果
- Device 管理界面：查看在线状态、资源使用情况

---

## 部署步骤

### 主服务器部署

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npx prisma migrate deploy

# 3. 启动服务
npm start
```

### Device 部署

```bash
# 1. 下载 Device Agent
curl -O https://server.com/device-agent.tar.gz
tar -xzf device-agent.tar.gz

# 2. 配置
cat > .env <<EOF
SERVER_URL=wss://server.com
DEVICE_ID=device-001
DEVICE_NAME=My Device
ANTHROPIC_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
EOF

# 3. 启动
./device-agent start
```

---

## 未来演进路径

### 短期（3-6 个月）

- 添加任务优先级队列
- 实现 Device 分组（按地域、性能分组）
- 支持 GPU 任务调度

### 中期（6-12 个月）

- 迁移到 PostgreSQL（支持并发写入）
- 实现分布式事件总线（Redis Pub/Sub 或 RabbitMQ）
- 支持 Device 横向扩展（Kubernetes）

### 长期（12+ 个月）

- 演进到混合模式（轻量任务 Worker 模式 + 重量任务 Edge 模式）
- 支持边缘计算场景
- 实现智能任务调度（基于历史数据的 ML 模型）

---

## 风险和缓解措施

### 风险 1：SQLite 性能瓶颈

**风险**：随着 Device 和任务数量增加，SQLite 可能成为瓶颈

**缓解**：
- 短期：优化查询，添加索引
- 中期：迁移到 PostgreSQL

### 风险 2：WebSocket 连接数限制

**风险**：单个 Node.js 进程的 WebSocket 连接数有限

**缓解**：
- 短期：使用 Cluster 模式（多进程）
- 中期：使用 Redis 作为 Pub/Sub 中间层

### 风险 3：任务调度公平性

**风险**：简单的负载均衡可能导致某些 Device 过载

**缓解**：
- 实现更复杂的调度算法（考虑任务类型、Device 能力）
- 添加任务队列长度限制

---

## 总结

Worker 节点模式是当前最适合的部署架构，原因：

1. **低改造成本**：复用现有代码结构，只需添加任务调度和连接管理
2. **简单可靠**：Device 无状态，故障恢复简单
3. **快速验证**：可以快速上线验证业务模型
4. **易于演进**：未来可以平滑演进到混合模式或边缘代理模式

实施周期约 8 周，分 4 个阶段逐步推进。
