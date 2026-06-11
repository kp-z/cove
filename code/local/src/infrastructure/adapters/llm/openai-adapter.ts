import OpenAI from 'openai';
import { LlmAdapter, GenerateParams, AdapterCapabilities } from './llm-adapter.interface';

export class OpenAIAdapter implements LlmAdapter {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly defaultMaxTokens: number;

  constructor(apiKey: string, model?: string, maxTokens?: number, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model || 'gpt-4o';
    this.defaultMaxTokens = maxTokens || 4096;
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsStreaming: true,
      supportsBatchMetadata: false,
      supportsThinking: false,
      supportsToolUse: true,
      supportsCostTracking: false
    };
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
        // 正文增量统一走 onContent（phase=content）通道，与 CLI / Anthropic 渲染对齐。
        await streaming?.onContent?.(delta);
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
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        model: this.model,
        latency: {
          totalMs: totalMs,
          tokensPerSecond: outputTokens / (totalMs / 1000),
        },
      });
    }

    await streaming?.onStatusChange?.('completed');

    return fullResponse;
  }
}
