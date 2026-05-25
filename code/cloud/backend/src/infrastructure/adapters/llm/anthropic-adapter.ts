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
    // 如果提供了流式回调，使用流式模式
    if (params.streaming) {
      return this.generateStreamingResponse(params);
    }

    // 否则使用普通模式
    return this.generateNonStreamingResponse(params);
  }

  private async generateNonStreamingResponse(params: GenerateParams): Promise<string> {
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

  private async generateStreamingResponse(params: GenerateParams): Promise<string> {
    const { streaming } = params;
    console.log('[AnthropicAdapter] Calling streaming API with model:', this.model);

    // 通知开始 thinking
    await streaming?.onStatusChange?.('thinking');

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
      system: params.systemPrompt,
      messages: params.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    let fullResponse = '';
    const startTime = Date.now();

    // 监听流式事件
    stream.on('text', async (text: string) => {
      fullResponse += text;
      // Anthropic SDK 不直接暴露 thinking，这里作为响应内容处理
      await streaming?.onThinking?.(text);
    });

    stream.on('message', async (message: Anthropic.Message) => {
      // 提取 usage 信息
      if (message.usage) {
        const endTime = Date.now();
        const totalMs = endTime - startTime;

        await streaming?.onUsage?.({
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          total_tokens: message.usage.input_tokens + message.usage.output_tokens,
          cache: message.usage.cache_creation_input_tokens || message.usage.cache_read_input_tokens ? {
            creation_tokens: message.usage.cache_creation_input_tokens || 0,
            read_tokens: message.usage.cache_read_input_tokens || 0,
            hit_rate: message.usage.cache_read_input_tokens
              ? message.usage.cache_read_input_tokens / (message.usage.input_tokens || 1)
              : 0,
          } : undefined,
          model: this.model,
          latency: {
            total_ms: totalMs,
            tokens_per_second: message.usage.output_tokens / (totalMs / 1000),
          },
        });
      }
    });

    // 等待流完成
    const finalMessage = await stream.finalMessage();

    // 通知完成
    await streaming?.onStatusChange?.('completed');

    const textBlock = finalMessage.content.find(b => b.type === 'text');
    return textBlock && 'text' in textBlock ? textBlock.text : '';
  }
}
