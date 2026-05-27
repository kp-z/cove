import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  ExecutionRequest,
  ExecutionResult,
  AdapterConfig,
  Message,
} from './types';

export class AdapterExecutor {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private runningTasks = new Map<string, AbortController>();

  constructor(private config: AdapterConfig) {
    if (config.anthropicApiKey) {
      this.anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
    }
    if (config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const abortController = new AbortController();
    this.runningTasks.set(request.taskId, abortController);

    try {
      const { provider, model, messages, maxTokens, temperature } = request.input;

      let output: string;
      let usage: { inputTokens: number; outputTokens: number } | undefined;

      if (provider === 'anthropic') {
        const result = await this.executeAnthropic(
          model,
          messages,
          maxTokens,
          temperature,
          abortController.signal
        );
        output = result.output;
        usage = result.usage;
      } else if (provider === 'openai') {
        const result = await this.executeOpenAI(
          model,
          messages,
          maxTokens,
          temperature,
          abortController.signal
        );
        output = result.output;
        usage = result.usage;
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        output,
        executionTime,
        usage,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Task cancelled');
      }
      throw error;
    } finally {
      this.runningTasks.delete(request.taskId);
    }
  }

  private async executeAnthropic(
    model: string,
    messages: Message[],
    maxTokens = 4096,
    temperature = 1.0,
    signal?: AbortSignal
  ): Promise<{ output: string; usage: { inputTokens: number; outputTokens: number } }> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await this.anthropic.messages.create(
      {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.map((msg) => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content,
        })),
      },
      { signal }
    );

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return {
      output: content.text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  private async executeOpenAI(
    model: string,
    messages: Message[],
    maxTokens = 4096,
    temperature = 1.0,
    signal?: AbortSignal
  ): Promise<{ output: string; usage: { inputTokens: number; outputTokens: number } }> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.chat.completions.create(
      {
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: maxTokens,
        temperature,
      },
      { signal }
    );

    const choice = response.choices[0];
    if (!choice.message.content) {
      throw new Error('Empty response from OpenAI');
    }

    return {
      output: choice.message.content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  cancelTask(taskId: string): void {
    const abortController = this.runningTasks.get(taskId);
    if (abortController) {
      abortController.abort();
      this.runningTasks.delete(taskId);
    }
  }

  getActiveTaskCount(): number {
    return this.runningTasks.size;
  }

  async cleanup(): Promise<void> {
    const tasks = Array.from(this.runningTasks.entries());

    if (tasks.length > 0) {
      console.log(`📋 Cancelling ${tasks.length} running task(s)...`);
    }

    for (const [taskId, controller] of tasks) {
      controller.abort();
    }

    const startTime = Date.now();
    while (this.runningTasks.size > 0 && Date.now() - startTime < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.runningTasks.size === 0) {
      console.log('✅ All tasks cancelled');
    } else {
      console.log(`⚠️  ${this.runningTasks.size} task(s) still running`);
    }
  }
}
