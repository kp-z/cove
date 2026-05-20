# Cove Local Agent

Connect your local machine to Cove Cloud and execute AI agent tasks locally.

## Features

- 🔌 **WebSocket Connection**: Real-time communication with Cove Cloud
- 🔐 **Secure Authentication**: API key-based device authentication
- 🤖 **AI Integration**: Support for Claude (Anthropic) and GPT (OpenAI)
- 📊 **Task Management**: Automatic task execution and result reporting
- 🔄 **Auto Reconnect**: Resilient connection with exponential backoff
- ❤️ **Health Monitoring**: Automatic heartbeat and connection status

## Installation

### Option 1: npx (Recommended)

Run directly without installation:

```bash
npx @cove/local
```

### Option 2: Global Installation

Install globally and run as a command:

```bash
npm install -g @cove/local
cove-local
```

### Option 3: Local Installation

Install in your project:

```bash
npm install @cove/local
npx cove-local
```

## Quick Start

### 1. First Run

On first run, the agent will guide you through setup:

```bash
npx @cove/local
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
npx @cove/local

# Specify custom config
npx @cove/local --config /path/to/config.json

# Set log level
npx @cove/local --log-level debug
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
cove-local --help
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
npx @cove/local --log-level debug

# Check task logs in Cove Cloud
```

## License

MIT

## Support

- Documentation: https://docs.cove.ai
- Issues: https://github.com/kp-z/cove/issues
