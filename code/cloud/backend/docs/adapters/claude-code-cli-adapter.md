# Claude Code CLI Adapter

## Overview

The Claude Code CLI Adapter enables integration with the Claude Code CLI tool, allowing you to leverage Claude's capabilities through the command-line interface.

## Features

- ✅ Full CLI integration via `spawn`
- ✅ JSON output parsing
- ✅ Extended thinking support
- ✅ Configurable timeout and working directory
- ✅ Temperature and token control
- ✅ System prompt support
- ✅ Conversation history handling
- ✅ Comprehensive error handling

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

## Future Enhancements

Potential improvements:
- [ ] Streaming support
- [ ] Tool use integration
- [ ] File attachment support
- [ ] Session persistence options
- [ ] Custom output parsers
- [ ] Retry logic with exponential backoff
