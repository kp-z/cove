/**
 * Claude Code CLI Adapter
 *
 * 使用 Claude Code CLI 作为 LLM 提供者
 * 通过调用本地的 claude 命令来执行任务
 */

import { spawn } from 'child_process';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import { LlmAdapter, GenerateParams, AdapterCapabilities, BatchResponse } from './llm-adapter.interface';
import type { ExecutionMetadata, UsageMetadata } from '../../../domain/agent-runtime/execution-metadata';

/**
 * 多轮对话上下文
 */
export interface ConversationContext {
  /** 对话 ID */
  id: string;
  /** CLI 子进程（始终以 stdio: ['pipe','pipe','pipe'] 创建，stdout/stdin 非空） */
  process: ChildProcessWithoutNullStreams;
  /** 是否已结束 */
  ended: boolean;
  /** 会话 ID（从 system.init 事件捕获） */
  sessionId?: string;
  /** 消息历史 */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ClaudeCliOutput {
  type: 'result';
  result: string;
  stop_reason: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  modelUsage?: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
    costUSD?: number;
  }>;
  total_cost_usd?: number;
  duration_ms?: number;
  ttft_ms?: number;
}

/**
 * stream-json 模式下单条 NDJSON 事件结构
 *
 * claude CLI 在 `--output-format=stream-json` 下逐行输出 JSON 事件，主要类型：
 *   - system  ：会话初始化等系统事件（subtype='init'，含 session_id）
 *   - assistant：助手轮次，message.content 为内容块数组（text / tool_use）
 *   - user    ：工具结果回灌（含 tool_result）
 *   - result  ：最终结果，结构与 ClaudeCliOutput 一致（含 usage/cost/ttft）
 */
