import OpenAI from 'openai';
import { LlmAdapter, GenerateParams } from './llm-adapter.interface';

export class OpenAIAdapter implements LlmAdapter {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly defaultMaxTokens: number;

  constructor(apiKey: string, model?: string, maxTokens?: number, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model || 'gpt-4o';
    this.defaultMaxTokens = maxTokens || 4096;
  }

  async generateResponse(params: GenerateParams): Promise<string> {
    if (params.streaming) {
      return this.generateStreamingResponse(params);
    }

    return this.generateNonStreamingResponse(params);
  }

  private async generateNonStreamingResponse(params: GenerateParams): Promise<string> {
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

  private async generateStreamingResponse(params: GenerateParams): Promise<string> {
    const { streaming } = params;
    const startTime = Date.now();

    await streaming?.onStatusChange?.('thinking');

    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
      messages: [
        { role: 'system' as const, content: params.systemPrompt },
        ...params.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      stream: true,
      stream_options: { include_usage: true },
    });

    let fullResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        await streaming?.onThinking?.(delta);
      }

      // Collect usage info from the final chunk
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || 0;
        outputTokens = chunk.usage.completion_tokens || 0;
      }
    }

    const endTime = Date.now();
    const totalMs = endTime - startTime;

    // Report usage
    if (inputTokens > 0 || outputTokens > 0) {
      await streaming?.onUsage?.({
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        model: this.model,
        latency: {
          total_ms: totalMs,
          tokens_per_second: outputTokens / (totalMs / 1000),
        },
      });
    }

    await streaming?.onStatusChange?.('completed');

    return fullResponse;
  }
}
