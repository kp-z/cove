# Claude Code CLI Adapter

## Overview

The Claude Code CLI Adapter enables integration with the Claude Code CLI tool, allowing you to leverage Claude's capabilities through the command-line interface.

## Features

- ✅ Full CLI integration via `spawn`
- ✅ JSON and stream-json output parsing
- ✅ Extended thinking support
- ✅ Configurable timeout and working directory
- ✅ Temperature and token control
- ✅ System prompt support
- ✅ Conversation history handling
- ✅ Comprehensive error handling
- ✅ **Tool use support** (stream-json mode)
- ✅ **Session tracking** (session_id capture)
- ✅ **Tool result tracking** (success/error status)
- ✅ **Auto-approve tools** (--dangerously-skip-permissions)

## Tool Capabilities

### Automatic Tool Use

When `enableStreaming: true` (default), the adapter supports Claude's built-in tools:

- **Read** - Read files from the filesystem
- **Write** - Write files to the filesystem
- **Edit** - Edit existing files
- **Bash** - Execute shell commands
- **Agent** - Spawn sub-agents for parallel work
- **WebSearch** - Search the web
- **WebFetch** - Fetch web pages
- And more...

### Auto-Approve Mode

Set `skipPermissions: true` to automatically approve all tool calls without manual confirmation:

```typescript
const adapter = new ClaudeCodeCLIAdapter({
  enableStreaming: true,
  skipPermissions: true, // ⚠️ Use with caution
});
```

**⚠️ Security Warning**: This adds `--dangerously-skip-permissions` to the CLI, which bypasses all permission prompts. Only use in controlled environments where Claude has full access to your system.

### Tool Execution Tracking

The adapter captures:
- **Tool invocation**: When Claude calls a tool (status: `running`)
- **Tool result**: Success or error outcome (status: `success` | `error`)
- **Tool output**: The actual result content

Example callback flow:
```typescript
streaming: {
  onToolUse: (tool) => {
    if (tool.action === 'invoke') {
      console.log(`Tool started: ${tool.toolName}`, tool.params);
    } else if (tool.action === 'result') {
      console.log(`Tool finished: ${tool.status}`, tool.result);
    }
  }
}
```

## Skill Support

Claude Code CLI automatically discovers and loads skills from:
- `.claude/skills/` - Project-specific skills
- `~/.claude/skills/` - User-global skills

No adapter configuration needed - skills are available if present in the filesystem.

## Session Tracking

The adapter captures `session_id` from Claude CLI's `system.init` event (stream-json mode):

```typescript
streaming: {
  onUsage: (usage) => {
    console.log('Session ID:', usage.sessionId);
  }
}
```

Use this for:
- Correlating multiple API calls in the same session
- Debugging and troubleshooting
- Analytics and usage tracking

## Multi-Turn Conversations

The adapter supports persistent conversations where the CLI process stays alive across multiple turns:

### Requirements

- `enableStreaming: true`
- `useStreamInput: true`

### Usage Example

```typescript
const adapter = new ClaudeCodeCLIAdapter({
  enableStreaming: true,
  useStreamInput: true,
});

// Start conversation
const context = await adapter.startConversation('You are a helpful assistant');
console.log('Session ID:', context.sessionId);

// Send first message
const reply1 = await adapter.sendMessage(context, 'What is 2+2?');
console.log('Reply 1:', reply1);

// Send follow-up (context is preserved)
const reply2 = await adapter.sendMessage(context, 'What about 3+3?');
console.log('Reply 2:', reply2);

// Access conversation history
console.log('Messages:', context.messages);

// End conversation when done
adapter.endConversation(context);
```

### Benefits

- **Performance**: No need to restart the CLI process for each turn
- **Context preservation**: Conversation history is maintained
- **Efficiency**: Reuses the same session for multiple interactions

### Conversation Context

The `ConversationContext` object contains:
- `id`: Unique conversation identifier
- `sessionId`: Session ID from Claude CLI
- `messages`: Array of user/assistant message pairs
- `ended`: Whether the conversation has been terminated
- `process`: The underlying CLI process (internal use)

### Error Handling

```typescript
try {
  const context = await adapter.startConversation();
  const reply = await adapter.sendMessage(context, 'Hello');
  adapter.endConversation(context);
} catch (error) {
  console.error('Conversation error:', error);
}
```

Common errors:
- **Configuration error**: Throws if `useStreamInput` or `enableStreaming` is false
- **Ended conversation**: Throws if trying to send to an already-ended conversation
- **Timeout**: Rejects if message takes longer than configured timeout
- **Process error**: Rejects if CLI process crashes or exits unexpectedly

## Configuration

### Basic Configuration

```json
{
  "type": "claude-code-cli",
  "name": "My Claude CLI Adapter",
  "config": {
    "cli_path": "claude",
    "model": "opus"
  }
}
```

### Advanced Configuration

```json
{
  "type": "claude-code-cli",
  "name": "Advanced Claude CLI",
  "config": {
    "cli_path": "/usr/local/bin/claude",
    "model": "sonnet",
    "working_dir": "/path/to/project",
    "timeout_ms": 180000,
    "temperature": 0.7,
    "max_tokens": 8192,
    "context_window": 200000
  }
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cli_path` | string | `"claude"` | Path to the Claude CLI executable |
| `model` | string | `"opus"` | Model to use (opus, sonnet, haiku) |
| `working_dir` | string | `process.cwd()` | Working directory for CLI execution |
| `timeout_ms` | number | `120000` | Timeout in milliseconds (2 minutes) |
| `temperature` | number | - | Temperature for response generation (0-2) |
| `max_tokens` | number | - | Maximum tokens in response |
| `context_window` | number | - | Context window size |
| `enable_streaming` | boolean | `true` | Enable stream-json output for real-time events |
| `skip_permissions` | boolean | `false` | Auto-approve tools (⚠️ security risk) |
| `use_stream_input` | boolean | `false` | Use NDJSON input format (`--input-format=stream-json`) |

