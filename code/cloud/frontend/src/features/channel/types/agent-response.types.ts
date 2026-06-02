/**
 * Agent 响应状态类型定义
 */

export enum AgentResponseStatus {
  IDLE = 'idle',
  ACCEPTED = 'accepted',
  THINKING = 'thinking',
  STREAMING = 'streaming',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface AgentResponseState {
  status: AgentResponseStatus;
  messageId: string;
  agentId: string;
  agentName: string;
  
  // 进度信息
  startTime?: Date;
  estimatedDuration?: number;
  elapsedTime?: number;
  
  // 内容
  thinkingText?: string;
  streamingContent?: string;
  finalContent?: string;
  
  // 错误
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    retryAfter?: number;
  };
}
