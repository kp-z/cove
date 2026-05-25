export type MessageSender = 'user' | 'agent' | 'system';

// Agent 执行元数据类型
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
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cache?: {
    creationTokens: number;
    readTokens: number;
    hitRate?: number;
  };
  cost?: {
    inputCost: number;
    outputCost: number;
    cacheCost: number;
    totalCost: number;
  };
  model?: string;
  latency?: {
    firstTokenMs?: number;
    totalMs?: number;
    tokensPerSecond?: number;
  };
}

export interface AgentMetadata {
  thinking?: string;
  toolLogs?: ToolLog[];
  usage?: TokenUsage;
  executionMode?: 'API' | 'CLI' | 'SDK';
  streamingStatus?: 'thinking' | 'tool_use' | 'responding' | 'completed';
}

export interface Message {
  message_id: string;
  thread_id: string;
  sender: MessageSender;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  timestamp: Date;
  is_streaming?: boolean;
  agentMetadata?: AgentMetadata;
}
