# Cloud-Local 通信架构设计方案

## 命名策略

### 业务层（Domain/Application）
- **Realm**：工作空间/租户，业务隔离单元
- **Device**：计算资源实体，可以是物理机、虚拟机、容器等

### 部署层（Infrastructure/Physical）
- **Cloud**：云端服务，运行 Backend + Frontend，部署在远程服务器
- **Local**：本地服务，运行 Device Agent，部署在用户本地机器

### 命名对应关系
```
业务层                    部署层
Realm (工作空间)    ←→   无直接对应（逻辑概念）
Device (计算资源)   ←→   Local (物理节点)
```

**关键理解**：
- 一个 Local 实例对应一个 Device 实体
- Device 是业务层的抽象，Local 是部署层的实现
- Device 属于某个 Realm，Local 连接到 Cloud

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                          Cloud                               │
│                     (远程云端服务器)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   Backend    │  │   Database   │      │
│  │   (React)    │  │  (FastAPI)   │  │   (SQLite)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                                 │
│         │                  │ WebSocket Gateway               │
│         │                  ├─────────────────────────────────┤
│         │                  │ DeviceConnectionManager         │
│         │                  │ TaskDispatchService             │
│         │                  │ DeviceAuthService               │
│         │                  └─────────────────────────────────┘
└─────────────────────────────┬───────────────────────────────┘
                              │
                              │ WSS (WebSocket Secure)
                              │ Device API Key 认证
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   Local-1   │  │   Local-2   │  │   Local-N   │
    │  (用户本地)  │  │  (用户本地)  │  │  (用户本地)  │
    ├─────────────┤  ├─────────────┤  ├─────────────┤
    │ Device Agent│  │ Device Agent│  │ Device Agent│
    │ TaskExecutor│  │ TaskExecutor│  │ TaskExecutor│
    │ LLM Adapters│  │ LLM Adapters│  │ LLM Adapters│
    └─────────────┘  └─────────────┘  └─────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
    本地文件系统      本地文件系统      本地文件系统
```

---

## 核心组件

### 1. Cloud 组件

#### 1.1 DeviceConnectionManager
**职责**：管理 Local 实例的 WebSocket 连接

```typescript
// src/application/services/device/device-connection.service.ts
export class DeviceConnectionManager {
  private connections = new Map<string, LocalConnection>();
  
  // Local 实例注册（WebSocket 握手）
  async registerLocal(
    deviceId: string,
    apiKey: string,
    realmId: string,
    emit: (msg: LocalMessage) => void
  ): Promise<void> {
    // 1. 验证 API Key
    const device = await this.deviceAuthService.authenticateDevice(
      deviceId,
      apiKey,
      realmId
    );
    
    // 2. 检查 Device 是否属于该 Realm
    if (device.realm_id !== realmId) {
      throw new UnauthorizedError('Device does not belong to this realm');
    }
    
    // 3. 注册连接
    this.connections.set(deviceId, {
      deviceId,
      realmId,
      emit,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    });
    
    // 4. 更新 Device 状态为 online
    await this.deviceService.updateDevice(deviceId, { status: 'online' });
    
    // 5. 发布事件
    await this.eventBus.publish({
      eventType: 'local.connected',
      aggregateId: deviceId,
      payload: { deviceId, realmId },
    });
  }
  
  // 发送任务到 Local 实例
  async sendTask(deviceId: string, task: TaskPayload): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (!connection) {
      throw new DeviceOfflineError(deviceId);
    }
    
