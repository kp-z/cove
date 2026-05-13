export type { LlmAdapter, ChatMessage, GenerateParams } from './llm-adapter.interface';
export { AnthropicAdapter } from './anthropic-adapter';
export { OpenAIAdapter } from './openai-adapter';

import { LlmAdapter } from './llm-adapter.interface';
import { AnthropicAdapter } from './anthropic-adapter';
import { OpenAIAdapter } from './openai-adapter';
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
    default:
      throw new Error(`Unknown LLM provider: ${provider}. Use "anthropic" or "openai".`);
  }
}

export function createLlmAdapterFromConfig(runtime: AgentRuntimeConfig): LlmAdapter {
  const apiKey = (runtime.api as any)?.api_key;
  if (!apiKey) {
    throw new Error('Runtime config missing api.api_key');
  }

  const provider = runtime.model.provider || 'anthropic';
  const model = runtime.model.model_name;
  const maxTokens = runtime.model.max_tokens || 4096;
  const baseUrl = runtime.api?.base_url;

  switch (provider) {
    case 'anthropic':
      return new AnthropicAdapter(apiKey, model, maxTokens, baseUrl);
    case 'openai':
      return new OpenAIAdapter(apiKey, model, maxTokens);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
