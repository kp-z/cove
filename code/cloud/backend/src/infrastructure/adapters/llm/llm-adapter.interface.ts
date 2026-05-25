export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
  onToolUse?: (toolLog: {
    id: string;
    tool_name: string;
    action: string;
    params?: Record<string, unknown>;
    status: 'pending' | 'running' | 'success' | 'error';
    duration?: number;
    result?: {
      success?: string;
      error?: string;
      output?: string;
    };
    meta?: {
      file_count?: number;
      lines_changed?: number;
      exit_code?: number;
    };
  }) => Promise<void> | void;

  /**
   * Token 使用统计更新回调
   * @param usage - Token 使用统计
   */
  onUsage?: (usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cache?: {
      creation_tokens: number;
      read_tokens: number;
      hit_rate?: number;
    };
    cost?: {
      input_cost: number;
      output_cost: number;
      cache_cost: number;
      total_cost: number;
    };
    model?: string;
    latency?: {
      first_token_ms?: number;
      total_ms?: number;
      tokens_per_second?: number;
    };
  }) => Promise<void> | void;

  /**
   * 流式状态变更回调
   * @param status - 新的流式状态
   */
  onStatusChange?: (status: 'thinking' | 'tool_use' | 'responding' | 'completed') => Promise<void> | void;
}

export interface GenerateParams {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
  /**
   * 流式回调（可选）
   * 如果提供，adapter 可以在执行过程中调用这些回调
   * 不支持流式的 adapter 可以忽略此参数
   */
  streaming?: StreamingCallbacks;
}

export interface LlmAdapter {
  generateResponse(params: GenerateParams): Promise<string>;
}
