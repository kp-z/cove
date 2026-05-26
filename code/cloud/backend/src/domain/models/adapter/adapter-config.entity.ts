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
    model?: string;              // Optional: can be set after discovering available models
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
    model?: string;              // Optional: can be set after discovering available models
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
    working_dir?: string;
    timeout_ms?: number;
    temperature?: number;
    max_tokens?: number;
    context_window?: number;
    enable_thinking?: boolean;
    thinking_budget?: number;
    enable_streaming?: boolean;
    allowed_tools?: string[];
    files?: Array<{
      fileId: string;
      path: string;
    }>;
    retry?: RetryConfig;
    // CC-Switch profile metadata (optional)
    cc_switch?: {
      profile_id: string;
      profile_name: string;
      is_current: boolean;
    };
    // Environment variables for this profile (optional)
    env?: {
      ANTHROPIC_AUTH_TOKEN?: string;
      ANTHROPIC_BASE_URL?: string;
      ANTHROPIC_MODEL?: string;
    };
  };
}

/**
 * Union type for all adapter configurations
 */
export type AdapterConfig =
  | AnthropicAdapterConfig
  | OpenAIAdapterConfig
  | ClaudeCodeCLIAdapterConfig;
