# Application Layer

Application Layer 是 Slock 系统的核心执行层，负责 Agent 的生命周期管理、技能执行、状态管理和持久化。

## 目录结构

```
runtime/
├── design/              # 设计文档
│   └── runtime-layer.md # Application Layer 完整设计文档
└── examples/            # 示例配置和数据
    ├── daemon/          # Daemon 配置示例
    ├── gateway/         # Gateway 配置示例
    ├── startup/         # Startup 配置示例
    ├── channel-runtime/ # Channel Runtime 示例
    ├── execution-runtime/ # Execution Runtime 示例
    └── workflow-runtime/  # Workflow Runtime 示例
```

## 核心组件

### 1. Daemon
Agent 运行时守护进程，负责：
- Agent 进程生命周期管理
- 资源监控和限制
- 崩溃恢复和重启策略

**配置示例**: `examples/daemon/daemon.yaml`

### 2. Gateway
Runtime 网关层，负责：
- 请求路由和负载均衡
- 协议转换（HTTP/WebSocket/gRPC）
- 认证和授权

**配置示例**: `examples/gateway/gateway.yaml`

### 3. Startup
Agent 启动流程，负责：
- 环境初始化
- 依赖注入
- 配置加载

**配置示例**: `examples/startup/startup.yaml`

### 4. Channel Runtime
消息通道运行时，负责：
- 消息路由和分发
- 通道订阅管理
- 消息持久化

**配置示例**: `examples/channel-runtime/channel-runtime.yaml`

### 5. Execution Runtime
技能执行运行时，负责：
- 技能调度和执行
- 执行上下文管理
- 执行日志记录

**配置示例**: `examples/execution-runtime/execution-runtime.yaml`  
**执行日志示例**: `examples/execution-runtime/execution.jsonl`

### 6. Workflow Runtime
工作流运行时，负责：
- 工作流编排
- 状态机管理
- 任务依赖解析

**配置示例**: `examples/workflow-runtime/workflow-runtime.yaml`

## 快速开始

1. 阅读完整设计文档：`design/runtime-layer.md`
2. 查看对应组件的示例配置：`examples/<component>/`
3. 参考示例配置部署和测试

## 相关文档

- [Domain Layer](../entities/) - 实体定义和数据模型
- [Backend API](../backend/) - 后端 API 接口
- [Presentation Layer](../frontend/) - 前端界面层
