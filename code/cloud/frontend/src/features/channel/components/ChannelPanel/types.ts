export type MessageSender = 'user' | 'agent' | 'system';

// Agent 执行元数据类型
export interface ToolLog {
  id: string;
  timestamp: string;
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
}

export interface TokenUsage {
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
}

export interface AgentMetadata {
  thinking?: string;
  tool_logs?: ToolLog[];
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
