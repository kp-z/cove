/**
 * Agent 错误类型定义
 */

export enum AgentErrorCode {
  // 消息路由错误
  MESSAGE_ROUTING_FAILED = 'MESSAGE_ROUTING_FAILED',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  DEVICE_BUSY = 'DEVICE_BUSY',
  
  // LLM 调用错误
  LLM_API_ERROR = 'LLM_API_ERROR',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_CONTENT_FILTER = 'LLM_CONTENT_FILTER',
  
  // Agent 配置错误
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_DISABLED = 'AGENT_DISABLED',
  MISSING_API_KEY = 'MISSING_API_KEY',
  
  // 其他错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AgentError {
  code: AgentErrorCode;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  retryAfter?: number; // 秒
}

export interface AgentErrorResponse {
  messageId: string;
  channelId: string;
  error: AgentError;
  timestamp: Date;
}
