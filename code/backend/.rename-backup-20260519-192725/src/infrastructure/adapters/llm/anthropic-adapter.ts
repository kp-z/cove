import Anthropic from '@anthropic-ai/sdk';
import { LlmAdapter, GenerateParams } from './llm-adapter.interface';

export class AnthropicAdapter implements LlmAdapter {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly defaultMaxTokens: number;

  constructor(
    apiKey: string,
    model?: string,
    maxTokens?: number,
    baseURL?: string,
    customHeaders?: Record<string, string>
  ) {
    // If custom headers are provided (e.g., x-api-key for catcats.net),
    // use them instead of the default Authorization header
    const clientOptions: any = {
      baseURL: baseURL || undefined,
    };

    if (customHeaders && Object.keys(customHeaders).length > 0) {
      // Custom headers mode - use custom headers for authentication
      // Pass a dummy apiKey to satisfy SDK requirements, but it won't be used
      clientOptions.apiKey = 'custom-header-auth';
      clientOptions.defaultHeaders = customHeaders;
      console.log('[AnthropicAdapter] Using custom headers:', Object.keys(customHeaders));
    } else {
      // Standard mode - use apiKey parameter
      clientOptions.apiKey = apiKey;
    }

    this.client = new Anthropic(clientOptions);
    this.model = model || 'claude-3-5-sonnet-20241022';
    this.defaultMaxTokens = maxTokens || 4096;
    console.log('[AnthropicAdapter] Initialized with model:', this.model);
  }

  async generateResponse(params: GenerateParams): Promise<string> {
    console.log('[AnthropicAdapter] Calling API with model:', this.model);
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
      system: params.systemPrompt,
      messages: params.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock ? textBlock.text : '';
  }
}
