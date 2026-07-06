/**
 * Execution Metadata Types
 *
 * Strongly-typed metadata structures for agent execution tracking.
 * Includes thinking process, tool usage, token consumption, and status transitions.
 */

/**
 * Thinking metadata - captures the agent's reasoning process
 */
export interface ThinkingMetadata {
  /** Complete thinking content (accumulated from all chunks) */
  content: string
  /** Number of chunks received */
  chunks: number
  /** Time to first token in milliseconds */
  firstTokenMs?: number
}

/**
 * Tool use metadata - records tool invocations
 */
export interface ToolUseMetadata {
  /** Unique tool invocation ID */
  id: string
  /** Name of the tool being invoked */
  toolName: string
  /** Action being performed */
  action: string
  /** Tool parameters */
  params?: Record<string, unknown>
  /** Execution status */
  status: 'pending' | 'running' | 'success' | 'error'
  /** Execution duration in milliseconds */
  duration?: number
  /**
   * Execution result
   *
   * 支持两种形状：
   *   - 纯字符串：适配器直接拿到工具原始输出（如 Claude CLI 的 tool_result.content）
   *   - 结构化对象：区分 success/error/output 的历史形状，仍被部分消费者使用
   */
  result?: string | {
    success?: string
    error?: string
    output?: string
  }
  /** Additional metadata about the execution */
  meta?: {
    fileCount?: number
    linesChanged?: number
    exitCode?: number
  }
}

/**
 * Token usage metadata - tracks token consumption and costs
 */
export interface UsageMetadata {
  /** Number of input tokens */
  inputTokens: number
  /** Number of output tokens */
  outputTokens: number
  /** Total tokens (input + output) */
  totalTokens: number
  /** Cache statistics */
  cache?: {
    /** Tokens used for cache creation */
    creationTokens: number
    /** Tokens read from cache */
    readTokens: number
    /** Cache hit rate (0-1) */
    hitRate?: number
  }
  /** Cost breakdown */
  cost?: {
    /** Cost of input tokens */
    inputCost: number
    /** Cost of output tokens */
    outputCost: number
    /** Cost of cache operations */
    cacheCost: number
    /** Total cost in USD */
    totalCost: number
  }
  /** Model identifier */
  model?: string
  /** Latency metrics */
  latency?: {
    /** Time to first token in milliseconds */
    firstTokenMs?: number
    /** Total execution time in milliseconds */
    totalMs?: number
    /** Output throughput (tokens per second) */
    tokensPerSecond?: number
  }
  /** 会话 ID（多轮对话场景下由适配器捕获，如 Claude CLI 的 session_id） */
  sessionId?: string
}

/**
 * 契约2：类型化进度事件信封（typed envelope）。
 *
 * Local 作为相位（phase）权威发起方，将每一次流式进度封装为 { phase, data } 结构上报，
 * 不再把 thinking/tool/usage/status/正文混塞进同一个 string chunk。
 * Backend 据 phase 扇出到不同的 agent.response.* 事件，前端各 handler 由真实事件驱动。
 */
export type AgentProgressEnvelope =
  | { phase: 'thinking'; data: { text: string } }
  | { phase: 'tool'; data: ToolUseMetadata }
  | { phase: 'content'; data: { chunk: string } }
  | { phase: 'status'; data: { status: string } }
  | { phase: 'usage'; data: UsageMetadata }

/** 进度相位枚举（与 AgentProgressEnvelope 的 phase 对齐） */
export type AgentProgressPhase = AgentProgressEnvelope['phase']

/**
 * Status transition event - tracks execution state changes
 */
export interface StatusEvent {
  /** Execution status */
  status: 'thinking' | 'tool_use' | 'responding' | 'completed'
  /** Timestamp relative to execution start (milliseconds) */
  timestamp: number
}

/**
 * Complete execution metadata
 */
export interface ExecutionMetadata {
  /** Thinking process metadata */
  thinking?: ThinkingMetadata
  /** List of tool invocations */
  toolUses: ToolUseMetadata[]
  /** Token usage and cost statistics */
  usage?: UsageMetadata
  /** Timeline of status transitions */
  statusHistory: StatusEvent[]
  /** Execution mode (streaming or batch) */
  executionMode: 'streaming' | 'batch'
  /** Adapter that generated the response */
  adapter: string
  /** ISO timestamp of execution start */
  timestamp: string
  /** Total processing time in milliseconds */
  processingTime: number
  /** Plugin-contributed metadata */
  plugins?: Record<string, any>
}
