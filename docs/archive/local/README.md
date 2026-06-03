# Cove Local Device Client

完整的 Local Device 客户端实现，支持连接到 Cloud Backend 并在本地执行 LLM 任务。

## 功能特性

- ✅ WebSocket 实时通信（基于 tRPC）
- ✅ 消息队列和任务管理（SQLite）
- ✅ 配置同步和热更新
- ✅ 健康监控和自动重连
- ✅ 支持 Anthropic 和 OpenAI LLM
- ✅ 流式响应支持
- ✅ 优雅关闭和错误恢复
- ✅ 结构化日志

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

创建配置文件 `config.json`：

```bash
cp config.example.json config.json
```

编辑 `config.json`，填入你的配置：

```json
{
  "server": {
    "url": "http://localhost:3000"
  },
  "device": {
    "id": "device-001",
    "name": "My Local Device",
    "apiKey": "your-device-api-key",
    "realmId": "your-realm-id"
  },
  "local": {
    "dataDir": "~/.cove",
    "heartbeatInterval": 30000,
    "reconnectDelay": 5000,
    "maxConcurrentTasks": 3
  }
}
```

### 3. 设置环境变量

```bash
# LLM API Keys
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export OPENAI_API_KEY="your-openai-api-key"

# 可选：日志级别
export LOG_LEVEL="info"  # debug, info, warn, error
```

### 4. 运行

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm run build
npm start
```

## 配置说明

### 命令行参数

```bash
npm start -- \
  --server http://localhost:3000 \
  --device-id device-001 \
  --api-key your-api-key \
  --realm-id your-realm-id
```

### 配置文件

配置文件路径优先级：

1. `--config` 参数指定的路径
2. `CONFIG_PATH` 环境变量
3. 当前目录的 `config.json`
4. `~/.cove/config.json`

### 环境变量

- `ANTHROPIC_API_KEY` - Anthropic API 密钥
- `OPENAI_API_KEY` - OpenAI API 密钥
- `LOG_LEVEL` - 日志级别（debug, info, warn, error）
- `CONFIG_PATH` - 配置文件路径

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Device Client                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ DeviceClient (主控制器)                                │  │
│  │  ├─ 初始化所有组件                                     │  │
│  │  ├─ 启动生命周期管理                                   │  │
│  │  ├─ 启动消息处理循环                                   │  │
│  │  └─ 处理优雅关闭                                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ tRPC WebSocket Client                                  │  │
│  │  ├─ deviceSubscription.connect (订阅)                  │  │
│  │  ├─ deviceSubscription.heartbeat (心跳)                │  │
│  │  └─ deviceSubscription.reportTaskResult (报告)         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ MessageOrchestrator                                    │  │
│  │  ├─ 接收 Backend 推送的消息                            │  │
│  │  ├─ 入队到 SQLite MessageQueue                         │  │
│  │  ├─ 轮询处理消息                                       │  │
│  │  └─ 调用 DeviceProcessor 处理                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ DeviceProcessor                                        │  │
│  │  ├─ 通过 BackendGateway 获取配置和历史                 │  │
│  │  ├─ 调用 AdapterManager 执行 LLM                       │  │
│  │  ├─ 流式推送响应到 Backend                             │  │
│  │  └─ 保存最终结果                                       │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 组件说明

### DeviceClient

主控制器，负责：
- 初始化所有组件
- 管理组件生命周期
- 处理优雅关闭

### TrpcWebSocketClient

WebSocket 客户端，负责：
- 建立和维护 WebSocket 连接
- 自动心跳和重连
- 订阅和处理 Backend 消息

### MessageOrchestrator

消息编排器，负责：
- 消息队列管理
- 任务调度和执行
- 错误处理和重试

### DeviceProcessor

设备处理器，负责：
- 调用 LLM API
- 流式响应处理
- 结果保存

### ConfigurationService

配置服务，负责：
- 配置同步
- 增量更新
- 配置验证

### DeviceLifecycleManager

生命周期管理器，负责：
- 连接管理
- 健康监控
- 错误恢复

## 日志

日志输出格式：

```
[2024-01-01T12:00:00.000Z] INFO  Starting Device Client {"deviceId":"device-001","serverUrl":"http://localhost:3000"}
[2024-01-01T12:00:01.000Z] INFO  Connected to backend
[2024-01-01T12:00:02.000Z] DEBUG Received message from backend {"type":"task","timestamp":"2024-01-01T12:00:02.000Z"}
```

日志级别：
- `debug` - 详细调试信息
- `info` - 一般信息
- `warn` - 警告信息
- `error` - 错误信息

## 故障排查

### 连接失败

检查：
1. Backend 是否运行
2. `server.url` 配置是否正确
3. 网络连接是否正常

### 认证失败

检查：
1. `device.apiKey` 是否正确
2. `device.realmId` 是否正确
3. Device 是否已在 Backend 注册

### LLM 调用失败

检查：
1. `ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY` 是否设置
2. API Key 是否有效
3. 网络是否能访问 LLM API

### 数据库错误

检查：
1. `local.dataDir` 目录是否存在且可写
2. 磁盘空间是否充足

## 开发

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

### 代码检查

```bash
npm run lint
```

## 许可证

MIT
- 🔄 **Auto Reconnect**: Resilient connection with exponential backoff
- ❤️ **Health Monitoring**: Automatic heartbeat and connection status

## Installation

### Option 1: npx (Recommended)

Run directly without installation:

```bash
npx @cove/local-device
```

### Option 2: Global Installation

Install globally and run as a command:

```bash
npm install -g @cove/local-device
cove-local-device
```

### Option 3: Local Installation

Install in your project:

```bash
npm install @cove/local-device
npx cove-local-device
```

## Quick Start

### 1. First Run

On first run, the agent will guide you through setup:

```bash
npx @cove/local-device
```

You'll be prompted to:
1. Enter your Cove Cloud URL (e.g., `ws://localhost:3002`)
2. Enter your device name (e.g., "My MacBook Pro")
3. Enter your API key (get from Cove Cloud dashboard)

