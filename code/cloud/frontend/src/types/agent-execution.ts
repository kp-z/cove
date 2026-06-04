/**
 * Agent Execution Metadata 类型定义
 * 用于展示 Agent 执行细节（thinking、tool use、token usage 等）
 */

export interface ToolLog {
  id: string;
  timestamp: string;
  toolName: string;
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
    fileCount?: number;
    linesChanged?: number;
    exitCode?: number;
  };
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface AgentExecutionMetadata {
  thinking?: string;
  tool_logs?: ToolLog[];
  usage?: TokenUsage;
  execution_mode?: 'API' | 'CLI' | 'SDK';
  streaming_status?: 'thinking' | 'tool_use' | 'responding' | 'completed';
  started_at?: string;
  completed_at?: string;
}

export interface MessageWithExecution {
  message_id: string;
  sender_type: string;
  content: string;
  agent_execution_metadata?: AgentExecutionMetadata;
}
