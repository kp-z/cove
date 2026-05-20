import { LlmAdapter } from './llm-adapter.interface';
import { AnthropicAdapter } from './anthropic-adapter';
import { OpenAIAdapter } from './openai-adapter';
import { ClaudeCodeCLIAdapter } from './claude-code-cli-adapter';
import { AdapterConfig } from '../../../domain/models/adapter/adapter-config.entity';
import { AdapterService } from '../../../application/services/adapter/adapter.service';

/**
 * LLM Adapter Factory
 *
 * Creates LLM adapter instances from AdapterConfig
 */
export class LlmAdapterFactory {
  constructor(private readonly adapterService: AdapterService) {}

  /**
   * Create an LLM adapter from AdapterConfig
   */
  async createFromConfig(config: AdapterConfig): Promise<LlmAdapter> {
    switch (config.type) {
      case 'anthropic-api': {
        // Support both api_key (direct) and api_key_ref (reference)
        const apiKeySource = config.config.api_key || config.config.api_key_ref;

        // If custom_headers are provided, api_key is optional (e.g., x-api-key in headers)
        let apiKey: string;
        if (apiKeySource) {
          apiKey = await this.adapterService.resolveApiKey(apiKeySource);
        } else if (config.config.custom_headers) {
          // Use a placeholder when custom headers handle authentication
          apiKey = 'custom-header-auth';
        } else {
          throw new Error('Anthropic adapter requires api_key, api_key_ref, or custom_headers');
        }

        return new AnthropicAdapter(
          apiKey,
          config.config.model,
          config.config.max_tokens,
          config.config.base_url,
          config.config.custom_headers,
        );
      }

      case 'openai-api': {
        // Support both api_key (direct) and api_key_ref (reference)
        const apiKeySource = config.config.api_key || config.config.api_key_ref;
        if (!apiKeySource) {
          throw new Error('OpenAI adapter requires api_key or api_key_ref');
        }
        const apiKey = await this.adapterService.resolveApiKey(apiKeySource);
        return new OpenAIAdapter(
          apiKey,
          config.config.model,
          config.config.max_tokens,
          config.config.base_url,
        );
      }

      case 'claude-code-cli': {
        return new ClaudeCodeCLIAdapter(
          config.config.cli_path,
          config.config.model,
        );
      }

      default:
        throw new Error(`Unknown adapter type: ${(config as any).type}`);
    }
  }

  /**
   * Create an LLM adapter by adapter ID
   */
  async createById(adapterId: string, actorId: string): Promise<LlmAdapter> {
    const config = await this.adapterService.getById(adapterId, actorId);
    if (!config) {
      throw new Error(`Adapter configuration not found: ${adapterId}`);
    }

    return await this.createFromConfig(config);
  }
}

// Legacy function for backward compatibility
export async function createLlmAdapterFromConfig(
  config: any,
  adapterService?: AdapterService,
): Promise<LlmAdapter> {
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

      return new AnthropicAdapter(
        apiKey,
        config.model_name || config.model?.model_name || 'claude-3-5-sonnet-20241022',
        config.max_tokens || config.model?.max_tokens,
        config.api?.base_url,
      );
    }

    case 'openai': {
      const apiKey = config.api?.api_key || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not found');
      }

      return new OpenAIAdapter(
        apiKey,
        config.model_name || config.model?.model_name || 'gpt-4',
        config.max_tokens || config.model?.max_tokens,
        config.api?.base_url,
      );
    }

    case 'claude-code-cli': {
      return new ClaudeCodeCLIAdapter(
        config.cli?.command,
        config.model_name || config.model?.model_name,
      );
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