### 2. Configuration

The configuration file is automatically created at:
- **macOS/Linux**: `~/.cove/config.json`
- **Windows**: `%USERPROFILE%\.cove\config.json`

Example configuration:

```json
{
  "cloudUrl": "ws://localhost:3002",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceName": "My MacBook Pro",
  "apiKey": "wn_xxxxxxxxxxxxxxxx",
  "maxConcurrentTasks": 3,
  "logLevel": "info"
}
```

### 3. Run the Agent

```bash
# Use default config
npx @cove/local-device

# Specify custom config
npx @cove/local-device --config /path/to/config.json

# Set log level
npx @cove/local-device --log-level debug
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cloudUrl` | string | - | Cove Cloud WebSocket URL |
| `deviceId` | string | auto | Unique device identifier |
| `deviceName` | string | - | Human-readable device name |
| `apiKey` | string | - | Device authentication key |
| `maxConcurrentTasks` | number | 3 | Max parallel tasks |
| `logLevel` | string | info | Log level (debug/info/warn/error) |

## Development

For local development:

```bash
# Clone repository
git clone https://github.com/kp-z/cove.git
cd cove/code/local

# Install dependencies
npm install

# Create config file
cp config.example.json config.json
# Edit config.json with your settings

# Run in development mode
npm run dev

# Build
npm run build

# Test locally
npm link
cove-local-device --help
```

## How It Works

1. **Connection**: Agent connects to Cove Cloud via WebSocket
2. **Authentication**: Authenticates using device ID and API key
3. **Registration**: Registers device capabilities and status
4. **Heartbeat**: Sends periodic heartbeat to maintain connection
5. **Task Execution**: Receives tasks, executes them, and reports results
6. **Auto Reconnect**: Automatically reconnects if connection is lost

## Security

- **API Key**: All requests are authenticated with API key
- **Realm Isolation**: Devices are isolated by realm
- **Secure WebSocket**: Supports WSS (WebSocket Secure)
- **No Code Injection**: Tasks are validated before execution

## Troubleshooting

### Connection Issues

```bash
# Check if Cove Cloud is running
curl http://localhost:3002/health

# Test WebSocket connection
wscat -c ws://localhost:3002
```

### Authentication Issues

```bash
# Verify API key in config
cat ~/.cove/config.json

# Check device registration in Cove Cloud dashboard
```

### Task Execution Issues

```bash
# Run in debug mode
npx @cove/local-device --log-level debug

# Check task logs in Cove Cloud
```

## License

MIT

## Support

- Documentation: https://docs.cove.ai
- Issues: https://github.com/kp-z/cove/issues