interface ClaudeStreamEvent {
  type: 'system' | 'assistant' | 'user' | 'result' | string;
  subtype?: string;
  // system 事件的会话 ID
  session_id?: string;
  // assistant / user 事件携带的消息体
  message?: {
    content?: Array<{
      type: string;
      // text 块
      text?: string;
      // tool_use 块
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
      // tool_result 块（user 事件）
      tool_use_id?: string;
      content?: string | Array<{ type: string; text?: string }>;
      is_error?: boolean;
    }>;
  };
  // result 事件直接复用 ClaudeCliOutput 的字段
  result?: string;
  usage?: ClaudeCliOutput['usage'];
  total_cost_usd?: number;
  duration_ms?: number;
  ttft_ms?: number;
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
  /**
   * 是否启用流式输出（默认 true）
   * 启用后通过 `--output-format=stream-json` 逐 assistant 消息块实时上报正文/工具调用；
   * 关闭后回退到批量 JSON（一次性返回完整结果）。
   * 与 Cloud 侧配置字段 `enable_streaming` 对齐。
   */
  enableStreaming?: boolean;
  /**
   * 是否自动批准工具调用（默认 false）
   * 启用后添加 `--dangerously-skip-permissions` 参数，工具调用无需手动确认。
   * 警告：此选项可能执行危险操作，请仅在受控环境中使用。
   */
  skipPermissions?: boolean;
  /**
   * 是否使用流式输入格式（默认 false）
   * 启用后添加 `--input-format=stream-json` 参数，通过 NDJSON 格式发送输入。
   * 注意：此选项主要用于多轮对话场景，单次请求无明显优势。
   */
  useStreamInput?: boolean;
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
  private readonly enableStreaming: boolean;
  private readonly skipPermissions: boolean;
  private readonly useStreamInput: boolean;

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
    this.enableStreaming = config.enableStreaming ?? true;
    this.skipPermissions = config.skipPermissions ?? false;
    this.useStreamInput = config.useStreamInput ?? false;
  }

  getCapabilities(): AdapterCapabilities {
    return {
      // 通过 stream-json 支持段/块级流式（逐 assistant 消息块上报）
      supportsStreaming: this.enableStreaming,
      // 关闭流式时回退批量元数据模式
      supportsBatchMetadata: !this.enableStreaming,
      supportsThinking: this.thinkingEnabled,
      // stream-json 下可解析 tool_use 块
      supportsToolUse: this.enableStreaming,
      supportsCostTracking: true
    };
  }

  /**
   * Generate response with batch metadata (primary method for CLI)
   */
  async generateBatchResponse(params: Omit<GenerateParams, 'streaming'>): Promise<BatchResponse> {
    const { systemPrompt, messages } = params;

    // 构建完整的 prompt
    const fullPrompt = this.buildPrompt(params);

    // 构建 CLI 参数
    const args = this.buildCliArgs(systemPrompt);

    const startTime = Date.now();

    try {
      // 通过 stdin 传递 prompt
      const output = await this.executeCli(args, fullPrompt);
      const parsed = this.parseCliOutput(output);
      const endTime = Date.now();
      const totalMs = endTime - startTime;

      // 从 CLI 输出构建完整元数据
      const metadata: ExecutionMetadata = {
        thinking: this.thinkingEnabled && parsed.result
          ? {
              content: parsed.result,
              chunks: 1,
              firstTokenMs: parsed.ttft_ms
            }
          : undefined,
        toolUses: [],
        usage: this.buildUsageMetadata(parsed, totalMs),
        statusHistory: [
          { status: 'thinking', timestamp: 0 },
          { status: 'completed', timestamp: totalMs }
        ],
        executionMode: 'batch',
        adapter: 'claude-cli',
        timestamp: new Date().toISOString(),
        processingTime: totalMs
      };

      return {
        content: parsed.result,
        metadata
      };
    } catch (error) {
      throw new Error(`Claude CLI execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate response
   *
   * 当提供了流式回调且启用了流式（enableStreaming）时，走真流式（stream-json）实现，
   * 逐 assistant 消息块实时上报正文（onContent）与工具调用（onToolUse）；
   * 否则回退批量模式（一次性 JSON），仅在结束时补发 usage/completed 以兼容回调契约。
   */
  async generateResponse(params: GenerateParams): Promise<string> {
    // 真流式路径：有回调 + 启用流式
    if (params.streaming && this.enableStreaming) {
      return this.generateStreamingResponse(params);
    }

    // 回退批量路径
    const batch = await this.generateBatchResponse(params);

    // 若提供了流式回调，补发结束态以兼容契约
    if (params.streaming) {
      if (batch.metadata.usage) {
        await params.streaming.onUsage?.(batch.metadata.usage);
      }
      await params.streaming.onStatusChange?.('completed');
    }

    return batch.content;
  }

  /**
   * 真流式实现（基于 claude CLI 的 --output-format=stream-json）
   *
   * 步骤：
   *   1. spawn CLI（stream-json + verbose），通过 stdin 传入 prompt。
   *   2. 对 stdout 做行缓冲（NDJSON），逐行 JSON.parse。
   *   3. 按事件 type 分发：
   *      - system.init → 捕获 session_id
   *      - assistant.text → onContent
   *      - assistant.tool_use → onToolUse
   *      - user.tool_result → 更新工具状态
   *      - result → 记录最终正文与用量
   *   4. 进程正常结束后：串行回调全部完成 → 补发 usage 与 completed → resolve 最终正文。
   *
   * 设计要点：
   *   - 回调可能为异步，使用串行队列（callbackChain）保证正文/工具事件按到达顺序上报。
   *   - 最终正文以 result.result 为权威；缺失时回退为已收集的 text 块拼接。
   *   - 解析失败的行直接跳过；进程非 0 退出仍 reject，向上层暴露错误。
   */
  private generateStreamingResponse(params: GenerateParams): Promise<string> {
    const { systemPrompt, streaming } = params;
    const fullPrompt = this.buildPrompt(params);
    const args = this.buildCliArgs(systemPrompt, true);
    const startTime = Date.now();

    return new Promise<string>((resolve, reject) => {
      let stderr = '';
      // 跨 data chunk 的半行缓冲
      let lineBuffer = '';
      // 已收集的 text 块（作为最终正文的兜底来源）
      let collectedText = '';
      // 最终 result 事件
      let resultEvent: ClaudeStreamEvent | undefined;
      // 会话 ID
      let sessionId: string | undefined;
      // 工具调用映射（id -> 状态）
      const toolMap = new Map<string, { id: string; toolName: string; status: 'running' | 'success' | 'error' }>();
      // 串行回调队列：保证异步回调按事件到达顺序执行
      let callbackChain: Promise<void> = Promise.resolve();
      let settled = false;

      const enqueue = (fn: () => Promise<void> | void): void => {
        callbackChain = callbackChain.then(() => fn()).catch(() => {});
      };

      const child = spawn(this.cliPath, args, {
        cwd: this.workingDir,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 超时保护
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill('SIGTERM');
        reject(new Error(`CLI streaming timeout after ${this.timeout}ms`));
      }, this.timeout);

      // 首个心跳：进入"思考中"
      enqueue(() => streaming?.onStatusChange?.('thinking'));

      // 写入 prompt（根据是否启用流式输入选择格式）
      if (this.useStreamInput) {
        // NDJSON 格式：{"text": "..."}
        const inputEvent = JSON.stringify({ text: fullPrompt });
        child.stdin.write(inputEvent + '\n');
      } else {
        // 纯文本格式
        child.stdin.write(fullPrompt);
      }
      child.stdin.end();

      // 逐行处理 NDJSON
      const processLine = (rawLine: string): void => {
        const line = rawLine.trim();
        if (!line) return;

        let event: ClaudeStreamEvent;
        try {
          event = JSON.parse(line) as ClaudeStreamEvent;
        } catch {
          // 非 JSON / 半行残留，跳过
          return;
        }

        this.dispatchStreamEvent(event, streaming, enqueue, (text) => {
          collectedText += text;
        }, (result) => {
          resultEvent = result;
        }, (sid) => {
          sessionId = sid;
        }, toolMap);
      };

      child.stdout.on('data', (data: Buffer) => {
        lineBuffer += data.toString();
        const lines = lineBuffer.split('\n');
        // 最后一段可能是半行，留到下次
        lineBuffer = lines.pop() ?? '';
        for (const l of lines) {
          processLine(l);
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('error', (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn CLI: ${error.message}`));
      });

      child.on('close', (code: number | null) => {
        if (settled) return;
        clearTimeout(timeoutId);

        // 处理可能残留的最后一行
        if (lineBuffer.trim()) {
          processLine(lineBuffer);
          lineBuffer = '';
        }

        if (code !== 0) {
          settled = true;
          reject(new Error(`CLI exited with code ${code}. stderr: ${stderr}`));
          return;
        }

        // 等待串行回调全部完成 → 补发 usage 与 completed → resolve
        const totalMs = Date.now() - startTime;
        callbackChain
          .then(async () => {
            const usage = resultEvent
              ? this.buildUsageMetadata(resultEvent as ClaudeCliOutput, totalMs, sessionId)
              : undefined;
            if (usage) {
              await streaming?.onUsage?.(usage);
            }
            await streaming?.onStatusChange?.('completed');
          })
          .catch(() => {})
          .finally(() => {
            settled = true;
            const finalText = resultEvent?.result ?? collectedText;
            resolve(finalText);
          });
      });
    });
  }

  /**
   * 分发单条 stream-json 事件到对应的流式回调
   *
   * @param event       已解析的事件
   * @param streaming   流式回调集合
   * @param enqueue     串行回调入队函数
   * @param onText      收集 text 块（用于最终正文兜底）
   * @param onResult    记录 result 事件
   * @param onSessionId 记录会话 ID
   * @param toolMap     工具调用映射（id -> 状态）
   */
  private dispatchStreamEvent(
    event: ClaudeStreamEvent,
    streaming: GenerateParams['streaming'],
    enqueue: (fn: () => Promise<void> | void) => void,
    onText: (text: string) => void,
    onResult: (result: ClaudeStreamEvent) => void,
    onSessionId: (sessionId: string) => void,
    toolMap: Map<string, { id: string; toolName: string; status: 'running' | 'success' | 'error' }>
  ): void {
    switch (event.type) {
      case 'system': {
        // 捕获会话 ID
        if (event.subtype === 'init' && event.session_id) {
          onSessionId(event.session_id);
        }
        break;
      }
      case 'assistant': {
        const blocks = event.message?.content ?? [];
        for (const block of blocks) {
          if (block.type === 'text' && block.text) {
            // 正文块：累计并按段/句上报
            onText(block.text);
            const text = block.text;
            enqueue(() => streaming?.onContent?.(text));
          } else if (block.type === 'tool_use') {
            // 工具调用块：整段上报（状态切到 tool_use）
            const toolLog = {
              id: block.id ?? `tool_${Date.now()}`,
              toolName: block.name ?? 'unknown',
              action: 'invoke',
              params: block.input,
              status: 'running' as const,
            };
            // 记录到 toolMap
            toolMap.set(toolLog.id, {
              id: toolLog.id,
              toolName: toolLog.toolName,
              status: 'running',
            });
            enqueue(() => streaming?.onStatusChange?.('tool_use'));
            enqueue(() => streaming?.onToolUse?.(toolLog));
          }
        }
        break;
      }
      case 'user': {
        // 工具结果回灌：更新工具状态
        const blocks = event.message?.content ?? [];
        for (const block of blocks) {
          if (block.type === 'tool_result' && block.tool_use_id) {
            const toolId = block.tool_use_id;
            const tool = toolMap.get(toolId);
            if (tool) {
              const newStatus = block.is_error ? 'error' : 'success';
              tool.status = newStatus;
              // 触发工具状态更新回调
              enqueue(() => streaming?.onToolUse?.({
                id: tool.id,
                toolName: tool.toolName,
                action: 'result',
                params: {},
                status: newStatus,
                result: typeof block.content === 'string'
                  ? block.content
                  : Array.isArray(block.content)
                    ? block.content.map(c => c.text ?? '').join('')
                    : undefined,
              }));
            }
          }
        }
        break;
      }
      case 'result': {
        onResult(event);
        break;
      }
      // 其他事件类型暂不处理
      default:
        break;
    }
  }

  private buildUsageMetadata(parsed: ClaudeCliOutput, totalMs: number, sessionId?: string): UsageMetadata | undefined {
    if (!parsed.usage) return undefined;

    return {
      inputTokens: parsed.usage.input_tokens,
      outputTokens: parsed.usage.output_tokens,
      totalTokens: parsed.usage.input_tokens + parsed.usage.output_tokens,
      cache: this.buildCacheInfo(parsed.usage),
      cost: this.buildCostInfo(parsed.total_cost_usd),
      model: this.model,
      latency: {
        firstTokenMs: parsed.ttft_ms,
        totalMs: totalMs,
        tokensPerSecond: parsed.usage.output_tokens / (totalMs / 1000)
      },
      sessionId
    };
  }

  private buildCacheInfo(usage: ClaudeCliOutput['usage']): UsageMetadata['cache'] {
    if (!usage?.cache_creation_input_tokens && !usage?.cache_read_input_tokens) {
      return undefined;
    }

    const readTokens = usage.cache_read_input_tokens ?? 0;
    const inputTokens = usage.input_tokens;

    return {
      creationTokens: usage.cache_creation_input_tokens ?? 0,
      readTokens: readTokens,
      hitRate: inputTokens > 0 ? readTokens / inputTokens : 0
    };
  }

  private buildCostInfo(totalCostUsd?: number): UsageMetadata['cost'] {
    if (!totalCostUsd) return undefined;

    return {
      inputCost: 0,  // CLI doesn't break down costs
      outputCost: 0,
      cacheCost: 0,
      totalCost: totalCostUsd
    };
  }

  private buildCliArgs(systemPrompt?: string, streaming = false): string[] {
    const args = [
      '-p', // print mode
      // 流式：stream-json（NDJSON 实时事件，-p + stream-json 必须搭配 --verbose）
      // 批量：json（一次性返回完整结果）
      ...(streaming
        ? ['--output-format=stream-json', '--verbose']
        : ['--output-format=json']),
      '--bare', // 最小化模式
      '--model', this.model,
      '--no-session-persistence', // 不保存会话
    ];

    // 流式输入格式（NDJSON）
    if (this.useStreamInput && streaming) {
      args.push('--input-format=stream-json');
    }

    // 自动批准工具调用（需谨慎使用）
    if (this.skipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

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

    return args;
  }

  private buildPrompt(params: Omit<GenerateParams, 'streaming'>): string {
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

  private parseCliOutput(output: string): ClaudeCliOutput {
    try {
      const parsed = JSON.parse(output.trim()) as ClaudeCliOutput;

      if (parsed.type !== 'result') {
        throw new Error(`Unexpected output type: ${parsed.type}`);
      }

      if (!parsed.result) {
        throw new Error('No result in CLI output');
      }

      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse CLI output as JSON: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 启动多轮对话
   *
   * 创建一个持久的 CLI 进程，支持多次来回对话而不重新启动进程。
   * 需要启用 useStreamInput=true 和 enableStreaming=true。
   *
   * @param systemPrompt 系统提示（可选）
   * @returns 对话上下文
   */
  startConversation(systemPrompt?: string): Promise<ConversationContext> {
    if (!this.useStreamInput || !this.enableStreaming) {
      return Promise.reject(new Error('Multi-turn conversation requires useStreamInput=true and enableStreaming=true'));
    }

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const args = this.buildCliArgs(systemPrompt, true);

    return new Promise<ConversationContext>((resolve, reject) => {
      let sessionId: string | undefined;
      let lineBuffer = '';
      let initReceived = false;

      const child = spawn(this.cliPath, args, {
        cwd: this.workingDir,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const context: ConversationContext = {
        id: conversationId,
        process: child,
        ended: false,
        messages: [],
      };

      // 监听 system.init 事件以捕获 session_id
      const processLine = (rawLine: string): void => {
        const line = rawLine.trim();
        if (!line) return;

        try {
          const event = JSON.parse(line) as ClaudeStreamEvent;
          if (event.type === 'system' && event.subtype === 'init') {
            sessionId = event.session_id;
            context.sessionId = sessionId;
            initReceived = true;
            resolve(context);
          }
        } catch {
          // 忽略解析错误
        }
      };

      child.stdout.on('data', (data: Buffer) => {
        lineBuffer += data.toString();
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';
        for (const l of lines) {
          processLine(l);
        }
      });

      child.on('error', (error: Error) => {
        if (!initReceived) {
          reject(new Error(`Failed to start conversation: ${error.message}`));
        }
      });

      child.on('close', () => {
        context.ended = true;
      });

      // 超时保护
      setTimeout(() => {
        if (!initReceived) {
          child.kill('SIGTERM');
          reject(new Error('Conversation initialization timeout'));
        }
      }, 5000);
    });
  }

  /**
   * 在多轮对话中发送消息
   *
   * @param context 对话上下文
   * @param message 用户消息
   * @param streaming 流式回调（可选）
   * @returns 助手回复
   */
  sendMessage(
    context: ConversationContext,
    message: string,
    streaming?: GenerateParams['streaming']
  ): Promise<string> {
    if (context.ended) {
      return Promise.reject(new Error('Conversation already ended'));
    }

    return new Promise<string>((resolve, reject) => {
      let lineBuffer = '';
      let collectedText = '';
      let resultEvent: ClaudeStreamEvent | undefined;
      let callbackChain: Promise<void> = Promise.resolve();
      let turnCompleted = false;
      const toolMap = new Map<string, { id: string; toolName: string; status: 'running' | 'success' | 'error' }>();
      let dataHandler: ((data: Buffer) => void) | undefined;
      let errorHandler: ((error: Error) => void) | undefined;
      let closeHandler: (() => void) | undefined;

      const enqueue = (fn: () => Promise<void> | void): void => {
        callbackChain = callbackChain.then(() => fn()).catch(() => {});
      };

      // 状态切换到 thinking
      enqueue(() => streaming?.onStatusChange?.('thinking'));

      const processLine = (rawLine: string): void => {
        const line = rawLine.trim();
        if (!line) return;

        let event: ClaudeStreamEvent;
        try {
          event = JSON.parse(line) as ClaudeStreamEvent;
        } catch {
          return;
        }

        // 分发事件
        this.dispatchStreamEvent(
          event,
          streaming,
          enqueue,
          (text) => { collectedText += text; },
          (result) => { resultEvent = result; },
          () => {}, // sessionId 已在 startConversation 中捕获
          toolMap
        );

        // 检测轮次结束
        if (event.type === 'result' && !turnCompleted) {
          turnCompleted = true;

          // 移除事件监听器，避免影响下一轮
          if (dataHandler) context.process.stdout.off('data', dataHandler);
          if (errorHandler) context.process.off('error', errorHandler);
          if (closeHandler) context.process.off('close', closeHandler);

          // 等待回调链完成后 resolve
          callbackChain
            .then(async () => {
              if (resultEvent && streaming) {
                const usage = this.buildUsageMetadata(
                  resultEvent as ClaudeCliOutput,
                  0,
                  context.sessionId
                );
                if (usage) {
                  await streaming.onUsage?.(usage);
                }
                await streaming.onStatusChange?.('completed');
              }
            })
            .catch(() => {})
            .finally(() => {
              const finalText = resultEvent?.result ?? collectedText;
              // 更新消息历史
              context.messages.push(
                { role: 'user', content: message },
                { role: 'assistant', content: finalText }
              );
              resolve(finalText);
            });
        }
      };

      dataHandler = (data: Buffer) => {
        lineBuffer += data.toString();
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';
        for (const l of lines) {
          processLine(l);
        }
      };

      errorHandler = (error: Error) => {
        if (!turnCompleted) {
          turnCompleted = true;
          if (dataHandler) context.process.stdout.off('data', dataHandler);
          if (errorHandler) context.process.off('error', errorHandler);
          if (closeHandler) context.process.off('close', closeHandler);
          reject(new Error(`Conversation error: ${error.message}`));
        }
      };

      closeHandler = () => {
        context.ended = true;
        if (!turnCompleted) {
          turnCompleted = true;
          if (dataHandler) context.process.stdout.off('data', dataHandler);
          if (errorHandler) context.process.off('error', errorHandler);
          if (closeHandler) context.process.off('close', closeHandler);
          reject(new Error('CLI process closed unexpectedly'));
        }
      };

      // 监听事件
      context.process.stdout.on('data', dataHandler);
      context.process.on('error', errorHandler);
      context.process.on('close', closeHandler);

      // 发送消息（NDJSON 格式）
      const inputEvent = JSON.stringify({ text: message });
      try {
        context.process.stdin.write(inputEvent + '\n');
      } catch (error) {
        turnCompleted = true;
        if (dataHandler) context.process.stdout.off('data', dataHandler);
        if (errorHandler) context.process.off('error', errorHandler);
        if (closeHandler) context.process.off('close', closeHandler);
        reject(new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`));
        return;
      }

      // 超时保护
      setTimeout(() => {
        if (!turnCompleted) {
          turnCompleted = true;
          if (dataHandler) context.process.stdout.off('data', dataHandler);
          if (errorHandler) context.process.off('error', errorHandler);
          if (closeHandler) context.process.off('close', closeHandler);
          reject(new Error('Message timeout'));
        }
      }, this.timeout);
    });
  }

  /**
   * 结束多轮对话
   *
   * @param context 对话上下文
   */
  endConversation(context: ConversationContext): void {
    if (!context.ended) {
      try {
        context.process.stdin.end();
        context.process.kill('SIGTERM');
      } catch {
        // 忽略错误
      }
      context.ended = true;
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
