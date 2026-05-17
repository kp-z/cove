/**
 * Adapter Configuration Entity
 *
 * Defines the structure for LLM adapter configurations.
 * Each adapter config can be shared (used by multiple agents) or private (owned by one agent).
 */

export type AdapterType = 'anthropic-api' | 'openai-api' | 'claude-code-cli';
export type AdapterScope = 'shared' | 'private';

/**
 * Base configuration shared by all adapter types
 */
export interface BaseAdapterConfig {
  id: string;                    // Unique identifier
  name: string;                  // Configuration name
  description?: string;          // Optional description
  type: AdapterType;             // Adapter type
  scope: AdapterScope;           // Scope (shared or private)
  owner_id?: string;             // Owner ID (required for private adapters)
  created_at: Date;
  updated_at: Date;
}

/**
 * Common configuration fields for context and retry
 */
export interface ContextConfig {
  max_context_tokens?: number;
}

export interface RetryConfig {
  max_retries?: number;
  initial_delay_ms?: number;
}

/**
 * Anthropic API Adapter Configuration
 */
export interface AnthropicAdapterConfig extends BaseAdapterConfig {
  type: 'anthropic-api';
  config: {
    api_key?: string;            // Direct API key (e.g., "sk-xxx...")
    api_key_ref?: string;        // Secret reference (e.g., "env:ANTHROPIC_API_KEY")
    model: string;
    base_url?: string;
    custom_headers?: Record<string, string>;  // Custom HTTP headers (e.g., {"x-api-key": "..."})
    temperature?: number;
    max_tokens?: number;
    context?: ContextConfig;
    retry?: RetryConfig;
  };
}

/**
 * OpenAI API Adapter Configuration
 */
export interface OpenAIAdapterConfig extends BaseAdapterConfig {
  type: 'openai-api';
  config: {
    api_key?: string;            // Direct API key (e.g., "sk-xxx...")
    api_key_ref?: string;        // Secret reference (e.g., "env:OPENAI_API_KEY")
    model: string;
    base_url?: string;
    temperature?: number;
    max_tokens?: number;
    context?: ContextConfig;
    retry?: RetryConfig;
  };
}

/**
 * Claude Code CLI Adapter Configuration
 */
export interface ClaudeCodeCLIAdapterConfig extends BaseAdapterConfig {
  type: 'claude-code-cli';
  config: {
    cli_path?: string;
    model?: string;
    context_window?: number;
    retry?: RetryConfig;
  };
}

/**
 * Union type for all adapter configurations
 */
export type AdapterConfig =
  | AnthropicAdapterConfig
  | OpenAIAdapterConfig
  | ClaudeCodeCLIAdapterConfig;
