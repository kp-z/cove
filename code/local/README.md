# Cove Local Device Agent

Local device agent that connects to Cove Cloud backend and executes tasks locally.

## Features

- WebSocket connection to Cloud backend
- Task execution with LLM adapters
- Automatic reconnection
- Heartbeat monitoring
- Task cancellation support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create configuration file:
```bash
cp config.example.json config.json
```

3. Update `config.json` with your settings:
   - `server.url`: Cloud backend WebSocket URL
   - `device.id`: Your device ID
   - `device.apiKey`: Device API key (get from Cloud backend)
   - `device.realmId`: Your realm ID

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Configuration

See `config.example.json` for all available options.

## Data Directory

By default, the agent uses `~/.cove/` for:
- Agent definitions and memory
- File storage
- Local cache
