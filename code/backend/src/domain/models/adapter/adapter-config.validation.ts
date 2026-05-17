import { z } from 'zod';

/**
 * Adapter Configuration Validation Schemas
 *
 * Strict validation for each adapter type using Zod discriminated unions
 */

// Secret reference format: env:VAR_NAME or vault:path/to/secret
export const apiKeyRefSchema = z.string().regex(/^(env|vault):.+$/, {
  message: 'API key reference must be in format "env:VAR_NAME" or "vault:path/to/secret"',
});

// Direct API key format: starts with common prefixes or is long enough
export const apiKeySchema = z.string().min(20, 'API key must be at least 20 characters');

// Context configuration schema
export const contextSchema = z.object({
  max_context_tokens: z.number().int().positive().optional(),
}).optional();

// Retry configuration schema
export const retrySchema = z.object({
  max_retries: z.number().int().min(0).optional(),
  initial_delay_ms: z.number().int().positive().optional(),
}).optional();

// Anthropic API configuration schema
export const anthropicConfigSchema = z.object({
  type: z.literal('anthropic-api'),
  config: z.object({
    api_key: apiKeySchema.optional(),
    api_key_ref: apiKeyRefSchema.optional(),
    model: z.string().min(1, 'Model name is required'),
    base_url: z.string().url('Base URL must be a valid URL').optional(),
    custom_headers: z.record(z.string()).optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    context: contextSchema,
    retry: retrySchema,
  }).refine(
    (data) => data.api_key || data.api_key_ref || data.custom_headers,
    { message: 'Either api_key, api_key_ref, or custom_headers must be provided' }
  ),
});

// OpenAI API configuration schema
export const openaiConfigSchema = z.object({
  type: z.literal('openai-api'),
  config: z.object({
    api_key: apiKeySchema.optional(),
    api_key_ref: apiKeyRefSchema.optional(),
    model: z.string().min(1, 'Model name is required'),
    base_url: z.string().url('Base URL must be a valid URL').optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    context: contextSchema,
    retry: retrySchema,
  }).refine(
    (data) => data.api_key || data.api_key_ref,
    { message: 'Either api_key or api_key_ref must be provided' }
  ),
});

// Claude Code CLI configuration schema
export const claudeCodeCLIConfigSchema = z.object({
  type: z.literal('claude-code-cli'),
  config: z.object({
    cli_path: z.string().optional(),
    model: z.string().optional(),
    context_window: z.number().int().positive().optional(),
    retry: retrySchema,
  }),
});

// Discriminated union of all adapter config schemas
export const adapterConfigSchema = z.discriminatedUnion('type', [
  anthropicConfigSchema,
  openaiConfigSchema,
  claudeCodeCLIConfigSchema,
]);

// Type inference from schemas
export type AnthropicConfigInput = z.infer<typeof anthropicConfigSchema>;
export type OpenAIConfigInput = z.infer<typeof openaiConfigSchema>;
export type ClaudeCodeCLIConfigInput = z.infer<typeof claudeCodeCLIConfigSchema>;
export type AdapterConfigInput = z.infer<typeof adapterConfigSchema>;
