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

export class ClaudeCodeCLIAdapter implements LlmAdapter {
  private readonly cliPath: string;
  private readonly model: string;
  private readonly workingDir: string;
  private readonly timeout: number;

  constructor(
    cliPath?: string,
    model?: string,
    workingDir?: string,
    timeout?: number
  ) {
    this.cliPath = cliPath || 'claude';
    this.model = model || 'opus';
    this.workingDir = workingDir || process.cwd();
    this.timeout = timeout || 120000; // 默认 2 分钟超时
  }

  async generateResponse(params: GenerateParams): Promise<string> {
    // 构建完整的 prompt（系统提示 + 消息历史）
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
    if (params.systemPrompt) {
      args.push('--system-prompt', params.systemPrompt);
    }

    // 添加 prompt 作为最后一个参数
    args.push(fullPrompt);

    try {
      const output = await this.executeCli(args);
      return this.parseOutput(output);
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

  private executeCli(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const child = spawn(this.cliPath, args, {
        cwd: this.workingDir,
        env: process.env,
      });

      // 设置超时
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`CLI execution timeout after ${this.timeout}ms`));
      }, this.timeout);

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
}