## CLI Arguments

The adapter automatically constructs CLI arguments:

```bash
claude -p \
  --output-format=json \
  --bare \
  --model opus \
  --no-session-persistence \
  --system-prompt "You are a helpful assistant" \
  --temperature 0.7 \
  --max-tokens 4096 \
  --context-window 200000 \
  --thinking \
  --thinking-budget 10000 \
  "User: Hello"
```

## Usage Example

### Creating an Adapter

```typescript
import { ClaudeCodeCLIAdapter } from './claude-code-cli-adapter';

const adapter = new ClaudeCodeCLIAdapter({
  cliPath: 'claude',
  model: 'opus',
  workingDir: '/tmp',
  timeout: 120000,
  temperature: 0.7,
  maxTokens: 4096,
  thinkingEnabled: true,
  thinkingBudget: 10000,
});
```

### Generating a Response

```typescript
const response = await adapter.generateResponse({
  systemPrompt: 'You are a helpful coding assistant',
  messages: [
    { role: 'user', content: 'Write a function to reverse a string' },
  ],
});

console.log(response);
```

## Extended Thinking

The adapter supports Claude's extended thinking feature:

```typescript
const adapter = new ClaudeCodeCLIAdapter({
  model: 'opus',
  thinkingEnabled: true,
  thinkingBudget: 10000, // Optional: limit thinking tokens
});
```

This enables the `--thinking` flag, allowing Claude to use extended reasoning.

## Error Handling

The adapter handles various error scenarios:

- **CLI not found**: Throws error if `claude` command is not available
- **Timeout**: Kills process after configured timeout
- **Non-zero exit code**: Captures stderr and throws descriptive error
- **Invalid JSON**: Handles malformed CLI output
- **Missing result**: Validates output structure

## Testing

Run the test suite:

```bash
npm test -- claude-code-cli-adapter.test.ts
```

All 11 tests should pass:
- Constructor initialization
- Response generation
- Multiple messages handling
- System prompt handling
- Error scenarios (timeout, invalid JSON, exit codes)

## Integration with Factory

The adapter is automatically available through the factory:

```typescript
import { LlmAdapterFactory } from './llm-adapter-factory';

const factory = new LlmAdapterFactory(adapterService);
const adapter = await factory.createFromConfig({
  type: 'claude-code-cli',
  config: {
    cli_path: 'claude',
    model: 'opus',
  },
});
```

## Requirements

- Claude Code CLI must be installed and available in PATH
- Node.js with `child_process` support
- Sufficient permissions to execute CLI commands

## Troubleshooting

### CLI Not Found

```
Error: Failed to spawn CLI: Command not found
```

**Solution**: Ensure `claude` is installed and in your PATH:
```bash
which claude
# or specify full path in config
```

### Timeout Errors

```
Error: CLI execution timeout after 120000ms
```

**Solution**: Increase `timeout_ms` in configuration or optimize your prompts.

### Invalid JSON Output

```
Error: Failed to parse CLI output as JSON
```

**Solution**: Ensure you're using a compatible Claude CLI version that supports `--output-format=json`.

## Best Practices

1. **Set appropriate timeouts**: Complex queries may need longer timeouts
2. **Use working directory**: Set `working_dir` for file-based operations
3. **Enable thinking for complex tasks**: Use `thinkingEnabled: true` for reasoning-heavy tasks
4. **Monitor token usage**: Set `max_tokens` to control response length
5. **Handle errors gracefully**: Wrap calls in try-catch blocks
6. **Use streaming for tool-heavy workflows**: Enable `enable_streaming: true` to track tool execution in real-time
7. **Be cautious with skip_permissions**: Only enable in trusted, controlled environments

## Current Limitations

### Not Yet Supported

- **MCP (Model Context Protocol) integration**: MCP servers require a permission proxy and HTTP IPC callback mechanism, which is not yet implemented in this adapter.

### Supported Features

- ✅ **Multi-turn conversations**: Implemented via `startConversation()`, `sendMessage()`, and `endConversation()` methods. Requires `useStreamInput: true` and `enableStreaming: true`.
- ✅ **Input streaming** (`--input-format=stream-json`): Supported when `useStreamInput: true`.
- ✅ **Conversation history**: Automatically maintained in `ConversationContext.messages`.

### Workarounds

- **MCP tools**: Use built-in tools or deploy MCP servers separately, then reference their outputs in prompts.
- **Single-turn with history**: For non-persistent conversations, manually pass previous turns in the `messages` array:
  ```typescript
  const messages = [
    { role: 'user', content: 'First question' },
    { role: 'assistant', content: 'First answer' },
    { role: 'user', content: 'Follow-up question' },
  ];
  await adapter.generateResponse({ messages, systemPrompt: '...' });
  ```

## Future Enhancements

Potential improvements:
- [ ] MCP integration (permission proxy + HTTP IPC)
- [ ] File attachment support
- [ ] Session persistence to disk
- [ ] Custom output parsers
- [ ] Retry logic with exponential backoff
- [ ] Conversation resumption from disk
