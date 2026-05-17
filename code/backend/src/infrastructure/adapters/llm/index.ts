export type { LlmAdapter, ChatMessage, GenerateParams } from './llm-adapter.interface';
export { AnthropicAdapter } from './anthropic-adapter';
export { OpenAIAdapter } from './openai-adapter';
export { ClaudeCodeCLIAdapter } from './claude-code-cli-adapter';

import { LlmAdapter } from './llm-adapter.interface';
import { AnthropicAdapter } from './anthropic-adapter';
import { OpenAIAdapter } from './openai-adapter';
import { ClaudeCodeCLIAdapter } from './claude-code-cli-adapter';
import type { AgentRuntimeConfig } from '../../../application/interfaces/agent-config-store.interface';

export function createLlmAdapter(): LlmAdapter {
  const provider = process.env.LLM_PROVIDER || 'anthropic';
  const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '4096', 10);

  switch (provider) {
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey || apiKey.includes('your-key-here')) {
        throw new Error('ANTHROPIC_API_KEY is not configured. Set it in .env');
      }
      return new AnthropicAdapter(apiKey, process.env.ANTHROPIC_MODEL, maxTokens);
    }
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.includes('your-key-here')) {
        throw new Error('OPENAI_API_KEY is not configured. Set it in .env');
      }
      return new OpenAIAdapter(apiKey, process.env.OPENAI_MODEL, maxTokens);
    }
    case 'claude-code-cli': {
      const cliPath = process.env.CLAUDE_CLI_PATH || 'claude';
      const model = process.env.CLAUDE_CLI_MODEL;
      const workingDir = process.env.CLAUDE_CLI_WORKING_DIR;
      const timeout = process.env.CLAUDE_CLI_TIMEOUT
        ? parseInt(process.env.CLAUDE_CLI_TIMEOUT, 10)
        : undefined;
      return new ClaudeCodeCLIAdapter(cliPath, model, workingDir, timeout);
    }
    default:
      throw new Error(`Unknown LLM provider: ${provider}. Use "anthropic", "openai", or "claude-code-cli".`);
  }
}

export function createLlmAdapterFromConfig(runtime: AgentRuntimeConfig): LlmAdapter {
  const provider = runtime.model.provider || 'anthropic';
  const model = runtime.model.model_name;
  const maxTokens = runtime.model.max_tokens || 4096;

  switch (provider) {
    case 'anthropic': {
      const apiKey = (runtime.api as any)?.api_key;
      if (!apiKey) {
        throw new Error('Runtime config missing api.api_key');
      }
      const baseUrl = runtime.api?.base_url;
      return new AnthropicAdapter(apiKey, model, maxTokens, baseUrl);
    }
    case 'openai': {
      const apiKey = (runtime.api as any)?.api_key;
      if (!apiKey) {
        throw new Error('Runtime config missing api.api_key');
      }
      return new OpenAIAdapter(apiKey, model, maxTokens);
    }
    case 'claude-code-cli': {
      const cliPath = (runtime as any).cli?.path;
      const workingDir = (runtime as any).cli?.working_dir;
      const timeout = (runtime as any).cli?.timeout;
      return new ClaudeCodeCLIAdapter(cliPath, model, workingDir, timeout);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
