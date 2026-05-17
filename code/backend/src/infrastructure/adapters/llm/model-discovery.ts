/**
 * Model Discovery Service
 *
 * Provides functionality to discover available models from LLM providers
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ModelInfo {
  id: string;
  created_at?: string;
  display_name?: string;
  type?: string;
}

export interface ModelListResult {
  models: ModelInfo[];
  provider: string;
}

/**
 * Get available models from an Anthropic-compatible API
 */
export async function getAnthropicModels(
  baseURL: string,
  customHeaders?: Record<string, string>
): Promise<ModelListResult> {
  const clientOptions: any = {
    baseURL,
  };

  if (customHeaders && Object.keys(customHeaders).length > 0) {
    clientOptions.apiKey = 'custom-header-auth';
    clientOptions.defaultHeaders = customHeaders;
  } else {
    throw new Error('API key or custom headers required');
  }

  const client = new Anthropic(clientOptions);

  try {
    // Call the /v1/models endpoint
    const response = await client.models.list();

    return {
      models: response.data.map(model => ({
        id: model.id,
        created_at: model.created_at,
        display_name: model.display_name,
        type: model.type,
      })),
      provider: 'anthropic',
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch models: ${error.message}`);
  }
}

/**
 * Get available models based on adapter configuration
 */
export async function getAvailableModels(
  adapterType: string,
  baseURL?: string,
  customHeaders?: Record<string, string>
): Promise<ModelListResult> {
  switch (adapterType) {
    case 'anthropic-api':
      if (!baseURL) {
        throw new Error('Base URL is required for Anthropic API');
      }
      return getAnthropicModels(baseURL, customHeaders);

    case 'openai-api':
      // TODO: Implement OpenAI model discovery
      throw new Error('OpenAI model discovery not yet implemented');

    case 'claudeCodeCli':
      // Claude Code CLI doesn't have model discovery
      throw new Error('Model discovery not supported for Claude Code CLI');

    default:
      throw new Error(`Unsupported adapter type: ${adapterType}`);
  }
}
