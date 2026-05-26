/**
 * Type definitions for Local Agent
 */

export interface ExecutionRequest {
  taskId: string;
  realmId: string;
  agentId: string;
  input: ExecutionInput;
}

export interface ExecutionInput {
  provider: 'anthropic' | 'openai';
  model: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ExecutionResult {
  output: string;
  executionTime: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AdapterConfig {
  anthropicApiKey?: string;
  openaiApiKey?: string;
}
