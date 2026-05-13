import Anthropic from '@anthropic-ai/sdk';
import { LlmAdapter, GenerateParams } from './llm-adapter.interface.js';

export class AnthropicAdapter implements LlmAdapter {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly defaultMaxTokens: number;

  constructor(apiKey: string, model?: string, maxTokens?: number, baseURL?: string) {
    this.client = new Anthropic({ apiKey, baseURL: baseURL || undefined });
    this.model = model || 'claude-sonnet-4-20250514';
    this.defaultMaxTokens = maxTokens || 4096;
  }

  async generateResponse(params: GenerateParams): Promise<string> {
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