    connection.emit({
      type: 'task.dispatch',
      taskId: task.taskId,
      realmId: task.realmId,
      userId: task.userId,
      agentId: task.agentId,
      input: task.input,
    });
  }
  
  // 心跳检测
  async handleHeartbeat(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.lastHeartbeat = new Date();
      await this.deviceService.updateDeviceHeartbeat(deviceId);
    }
  }
  
  // Local 实例断线
  async unregisterLocal(deviceId: string): Promise<void> {
    this.connections.delete(deviceId);
    await this.deviceService.updateDevice(deviceId, { status: 'offline' });
    
    // 重新调度该 Local 实例上的任务
    await this.taskDispatchService.rescheduleDeviceTasks(deviceId);
  }
}
```

#### 1.2 TaskDispatchService
**职责**：任务调度和分发

```typescript
// src/application/services/task/task-dispatch.service.ts
export class TaskDispatchService {
  // 分发任务到 worknode
  async dispatchTask(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    
    // 1. 选择合适的 worknode
    const device = await this.selectWorknode(task);
    
    // 2. 验证 Device 属于任务所在的 Realm
    if (device.realm_id !== task.realmId) {
      throw new Error('Device cannot execute tasks from other realms');
    }
    
    // 3. 构建任务 Payload（包含 Realm 上下文）
    const payload: TaskPayload = {
      taskId: task.taskId,
      realmId: task.realmId,  // ← 传递 realmId
      userId: task.createdBy,  // ← 传递 userId
      agentId: task.agentId,
      input: task.input,
    };
    
    // 4. 更新任务状态
    await this.taskService.updateTask(taskId, {
      status: 'dispatched',
      assignedDeviceId: device.device_id,
      dispatchedAt: new Date(),
    });
    
    // 5. 发送任务到 worknode
    await this.connectionManager.sendTask(device.device_id, payload);
  }
  
  // 选择 Local 实例（负载均衡）
  private async selectLocal(task: TaskEntity): Promise<DeviceEntity> {
    // 获取该 Realm 下所有在线的 Device
    const devices = await this.deviceService.getDevicesByRealmAndStatus(
      task.realmId,
      'online'
    );
    
    if (devices.length === 0) {
      throw new NoAvailableLocalError(task.realmId);
    }
    
    // 评分算法
    const scores = devices.map(device => ({
      device,
      score: this.calculateScore(device, task),
    }));
    
    // 选择得分最高的 Local 实例
    return scores.sort((a, b) => b.score - a.score)[0].device;
  }
  
