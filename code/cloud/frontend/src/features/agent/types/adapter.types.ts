/**
 * Adapter Configuration Types
 */

export type AdapterType = 'anthropic-api' | 'openai-api' | 'claude-code-cli';

export interface BaseAdapterConfig {
  type: AdapterType;
}

export interface AnthropicAdapterConfig extends BaseAdapterConfig {
  type: 'anthropic-api';
  api_key?: string;
  model: string;
  base_url?: string;
  custom_headers?: Record<string, string>;
  temperature?: number;
  max_tokens?: number;
  max_context_tokens?: number;
  max_retries?: number;
  initial_delay_ms?: number;
}

export interface OpenAIAdapterConfig extends BaseAdapterConfig {
  type: 'openai-api';
  api_key?: string;
  model: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
  max_context_tokens?: number;
  max_retries?: number;
  initial_delay_ms?: number;
}

export interface ClaudeCodeCLIAdapterConfig extends BaseAdapterConfig {
  type: 'claude-code-cli';
  cli_path?: string;
  model?: string;
  context_window?: number;
  max_retries?: number;
  initial_delay_ms?: number;
}

export type AdapterConfig = AnthropicAdapterConfig | OpenAIAdapterConfig | ClaudeCodeCLIAdapterConfig;

export interface RuntimeAdapterState {
  adapter_id?: string;
  inline_config?: AdapterConfig;
}
