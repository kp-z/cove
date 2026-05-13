import OpenAI from 'openai';
import { LlmAdapter, GenerateParams } from './llm-adapter.interface';

export class OpenAIAdapter implements LlmAdapter {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly defaultMaxTokens: number;

  constructor(apiKey: string, model?: string, maxTokens?: number) {
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o';
    this.defaultMaxTokens = maxTokens || 4096;
  }

  async generateResponse(params: GenerateParams): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
      messages: [
        { role: 'system' as const, content: params.systemPrompt },
        ...params.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });

    return response.choices[0]?.message?.content || '';
  }
}
