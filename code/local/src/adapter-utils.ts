/**
 * Adapter utilities for fetching models from different providers
 */

export interface ModelInfo {
  id: string;
  created?: number;
  owned_by?: string;
}

export interface ModelsResponse {
  object: string;
  data: ModelInfo[];
}

/**
 * Fallback model list for Anthropic when API is unavailable
 */
const ANTHROPIC_FALLBACK_MODELS: ModelInfo[] = [
  { id: 'claude-3-5-sonnet-latest', owned_by: 'anthropic' },
  { id: 'claude-3-5-sonnet-20241022', owned_by: 'anthropic' },
  { id: 'claude-3-5-sonnet-20240620', owned_by: 'anthropic' },
  { id: 'claude-3-opus-20240229', owned_by: 'anthropic' },
  { id: 'claude-3-sonnet-20240229', owned_by: 'anthropic' },
  { id: 'claude-3-haiku-20240307', owned_by: 'anthropic' },
];

/**
 * Fetch available models from a provider's /v1/models endpoint
 * Falls back to a predefined list if the API is unavailable
 *
 * @param baseUrl - The base URL of the API
 * @param apiKey - The API key for authentication
 * @param useFallback - Whether to use fallback models if API fails (default: true)
 * @returns List of available models
 */
export async function fetchModelsFromAPI(
  baseUrl: string,
  apiKey: string,
  useFallback: boolean = true
): Promise<ModelInfo[]> {
  try {
    const url = `${baseUrl}/v1/models`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (useFallback) {
        console.warn(`API returned ${response.status}, using fallback models`);
        return ANTHROPIC_FALLBACK_MODELS;
      }
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data: ModelsResponse = await response.json();
    return data.data || [];
  } catch (error) {
    if (useFallback) {
      console.warn('Failed to fetch models from API, using fallback:', (error as Error).message);
      return ANTHROPIC_FALLBACK_MODELS;
    }
    console.error('Error fetching models:', error);
    return [];
  }
}

/**
 * Get the recommended model from a list of models
 * Prefers the latest version of Claude 3.5 Sonnet
 */
export function getRecommendedModel(models: ModelInfo[]): string {
  if (models.length === 0) {
    return 'claude-3-5-sonnet-latest';
  }

  // Prefer models with "latest" in the name
  const latest = models.find(m => m.id.includes('latest'));
  if (latest) {
    return latest.id;
  }

  // Prefer claude-3-5-sonnet models
  const sonnet35 = models.find(m => m.id.includes('claude-3-5-sonnet'));
  if (sonnet35) {
    return sonnet35.id;
  }

  // Fallback to first available model
  return models[0].id;
}
