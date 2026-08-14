import type { ExecutionMetadata, UsageMetadata, ToolUseMetadata } from '../../../domain/agent-runtime/execution-metadata'

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Adapter capabilities declaration
 */
export interface AdapterCapabilities {
  /** Supports streaming mode (incremental updates) */
  supportsStreaming: boolean
  /** Supports batch mode (returns complete metadata in one shot) */
  supportsBatchMetadata: boolean
  /** Supports thinking/reasoning output */
  supportsThinking: boolean
  /** Supports tool use/function calling */
  supportsToolUse: boolean
  /** Supports cost tracking */
  supportsCostTracking: boolean
}

/**
 * Batch response (for adapters that return complete metadata)
 */
export interface BatchResponse {
  /** Generated content */
  content: string
  /** Complete execution metadata */
  metadata: ExecutionMetadata
}

/**
 * 流式回调接口（可选实现）
 * Adapter 可以选择性实现这些回调以支持流式更新
 */
export interface StreamingCallbacks {
  /**
   * Thinking 内容更新回调
   * @param chunk - 增量 thinking 内容
   */
  onThinking?: (chunk: string) => Promise<void> | void;

  /**
   * 工具调用回调
   * @param toolLog - 工具调用记录
   */
  onToolUse?: (toolLog: ToolUseMetadata) => Promise<void> | void;

  /**
   * Token 使用统计更新回调
   * @param usage - Token 使用统计
   */
  onUsage?: (usage: UsageMetadata) => Promise<void> | void;

  /**
   * 流式状态变更回调
   * @param status - 新的流式状态
   */
  onStatusChange?: (status: 'thinking' | 'tool_use' | 'responding' | 'completed') => Promise<void> | void;

  /**
   * 正文增量流式回调（正式生效通道）
   *
   * 所有支持流式的适配器（Anthropic / OpenAI / Claude Code CLI）统一通过本回调上报正文增量，
   * 按如下链路驱动前端 partialContent 增量渲染（段/句级或逐 token 级均可）：
   *   onContent → device-processor → transmissionStrategy.transmitContent
   *             → pushChunk(phase:'content') → 事件 agent.response.streaming
   *             → 前端 appendAgentProgressContent（partialContent）
   *
   * 说明：onThinking 仅承载真正的 reasoning/thinking；正文一律走本通道，实现各适配器渲染对齐。
   * @param chunk - 增量正文内容
   */
  onContent?: (chunk: string) => Promise<void> | void;
}

export interface GenerateParams {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
  /** 用于取消正在执行的模型请求。 */
  signal?: AbortSignal;
  /**
   * 流式回调（可选）
   * 如果提供，adapter 可以在执行过程中调用这些回调
   * 不支持流式的 adapter 可以忽略此参数
   */
  streaming?: StreamingCallbacks;
}

export interface LlmAdapter {
  /**
   * Get adapter capabilities
   */
  getCapabilities(): AdapterCapabilities

  /**
   * Generate response (streaming mode with callbacks)
   */
  generateResponse(params: GenerateParams): Promise<string>

  /**
   * Generate response with batch metadata (for adapters that return complete data)
   * Optional - only implemented by adapters that support batch mode (e.g., Claude CLI)
   */
  generateBatchResponse?(params: Omit<GenerateParams, 'streaming'>): Promise<BatchResponse>
}