  private calculateScore(device: DeviceEntity, task: TaskEntity): number {
    let score = 100;
    
    // 负载因素（权重 40%）
    const config = JSON.parse(fs.readFileSync(device.configPath, 'utf-8'));
    score -= (config.activeTaskCount || 0) * 10;
    score -= (config.cpuUsage || 0) * 0.3;
    score -= (config.memoryUsage || 0) * 0.1;
    
    // 亲和性因素（权重 30%）
    if (config.lastExecutedAgentId === task.agentId) {
      score += 30;  // 缓存命中
    }
    
    // 地域因素（权重 20%）
    if (config.region === task.preferredRegion) {
      score += 20;
    }
    
    // 性能因素（权重 10%）
    score += (config.specs?.cpu_cores || 0) * 2;
    score += (config.specs?.memory_gb || 0) * 0.5;
    
    return score;
  }
}
```

#### 1.3 DeviceAuthService
**职责**：Local 实例认证

```typescript
// src/application/services/device/device-auth.service.ts
export class DeviceAuthService {
  // 生成 API Key
  async generateApiKey(deviceId: string): Promise<string> {
    const apiKey = `local_${crypto.randomBytes(32).toString('hex')}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 10);
    
    // 存储哈希值
    const device = await this.deviceService.getDeviceById(deviceId);
    const config = JSON.parse(fs.readFileSync(device.configPath, 'utf-8'));
    config.apiKeyHash = apiKeyHash;
    fs.writeFileSync(device.configPath, JSON.stringify(config, null, 2));
    
    return apiKey;  // 只返回一次，用户需要保存
  }
  
  // 验证 API Key
  async authenticateDevice(
    deviceId: string,
    apiKey: string,
    realmId: string
  ): Promise<DeviceEntity> {
    const device = await this.deviceService.getDeviceById(deviceId);
    
    // 验证 Device 属于该 Realm
    if (device.realm_id !== realmId) {
      throw new UnauthorizedError('Device does not belong to this realm');
    }
    
    // 验证 API Key
    const config = JSON.parse(fs.readFileSync(device.configPath, 'utf-8'));
    const isValid = await bcrypt.compare(apiKey, config.apiKeyHash);
    
    if (!isValid) {
      throw new UnauthorizedError('Invalid API key');
    }
    
    return device;
  }
}
```

### 2. Local 组件

#### 2.1 Device Agent
**职责**：连接 Cloud，执行任务

```typescript
// local/src/device-agent.ts
export class DeviceAgent {
  private wsClient: WebSocket;
  private taskExecutor: TaskExecutor;
  
  async connect(): Promise<void> {
    const config = this.loadConfig();
    
    // 连接到 Cloud（WSS）
    this.wsClient = new WebSocket(config.cloudUrl, {
      headers: {
        'x-device-id': config.deviceId,
        'x-api-key': config.apiKey,
        'x-realm-id': config.realmId,
      },
    });
    
    this.wsClient.on('open', () => {
      console.log('Connected to Cloud');
      this.startHeartbeat();
    });
    
    this.wsClient.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });
    
    this.wsClient.on('close', () => {
      console.log('Disconnected from Cloud');
      this.reconnect();
    });
  }
  
  private async handleMessage(message: LocalMessage): Promise<void> {
    switch (message.type) {
      case 'task.dispatch':
        await this.executeTask(message);
        break;
      case 'task.cancel':
        await this.cancelTask(message.taskId);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }
  
  private async executeTask(message: TaskDispatchMessage): Promise<void> {
    try {
      // 执行任务
      const result = await this.taskExecutor.execute({
        taskId: message.taskId,
        realmId: message.realmId,
        userId: message.userId,
        agentId: message.agentId,
        input: message.input,
      });
      
      // 发送结果到 Cloud
      this.wsClient.send(JSON.stringify({
        type: 'task.completed',
        taskId: message.taskId,
        result,
      }));
    } catch (error) {
      // 发送错误到 Cloud
      this.wsClient.send(JSON.stringify({
        type: 'task.failed',
        taskId: message.taskId,
        error: error.message,
      }));
    }
  }
  
  private startHeartbeat(): void {
    setInterval(() => {
      this.wsClient.send(JSON.stringify({
        type: 'heartbeat',
        deviceId: this.config.deviceId,
        timestamp: new Date().toISOString(),
      }));
    }, 30000);  // 每 30 秒一次心跳
  }
}
```

#### 2.2 TaskExecutor
**职责**：执行任务，管理并发

```typescript
// local/src/task-executor.ts
export class TaskExecutor {
  private runningTasks = new Map<string, AbortController>();
  private maxConcurrentTasks = 3;
  
  async execute(task: TaskPayload): Promise<TaskResult> {
    // 检查并发限制
    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      throw new Error('Local instance is at max capacity');
    }
    
    const abortController = new AbortController();
    this.runningTasks.set(task.taskId, abortController);
    
    try {
      // 执行任务（传递 realmId 和 userId）
      const result = await this.runtimeAdapter.execute(task, {
        signal: abortController.signal,
        context: {
          realmId: task.realmId,
          userId: task.userId,
        },
      });
      
      return result;
    } finally {
      this.runningTasks.delete(task.taskId);
    }
  }
  
  cancelTask(taskId: string): void {
    const controller = this.runningTasks.get(taskId);
    if (controller) {
      controller.abort();
      this.runningTasks.delete(taskId);
    }
  }
}
```

---

## 通信协议

### 1. Local → Cloud

#### 1.1 注册（WebSocket 握手）
```json
{
  "type": "local.register",
  "deviceId": "device-xxx",
  "apiKey": "local_xxxxxxxxxx",
  "realmId": "realm-xxx",
  "specs": {
    "cpu_cores": 8,
    "memory_gb": 16,
    "storage_gb": 512
  }
}
```

#### 1.2 心跳
```json
{
  "type": "heartbeat",
  "deviceId": "device-xxx",
  "timestamp": "2026-05-20T10:00:00Z",
  "stats": {
    "activeTaskCount": 2,
    "cpuUsage": 45.5,
    "memoryUsage": 60.2
  }
}
```

#### 1.3 任务完成
```json
{
  "type": "task.completed",
  "taskId": "task-xxx",
  "result": {
    "output": "...",
    "duration": 120,
    "logs": ["..."]
  }
}
```

#### 1.4 任务失败
```json
{
  "type": "task.failed",
  "taskId": "task-xxx",
  "error": "Error message",
  "stackTrace": "..."
}
```

### 2. Cloud → Local

#### 2.1 任务分发
```json
{
  "type": "task.dispatch",
  "taskId": "task-xxx",
  "realmId": "realm-xxx",
  "userId": "user-xxx",
  "agentId": "agent-xxx",
  "input": {
    "prompt": "...",
    "context": {}
  }
}
```

#### 2.2 任务取消
```json
{
  "type": "task.cancel",
  "taskId": "task-xxx",
  "reason": "User cancelled"
}
```

---

## 数据模型

### 1. Device 表扩展

```prisma
model Device {
  id          String   @id
  realmId     String   // ← 业务层：属于哪个 Realm
  name        String   // ← 部署层：worknode 名称
  displayName String?
  type        String   // physical, virtual, container, cloud
  status      String   // provisioning, online, offline, maintenance, error, decommissioned
  platform    String?  // darwin, linux, windows
  configPath  String   // 指向 .cove/storage/devices/{id}.json
  lastSeenAt  DateTime?
  createdAt   DateTime
  updatedAt   DateTime
  
  @@index([realmId, status])
  @@unique([realmId, name])
}
```

### 2. Device Config 文件（configPath）

```json
{
  "device_id": "device-xxx",
  "realm_id": "realm-xxx",
  "name": "local-macbook-pro",
  "display_name": "MacBook Pro (2023)",
  
  // 🔒 认证
  "apiKeyHash": "$2b$10$...",
  
  // 📊 规格
  "specs": {
    "cpu_cores": 8,
    "memory_gb": 16,
    "storage_gb": 512,
    "gpu_count": 1,
    "gpu_model": "Apple M2"
  },
  
  // 🌐 网络
  "network": {
    "hostname": "macbook-pro.local",
    "ip_address": "192.168.1.100"
  },
  
  // 🏷️ 调度标签
  "region": "us-west",
  "tags": ["development", "high-memory"],
  
  // 📈 运行时状态
  "activeTaskCount": 2,
  "totalTasksExecuted": 150,
  "averageTaskDuration": 45.5,
  "lastExecutedAgentId": "agent-xxx",
  "cpuUsage": 45.5,
  "memoryUsage": 60.2,
  
  // 🔧 配置
  "maxConcurrentTasks": 3,
  "maxMemoryPerTask": 2048,
  "maxCpuPerTask": 2
}
```

### 3. Task 表扩展

```prisma
model Task {
  id          String   @id
  title       String
  description String?
  status      String   // pending, dispatched, running, completed, failed, cancelled, timeout
  priority    String   // P0, P1, P2, P3
  projectId   String
  channelId   String?
  assigneeId  String?
  detailsPath String
  
  // 🆕 任务调度字段
  realmId           String    // ← 任务属于哪个 Realm
  assignedDeviceId  String?   // ← 分配到哪个 Device（Local 实例）
  dispatchedAt      DateTime? // ← 分发时间
  startedAt         DateTime? // ← 开始执行时间
  completedAt       DateTime? // ← 完成时间
  retryCount        Int       @default(0)
  maxRetries        Int       @default(3)
  timeoutSeconds    Int       @default(300)
  
  createdAt   DateTime
  updatedAt   DateTime
  dueDate     DateTime?
  
  project     Project  @relation(fields: [projectId], references: [id])
  
  @@index([projectId])
  @@index([status])
  @@index([priority])
  @@index([assigneeId])
  @@index([realmId, status])
  @@index([assignedDeviceId, status])
}
```

---

## 安全机制

### 1. Local 实例认证
- **API Key 生成**：`local_` 前缀 + 64 字符随机字符串
- **存储方式**：bcrypt 哈希存储在 Device config 文件中
- **传输方式**：WebSocket 握手时通过 HTTP Header 传递
- **验证流程**：
  1. Local 实例连接时提供 deviceId + apiKey + realmId
  2. Cloud 验证 API Key 哈希
  3. Cloud 验证 Device 属于该 Realm
  4. 验证通过后建立 WebSocket 连接

### 2. Realm 隔离
- **任务分发时验证**：Device.realm_id === Task.realmId
- **任务执行时传递**：TaskPayload 包含 realmId 和 userId
- **数据访问隔离**：Local 实例调用 Cloud API 时传递 realmId

### 3. 数据传输加密
- **协议**：WSS（WebSocket Secure）
- **配置**：`CLOUD_URL=wss://server.com`（强制 HTTPS）
- **证书**：使用 Let's Encrypt 或云服务商提供的证书

### 4. 任务取消机制
- **用户取消**：Cloud 发送 `task.cancel` 消息到 Local 实例
- **Local 实现**：使用 AbortController 中断任务执行
- **超时取消**：Cloud 监控任务执行时间，超时自动取消

---

## 实施计划

### 阶段 0：MVP 验证（1.5周）

**目标**：验证 Cloud-Local 通信 + 基础任务调度

**范围**：
- 单 Local 实例场景
- 简化的 API Key 认证（bcrypt 哈希）
- 基础的 WebSocket 连接管理
- 简单的任务分发（无负载均衡）
- 心跳检测（复用 lastSeenAt）
- Realm 隔离验证

**产出**：
- DeviceConnectionManager（基础版）
- TaskDispatchService（基础版）
- DeviceAuthService
- Local Device Agent
- 可运行的 Demo

**验收标准**：
- ✅ Local 实例可以连接到 Cloud
- ✅ Cloud 可以分发任务到 Local 实例
- ✅ Local 实例可以执行任务并返回结果
- ✅ 心跳检测正常工作
- ✅ Realm 隔离验证通过

### 阶段 1：安全加固（1.5周）

**目标**：完善安全机制

**范围**：
- WSS（WebSocket Secure）
- API Key 轮换机制
- 任务状态机（pending → dispatched → running → completed）
- 任务超时检测
- 任务重试机制
- 错误处理和日志

**产出**：
- 完整的认证流程
- 任务状态管理
- 错误恢复机制

**验收标准**：
- ✅ WSS 连接正常工作
- ✅ API Key 可以轮换
- ✅ 任务超时自动取消
- ✅ 任务失败自动重试
- ✅ 错误日志完整

### 阶段 2：任务调度优化（2周）

**目标**：实现负载均衡和任务取消

**范围**：
- 负载均衡算法（评分系统）
- 多 worknode 支持
- 任务取消机制（AbortController）
- 并发控制（maxConcurrentTasks）
- 任务队列管理
- worknode 故障转移

**产出**：
- 完整的任务调度系统
- 负载均衡算法
- 任务取消功能

**验收标准**：
- ✅ 多 worknode 负载均衡正常
- ✅ 任务可以取消
- ✅ worknode 故障时任务自动重新调度
- ✅ 并发控制正常工作

### 阶段 3：监控和运维（1周）

**目标**：监控和管理界面

**范围**：
- 性能监控（任务执行时间、成功率）
- worknode 状态监控（CPU、内存、任务数）
- 前端管理界面（worknode 列表、任务列表）
- 告警机制（worknode 离线、任务失败率高）

**产出**：
- 监控仪表板
- 管理界面
- 告警系统

**验收标准**：
- ✅ 可以查看所有 worknode 状态
- ✅ 可以查看任务执行历史
- ✅ worknode 离线时收到告警
- ✅ 任务失败率高时收到告警

---

## 部署清单

### MainServer 环境变量

```bash
# .env
DATABASE_URL=file:./.cove/database/cove.db
STORAGE_PATH=./.cove/storage
JWT_SECRET=your-secret-key
WEBSOCKET_PORT=3001
MAX_WORKNODES_PER_REALM=100
TASK_TIMEOUT_SECONDS=300
HEARTBEAT_TIMEOUT_SECONDS=90
```

### worknode 环境变量

```bash
# worknode/.env
MAINSERVER_URL=wss://your-server.com
DEVICE_ID=device-001
DEVICE_NAME=worknode-macbook-pro
DEVICE_API_KEY=wn_xxxxxxxxxx
REALM_ID=realm-xxx
MAX_CONCURRENT_TASKS=3
ANTHROPIC_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
```

---

## 风险评估

| 风险 | 严重性 | 缓解措施 |
|------|--------|----------|
| SQLite 并发写入瓶颈 | 高 | 短期：优化查询 + 索引<br>中期：迁移 PostgreSQL |
| WebSocket 连接数限制 | 中 | 使用 Node.js Cluster 模式<br>单进程支持 10k+ 连接 |
| worknode 恶意行为 | 高 | API Key 认证 + Realm 隔离<br>资源使用监控和限制 |
| 任务调度不公平 | 中 | 实现评分算法<br>添加任务队列长度限制 |
| 网络分区导致任务重复执行 | 中 | 任务幂等性设计<br>任务状态机 |

---

## 总结

### 命名对齐
- ✅ 业务层：Realm + Device
- ✅ 部署层：MainServer + worknode
- ✅ 清晰的分层，避免混淆

### 架构优势
- ✅ 完全契合现有代码（Device 基础设施已完成 80%）
- ✅ 改造成本低（6周完成）
- ✅ 安全机制完善（API Key + Realm 隔离 + WSS）
- ✅ 扩展性好（支持多 worknode + 负载均衡）

### 下一步
1. 确认方案
2. 启动阶段 0：MVP 验证（1.5周）
3. 创建开发分支
4. 开始实施
