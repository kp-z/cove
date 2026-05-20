"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adapterConfigSchema = exports.claudeCodeCLIConfigSchema = exports.openaiConfigSchema = exports.anthropicConfigSchema = exports.retrySchema = exports.contextSchema = exports.apiKeySchema = exports.apiKeyRefSchema = void 0;
const zod_1 = require("zod");
/**
 * Adapter Configuration Validation Schemas
 *
 * Strict validation for each adapter type using Zod discriminated unions
 */
// Secret reference format: env:VAR_NAME or vault:path/to/secret
exports.apiKeyRefSchema = zod_1.z.string().regex(/^(env|vault):.+$/, {
    message: 'API key reference must be in format "env:VAR_NAME" or "vault:path/to/secret"',
});
// Direct API key format: starts with common prefixes or is long enough
exports.apiKeySchema = zod_1.z.string().min(20, 'API key must be at least 20 characters');
// Context configuration schema
exports.contextSchema = zod_1.z.object({
    max_context_tokens: zod_1.z.number().int().positive().optional(),
}).optional();
// Retry configuration schema
exports.retrySchema = zod_1.z.object({
    max_retries: zod_1.z.number().int().min(0).optional(),
    initial_delay_ms: zod_1.z.number().int().positive().optional(),
}).optional();
// Anthropic API configuration schema
exports.anthropicConfigSchema = zod_1.z.object({
    type: zod_1.z.literal('anthropic-api'),
    config: zod_1.z.object({
        api_key: exports.apiKeySchema.optional(),
        api_key_ref: exports.apiKeyRefSchema.optional(),
        model: zod_1.z.string().min(1, 'Model name is required'),
        base_url: zod_1.z.string().url('Base URL must be a valid URL').optional(),
        custom_headers: zod_1.z.record(zod_1.z.string()).optional(),
        temperature: zod_1.z.number().min(0).max(2).optional(),
        max_tokens: zod_1.z.number().int().positive().optional(),
        context: exports.contextSchema,
        retry: exports.retrySchema,
    }).refine((data) => data.api_key || data.api_key_ref || data.custom_headers, { message: 'Either api_key, api_key_ref, or custom_headers must be provided' }),
});
// OpenAI API configuration schema
exports.openaiConfigSchema = zod_1.z.object({
    type: zod_1.z.literal('openai-api'),
    config: zod_1.z.object({
        api_key: exports.apiKeySchema.optional(),
        api_key_ref: exports.apiKeyRefSchema.optional(),
        model: zod_1.z.string().min(1, 'Model name is required'),
        base_url: zod_1.z.string().url('Base URL must be a valid URL').optional(),
        temperature: zod_1.z.number().min(0).max(2).optional(),
        max_tokens: zod_1.z.number().int().positive().optional(),
        context: exports.contextSchema,
        retry: exports.retrySchema,
    }).refine((data) => data.api_key || data.api_key_ref, { message: 'Either api_key or api_key_ref must be provided' }),
});
// Claude Code CLI configuration schema
exports.claudeCodeCLIConfigSchema = zod_1.z.object({
    type: zod_1.z.literal('claude-code-cli'),
    config: zod_1.z.object({
        cli_path: zod_1.z.string().optional(),
        model: zod_1.z.string().optional(),
        context_window: zod_1.z.number().int().positive().optional(),
        retry: exports.retrySchema,
    }),
});
// Discriminated union of all adapter config schemas
exports.adapterConfigSchema = zod_1.z.discriminatedUnion('type', [
    exports.anthropicConfigSchema,
    exports.openaiConfigSchema,
    exports.claudeCodeCLIConfigSchema,
]);
