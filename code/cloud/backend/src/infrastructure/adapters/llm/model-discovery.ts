/**
 * Model Discovery Service
 *
 * Provides functionality to discover available models from LLM providers
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

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
 * Cache for model discovery results
 */
interface CacheEntry {
  data: ModelListResult;
  timestamp: number;
}

const modelCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(adapterType: string, baseURL?: string): string {
  return `${adapterType}:${baseURL || 'default'}`;
}

function getCachedModels(key: string): ModelListResult | null {
  const entry = modelCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    modelCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedModels(key: string, data: ModelListResult): void {
  modelCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Get available models from an Anthropic-compatible API
 */
export async function getAnthropicModels(
  baseURL: string,
  customHeaders?: Record<string, string>,
  apiKey?: string
): Promise<ModelListResult> {
  const clientOptions: any = {
    baseURL,
  };

  if (customHeaders && Object.keys(customHeaders).length > 0) {
    clientOptions.apiKey = 'custom-header-auth';
    clientOptions.defaultHeaders = customHeaders;
  } else if (apiKey) {
    clientOptions.apiKey = apiKey;
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
 * Format OpenAI model ID to friendly display name
 */
function formatOpenAIModelName(modelId: string): string {
  const nameMap: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
    'gpt-4': 'GPT-4',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'o1-preview': 'O1 Preview',
    'o1-mini': 'O1 Mini',
    'o3-mini': 'O3 Mini',
  };

  return nameMap[modelId] || modelId;
}

/**
 * Get available models from OpenAI API
 */
export async function getOpenAIModels(
  baseURL?: string,
  apiKey?: string
): Promise<ModelListResult> {
  const clientOptions: any = {
    baseURL: baseURL || 'https://api.openai.com/v1',
  };

  if (apiKey) {
    clientOptions.apiKey = apiKey;
  } else if (process.env.OPENAI_API_KEY) {
    clientOptions.apiKey = process.env.OPENAI_API_KEY;
  } else {
    throw new Error('API key required for OpenAI model discovery');
  }

  const client = new OpenAI(clientOptions);

  try {
    const response = await client.models.list();

    // Filter for chat-capable models (GPT, O1, O3 series)
    const chatModels = response.data.filter(
      model =>
        model.id.includes('gpt') ||
        model.id.includes('o1') ||
        model.id.includes('o3')
    );

    return {
      models: chatModels.map(model => ({
        id: model.id,
        created_at: new Date(model.created * 1000).toISOString(),
        display_name: formatOpenAIModelName(model.id),
        type: 'model',
      })),
      provider: 'openai',
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch OpenAI models: ${error.message}`);
  }
}

/**
 * Get available models based on adapter configuration
 */
export async function getAvailableModels(
  adapterType: string,
  baseURL?: string,
  customHeaders?: Record<string, string>,
  apiKey?: string
): Promise<ModelListResult> {
  const cacheKey = getCacheKey(adapterType, baseURL);

  // Check cache first
  const cached = getCachedModels(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  let result: ModelListResult;

  switch (adapterType) {
    case 'anthropic-api':
      if (!baseURL) {
        throw new Error('Base URL is required for Anthropic API');
      }
      result = await getAnthropicModels(baseURL, customHeaders, apiKey);
      break;

    case 'openai-api':
      result = await getOpenAIModels(baseURL, apiKey);
      break;

    case 'claude-code-cli':
      throw new Error('Model discovery not supported for Claude Code CLI');

    default:
      throw new Error(`Unsupported adapter type: ${adapterType}`);
  }

  // Cache the result
  setCachedModels(cacheKey, result);

  return result;
}
