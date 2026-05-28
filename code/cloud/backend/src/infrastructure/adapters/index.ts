/**
 * Adapter Exports
 *
 * 统一导出 Adapter 相关的所有接口和实现
 */

// 从现有的 llm 目录导出接口和实现
export type {
  LlmAdapter,
  ChatMessage,
  GenerateParams,
  StreamingCallbacks
} from './llm/llm-adapter.interface'

// 导出 Adapter 实现
export { AnthropicAdapter } from './llm/anthropic-adapter'
export { OpenAIAdapter } from './llm/openai-adapter'
export { LlmAdapterFactory } from './llm/llm-adapter-factory'

// 导出 AdapterManager 接口
export type {
  IAdapterManager,
  AdapterConfig,
  LlmAdapter as AdapterInterface
} from '../../domain/adapter-manager/adapter-manager.interface'
