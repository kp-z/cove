/**
 * Claude Code CLI Adapter
 *
 * 使用 Claude Code CLI 作为 LLM 提供者
 * 通过调用本地的 claude 命令来执行任务
 */

import { spawn } from 'child_process';
import { LlmAdapter, GenerateParams } from './llm-adapter.interface';

interface ClaudeCliOutput {
  type: 'result';
  result: string;
  stop_reason: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  total_cost_usd?: number;
}

export interface ClaudeCodeCLIConfig {
  cliPath?: string;
  model?: string;
  workingDir?: string;
  timeout?: number;
  temperature?: number;
  maxTokens?: number;
  contextWindow?: number;
  thinkingEnabled?: boolean;
  thinkingBudget?: number;
}

export class ClaudeCodeCLIAdapter implements LlmAdapter {
  private readonly cliPath: string;
  private readonly model: string;
  private readonly workingDir: string;
  private readonly timeout: number;
  private readonly temperature?: number;
  private readonly maxTokens?: number;
  private readonly contextWindow?: number;
  private readonly thinkingEnabled: boolean;
  private readonly thinkingBudget?: number;

  constructor(config: ClaudeCodeCLIConfig = {}) {
    this.cliPath = config.cliPath || 'claude';
    this.model = config.model || 'opus';
    this.workingDir = config.workingDir || process.cwd();
    this.timeout = config.timeout || 120000; // 默认 2 分钟超时
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
    this.contextWindow = config.contextWindow;
    this.thinkingEnabled = config.thinkingEnabled ?? true;
    this.thinkingBudget = config.thinkingBudget;
  }

  async generateResponse(params: GenerateParams): Promise<string> {
    const { systemPrompt, messages, streaming } = params;

    // 构建完整的 prompt
    const fullPrompt = this.buildPrompt(params);

    // 构建 CLI 参数
    const args = [
      '-p', // print mode
      '--output-format=json',
      '--bare', // 最小化模式
      '--model', this.model,
      '--no-session-persistence', // 不保存会话
    ];

    // 如果有系统提示，添加 --system-prompt
    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt);
    }

    // 添加可选参数
    if (this.temperature !== undefined) {
      args.push('--temperature', this.temperature.toString());
    }

    if (this.maxTokens !== undefined) {
      args.push('--max-tokens', this.maxTokens.toString());
    }

    if (this.contextWindow !== undefined) {
      args.push('--context-window', this.contextWindow.toString());
    }

    // Extended thinking 支持
    if (this.thinkingEnabled) {
      args.push('--thinking', 'enabled');
      if (this.thinkingBudget !== undefined) {
        args.push('--thinking-budget', this.thinkingBudget.toString());
      }
    }

    try {
      streaming?.onStatusChange?.('thinking');
      const startTime = Date.now();

      // 通过 stdin 传递 prompt
      const output = await this.executeCli(args, fullPrompt);
      const result = this.parseOutput(output);

      const endTime = Date.now();
      const totalMs = endTime - startTime;

      // 报告使用情况
      if (streaming?.onUsage) {
        const parsed = JSON.parse(output.trim()) as ClaudeCliOutput;
        if (parsed.usage) {
          streaming.onUsage({
            input_tokens: parsed.usage.input_tokens,
            output_tokens: parsed.usage.output_tokens,
            total_tokens: parsed.usage.input_tokens + parsed.usage.output_tokens,
            model: this.model,
            latency: {
              total_ms: totalMs,
              tokens_per_second: parsed.usage.output_tokens / (totalMs / 1000),
            },
          });
        }
      }

      streaming?.onStatusChange?.('completed');

      return result;
    } catch (error) {
      throw new Error(`Claude CLI execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildPrompt(params: GenerateParams): string {
    // 将消息历史拼接为单个 prompt
    return params.messages
      .map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');
  }

  private executeCli(args: string[], prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const child = spawn(this.cliPath, args, {
        cwd: this.workingDir,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 设置超时
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`CLI execution timeout after ${this.timeout}ms`));
      }, this.timeout);

      // 写入 prompt 到 stdin
      child.stdin.write(prompt);
      child.stdin.end();

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn CLI: ${error.message}`));
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          reject(new Error(`CLI exited with code ${code}. stderr: ${stderr}`));
          return;
        }

        resolve(stdout);
      });
    });
  }

  private parseOutput(output: string): string {
    try {
      const parsed = JSON.parse(output.trim()) as ClaudeCliOutput;

      if (parsed.type !== 'result') {
        throw new Error(`Unexpected output type: ${parsed.type}`);
      }

      if (!parsed.result) {
        throw new Error('No result in CLI output');
      }

      return parsed.result;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse CLI output as JSON: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 检查 Claude CLI 是否可用
   */
  static async isAvailable(cliPath = 'claude'): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(cliPath, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });

      // 超时
      setTimeout(() => {
        child.kill();
        resolve(false);
      }, 5000);
    });
  }
}
