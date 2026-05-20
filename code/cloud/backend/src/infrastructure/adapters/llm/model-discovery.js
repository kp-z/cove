"use strict";
/**
 * Model Discovery Service
 *
 * Provides functionality to discover available models from LLM providers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnthropicModels = getAnthropicModels;
exports.getOpenAIModels = getOpenAIModels;
exports.getAvailableModels = getAvailableModels;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const openai_1 = __importDefault(require("openai"));
const modelCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
function getCacheKey(adapterType, baseURL) {
    return `${adapterType}:${baseURL || 'default'}`;
}
function getCachedModels(key) {
    const entry = modelCache.get(key);
    if (!entry)
        return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        modelCache.delete(key);
        return null;
    }
    return entry.data;
}
function setCachedModels(key, data) {
    modelCache.set(key, {
        data,
        timestamp: Date.now(),
    });
}
/**
 * Get available models from an Anthropic-compatible API
 */
async function getAnthropicModels(baseURL, customHeaders) {
    const clientOptions = {
        baseURL,
    };
    if (customHeaders && Object.keys(customHeaders).length > 0) {
        clientOptions.apiKey = 'custom-header-auth';
        clientOptions.defaultHeaders = customHeaders;
    }
    else {
        throw new Error('API key or custom headers required');
    }
    const client = new sdk_1.default(clientOptions);
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
    }
    catch (error) {
        throw new Error(`Failed to fetch models: ${error.message}`);
    }
}
/**
 * Format OpenAI model ID to friendly display name
 */
function formatOpenAIModelName(modelId) {
    const nameMap = {
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
async function getOpenAIModels(baseURL, apiKey) {
    const clientOptions = {
        baseURL: baseURL || 'https://api.openai.com/v1',
    };
    if (apiKey) {
        clientOptions.apiKey = apiKey;
    }
    else if (process.env.OPENAI_API_KEY) {
        clientOptions.apiKey = process.env.OPENAI_API_KEY;
    }
    else {
        throw new Error('API key required for OpenAI model discovery');
    }
    const client = new openai_1.default(clientOptions);
    try {
        const response = await client.models.list();
        // Filter for chat-capable models (GPT, O1, O3 series)
        const chatModels = response.data.filter(model => model.id.includes('gpt') ||
            model.id.includes('o1') ||
            model.id.includes('o3'));
        return {
            models: chatModels.map(model => ({
                id: model.id,
                created_at: new Date(model.created * 1000).toISOString(),
                display_name: formatOpenAIModelName(model.id),
                type: 'model',
            })),
            provider: 'openai',
        };
    }
    catch (error) {
        throw new Error(`Failed to fetch OpenAI models: ${error.message}`);
    }
}
/**
 * Get available models based on adapter configuration
 */
async function getAvailableModels(adapterType, baseURL, customHeaders, apiKey) {
    const cacheKey = getCacheKey(adapterType, baseURL);
    // Check cache first
    const cached = getCachedModels(cacheKey);
    if (cached) {
        return cached;
    }
    // Fetch from API
    let result;
    switch (adapterType) {
        case 'anthropic-api':
            if (!baseURL) {
                throw new Error('Base URL is required for Anthropic API');
            }
            result = await getAnthropicModels(baseURL, customHeaders);
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
