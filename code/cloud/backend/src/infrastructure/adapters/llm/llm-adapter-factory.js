"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmAdapterFactory = void 0;
exports.createLlmAdapterFromConfig = createLlmAdapterFromConfig;
const anthropic_adapter_1 = require("./anthropic-adapter");
const openai_adapter_1 = require("./openai-adapter");
const claude_code_cli_adapter_1 = require("./claude-code-cli-adapter");
/**
 * LLM Adapter Factory
 *
 * Creates LLM adapter instances from AdapterConfig
 */
class LlmAdapterFactory {
    adapterService;
    constructor(adapterService) {
        this.adapterService = adapterService;
    }
    /**
     * Create an LLM adapter from AdapterConfig
     */
    async createFromConfig(config) {
        switch (config.type) {
            case 'anthropic-api': {
                // Support both api_key (direct) and api_key_ref (reference)
                const apiKeySource = config.config.api_key || config.config.api_key_ref;
                // If custom_headers are provided, api_key is optional (e.g., x-api-key in headers)
                let apiKey;
                if (apiKeySource) {
                    apiKey = await this.adapterService.resolveApiKey(apiKeySource);
                }
                else if (config.config.custom_headers) {
                    // Use a placeholder when custom headers handle authentication
                    apiKey = 'custom-header-auth';
                }
                else {
                    throw new Error('Anthropic adapter requires api_key, api_key_ref, or custom_headers');
                }
                return new anthropic_adapter_1.AnthropicAdapter(apiKey, config.config.model, config.config.max_tokens, config.config.base_url, config.config.custom_headers);
            }
            case 'openai-api': {
                // Support both api_key (direct) and api_key_ref (reference)
                const apiKeySource = config.config.api_key || config.config.api_key_ref;
                if (!apiKeySource) {
                    throw new Error('OpenAI adapter requires api_key or api_key_ref');
                }
                const apiKey = await this.adapterService.resolveApiKey(apiKeySource);
                return new openai_adapter_1.OpenAIAdapter(apiKey, config.config.model, config.config.max_tokens, config.config.base_url);
            }
            case 'claude-code-cli': {
                return new claude_code_cli_adapter_1.ClaudeCodeCLIAdapter(config.config.cli_path, config.config.model);
            }
            default:
                throw new Error(`Unknown adapter type: ${config.type}`);
        }
    }
    /**
     * Create an LLM adapter by adapter ID
     */
    async createById(adapterId, actorId) {
        const config = await this.adapterService.getById(adapterId, actorId);
        if (!config) {
            throw new Error(`Adapter configuration not found: ${adapterId}`);
        }
        return await this.createFromConfig(config);
    }
}
exports.LlmAdapterFactory = LlmAdapterFactory;
// Legacy function for backward compatibility
async function createLlmAdapterFromConfig(config, adapterService) {
    // If adapter_id is provided, use the new system
    if (config.adapter_id && adapterService) {
        const factory = new LlmAdapterFactory(adapterService);
        return await factory.createById(config.adapter_id, 'system');
    }
    // Otherwise, fall back to legacy inline configuration
    const provider = config.provider || config.model?.provider;
    if (!provider) {
        throw new Error('No provider specified in configuration');
    }
    switch (provider) {
        case 'anthropic': {
            const apiKey = config.api?.api_key || process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                throw new Error('Anthropic API key not found');
            }
            return new anthropic_adapter_1.AnthropicAdapter(apiKey, config.model_name || config.model?.model_name || 'claude-3-5-sonnet-20241022', config.max_tokens || config.model?.max_tokens, config.api?.base_url);
        }
        case 'openai': {
            const apiKey = config.api?.api_key || process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error('OpenAI API key not found');
            }
            return new openai_adapter_1.OpenAIAdapter(apiKey, config.model_name || config.model?.model_name || 'gpt-4', config.max_tokens || config.model?.max_tokens, config.api?.base_url);
        }
        case 'claude-code-cli': {
            return new claude_code_cli_adapter_1.ClaudeCodeCLIAdapter(config.cli?.command, config.model_name || config.model?.model_name);
        }
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
