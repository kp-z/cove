# ServerRuntime

## 概述

ServerRuntime 是 Runtime 层的核心组件，负责管理 Server 的运行时状态、进程生命周期和资源监控。它是 ServerEntity 的运行时表示，包含动态状态信息。

## 定位

- **层级**: Runtime 层
- **关系**: ServerRuntime 对应一个 ServerEntity，管理其运行时状态
- **生命周期**: 随 Server 进程启动而创建，进程终止时清理

## 核心字段

### 标识信息
- `server_id`: Server 的唯一标识符（对应 ServerEntity）
- `runtime_id`: Runtime 实例的唯一标识符
- `pid`: 进程 ID
- `started_at`: 启动时间

### 状态信息
- `status`: 运行状态（starting, running, stopping, stopped, error）
- `health`: 健康状态（healthy, degraded, unhealthy）
- `last_health_check`: 最后一次健康检查时间

### 资源使用
- `cpu_usage`: CPU 使用率（百分比）
- `memory_usage`: 内存使用量（字节）
- `disk_usage`: 磁盘使用量（字节）
- `network_rx`: 网络接收字节数
- `network_tx`: 网络发送字节数

### 连接信息
- `active_agents`: 当前活跃的 Agent 数量
- `active_connections`: 当前活跃连接数
- `total_requests`: 总请求数
- `error_count`: 错误计数

### 配置信息
- `config_version`: 配置版本号
- `environment`: 运行环境（development, staging, production）
- `log_level`: 日志级别

## 设计原则

### 1. 分离关注点
- **Entity**: 持久化配置和静态属性
- **Runtime**: 动态状态和运行时指标
- Runtime 不持久化到 Entity，而是通过监控系统采集

### 2. 实时性
- Runtime 数据应该是实时的或近实时的
- 通过定期采样更新状态信息
- 支持事件驱动的状态变更通知

### 3. 可观测性
- 提供丰富的运行时指标用于监控
- 支持健康检查和故障诊断
- 记录关键事件和状态转换

## 与其他组件的关系

### ServerEntity
- ServerRuntime 是 ServerEntity 的运行时表示
- ServerEntity 定义静态配置，ServerRuntime 反映动态状态
- ServerRuntime 启动时从 ServerEntity 加载配置

### AgentRuntime
- ServerRuntime 管理多个 AgentRuntime
- 跟踪每个 Agent 的运行状态
- 协调 Agent 的启动、停止和资源分配

### 监控系统
- ServerRuntime 向监控系统报告指标
- 接收健康检查请求
- 触发告警和自动恢复机制

## 示例场景

### 场景 1: Server 启动
1. 从 ServerEntity 加载配置
2. 创建 ServerRuntime 实例
3. 初始化资源和连接
4. 状态转换: starting → running
5. 开始接受 Agent 连接

### 场景 2: 健康检查
1. 监控系统定期调用健康检查接口
2. ServerRuntime 检查各项指标
3. 更新 health 状态
4. 如果 unhealthy，触发告警

### 场景 3: 资源监控
1. 定期采样 CPU、内存、磁盘使用情况
2. 更新 ServerRuntime 中的资源指标
3. 如果超过阈值，触发告警或限流
4. 记录到监控系统用于趋势分析

## 文件结构

ServerRuntime 通常不持久化为文件，而是存在于内存中。但为了调试和审计，可以定期快照到文件：

```
server-runtime/
├── server-runtime-{timestamp}.yaml  # 运行时状态快照
└── events.jsonl                     # 运行时事件日志
```

## 参考

- [ServerEntity](../01-entities/server/server-entity.md) - Server 的持久化定义
- [AgentRuntime](./agent-runtime.md) - Agent 的运行时状态
- [DaemonRuntime](./examples/daemon/daemon.yaml) - Daemon 的运行时示例
