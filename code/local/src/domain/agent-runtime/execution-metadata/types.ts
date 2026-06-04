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
  /** Execution result */
  result?: {
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
}

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
