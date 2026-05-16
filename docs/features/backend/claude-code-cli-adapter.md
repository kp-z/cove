# ClaudeCodeCLIAdapter 使用指南

## 概述

`ClaudeCodeCLIAdapter` 是一个通过调用本地 Claude Code CLI 实现 LLM 交互的适配器。它允许你在不依赖网络 API 的情况下使用 Claude。

## 安装要求

确保已安装 Claude Code CLI：

```bash
# 检查是否已安装
claude --version

# 如果未安装，请访问 https://claude.ai/download
```

## 配置

### 方式 1: 环境变量配置

在 `.env` 文件中添加：

```bash
# 使用 Claude Code CLI 作为 LLM provider
LLM_PROVIDER=claude-code-cli

# 可选配置
CLAUDE_CLI_PATH=/Users/kp/.local/bin/claude  # CLI 路径（默认: claude）
CLAUDE_CLI_MODEL=opus                          # 模型名称（默认: opus）
CLAUDE_CLI_WORKING_DIR=/path/to/workdir       # 工作目录（默认: process.cwd()）
CLAUDE_CLI_TIMEOUT=120000                      # 超时时间（默认: 120000ms）
LLM_MAX_TOKENS=4096                           # 最大 token 数（默认: 4096）
```

### 方式 2: 代码配置

```typescript
import { ClaudeCodeCLIAdapter } from './infrastructure/adapters/llm';

const adapter = new ClaudeCodeCLIAdapter(
  '/usr/local/bin/claude',  // CLI 路径
  'opus',                    // 模型
  4096,                      // maxTokens
  '/tmp/workspace',          // 工作目录
  120000                     // 超时（毫秒）
);
```

### 方式 3: 通过 AgentRuntimeConfig

```typescript
import { createLlmAdapterFromConfig } from './infrastructure/adapters/llm';

const runtimeConfig = {
  model: {
    provider: 'claude-code-cli',
    model_name: 'opus',
    max_tokens: 4096,
  },
  cli: {
    path: '/usr/local/bin/claude',
    working_dir: '/tmp/workspace',
    timeout: 120000,
  },
};

const adapter = createLlmAdapterFromConfig(runtimeConfig);
```

## 使用示例

### 基本使用

```typescript
import { createLlmAdapter } from './infrastructure/adapters/llm';

// 使用环境变量配置
const adapter = createLlmAdapter();

// 生成响应
const response = await adapter.generateResponse({
  systemPrompt: 'You are a helpful coding assistant.',
  messages: [
    { role: 'user', content: 'How do I reverse a string in TypeScript?' },
  ],
});

console.log(response);
```

### 多轮对话

```typescript
const response = await adapter.generateResponse({
  systemPrompt: 'You are a helpful assistant.',
  messages: [
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi! How can I help you?' },
    { role: 'user', content: 'What is TypeScript?' },
  ],
});
```

### 在 Agent 中使用

```typescript
import { AgentRuntimeService } from './application/services/agent';
import { createLlmAdapter } from './infrastructure/adapters/llm';

const adapter = createLlmAdapter();
const runtimeService = new AgentRuntimeService(
  agentRepository,
  runtimeAdapter,
  eventBus,
  logger
);

// 启动 agent
await runtimeService.startAgent('agent-123');
```

## CLI 参数说明

ClaudeCodeCLIAdapter 使用以下 CLI 参数：

- `-p` / `--print`: 非交互模式，打印响应后退出
- `--output-format=json`: JSON 输出格式
- `--bare`: 最小化模式，跳过 hooks、LSP 等
- `--model`: 指定模型（opus, sonnet, haiku）
- `--system-prompt`: 系统提示
- `--no-session-persistence`: 不保存会话

## 输出格式

CLI 返回的 JSON 格式：

```json
{
  "type": "result",
  "result": "AI 的响应内容",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 100,
    "output_tokens": 50
  },
  "total_cost_usd": 0.01
}
```

## 错误处理

```typescript
try {
  const response = await adapter.generateResponse(params);
} catch (error) {
  if (error.message.includes('Command not found')) {
    console.error('Claude CLI 未安装或路径不正确');
  } else if (error.message.includes('timeout')) {
    console.error('CLI 执行超时');
  } else if (error.message.includes('exited with code')) {
    console.error('CLI 执行失败');
  } else {
    console.error('未知错误:', error);
  }
}
```

## 性能考虑

### 优势
- ✅ 本地执行，无需网络请求
- ✅ 继承 Claude Code CLI 的所有能力（MCP、工具调用等）
- ✅ 成本透明（输出包含 token 使用和成本）

### 限制
- ⚠️ 每次调用需要启动新进程（约 100-500ms 开销）
- ⚠️ 不支持流式输出（当前实现）
- ⚠️ 需要本地安装 Claude Code CLI

### 优化建议

1. **调整超时时间**：根据任务复杂度调整
   ```typescript
   const adapter = new ClaudeCodeCLIAdapter(
     'claude',
     'opus',
     4096,
     undefined,
     300000  // 5 分钟超时
   );
   ```

2. **选择合适的模型**：
   - `haiku`: 快速响应，适合简单任务
   - `sonnet`: 平衡性能和质量
   - `opus`: 最高质量，适合复杂任务

3. **批量处理**：将多个小请求合并为一个大请求

## 与其他 Adapter 对比

| 特性 | AnthropicAdapter | OpenAIAdapter | ClaudeCodeCLIAdapter |
|------|------------------|---------------|----------------------|
| 网络依赖 | ✅ 需要 | ✅ 需要 | ❌ 不需要 |
| 启动开销 | 低 | 低 | 中（进程启动） |
| 流式输出 | ✅ 支持 | ✅ 支持 | ❌ 不支持 |
| MCP 支持 | ❌ | ❌ | ✅ |
| 工具调用 | ✅ | ✅ | ✅ |
| 成本透明 | ❌ | ❌ | ✅ |

## 故障排查

### CLI 未找到

```bash
# 检查 CLI 是否在 PATH 中
which claude

# 或指定完整路径
export CLAUDE_CLI_PATH=/Users/kp/.local/bin/claude
```

### 权限问题

```bash
# 确保 CLI 可执行
chmod +x /path/to/claude
```

### 超时问题

```bash
# 增加超时时间
export CLAUDE_CLI_TIMEOUT=300000  # 5 分钟
```

## 测试

运行 ClaudeCodeCLIAdapter 测试：

```bash
npm test -- claude-code-cli-adapter.test.ts
```

所有测试应该通过：
- ✅ 构造函数测试（2个）
- ✅ 成功场景测试（3个）
- ✅ 错误处理测试（6个）

## 相关文件

- `src/infrastructure/adapters/llm/claude-code-cli-adapter.ts` - 实现
- `src/infrastructure/adapters/llm/claude-code-cli-adapter.test.ts` - 测试
- `src/infrastructure/adapters/llm/index.ts` - 工厂函数
- `src/infrastructure/adapters/llm/llm-adapter.interface.ts` - 接口定义
