/**
 * Agent 响应事件类型定义
 */

export type AgentResponseEventType = 
  | 'agent.response.accepted' 
  | 'agent.response.thinking' 
  | 'agent.response.streaming' 
  | 'agent.response.completed'
  | 'agent.response.failed';

export interface AgentResponseEvent {
  eventType: AgentResponseEventType;
  messageId: string;
  channelId: string;
  agentId: string;
  timestamp: Date;
  data?: any;
}

export interface AgentResponseAccepted {
  messageId: string;
  channelId: string;
  agentId: string;
  agentName: string;
  estimatedDuration?: number; // 预估处理时间（秒）
}

export interface AgentResponseThinking {
  messageId: string;
  channelId: string;
  agentId: string;
  thinkingText?: string;
}

export interface AgentResponseStreaming {
  messageId: string;
  channelId: string;
  agentId: string;
  delta: string; // 增量内容
  fullContent: string; // 完整内容
}

export interface AgentResponseCompleted {
  messageId: string;
  channelId: string;
  agentId: string;
  responseMessageId: string;
  content: string;
  duration: number; // 实际处理时间（毫秒）
}

export interface AgentResponseFailed {
  messageId: string;
  channelId: string;
  agentId: string;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    retryAfter?: number;
  };
}
