/**
 * Adapter Manager Interface
 *
 * Adapter 管理器：负责 LLM Adapter 的加载、管理和版本控制
 */

import type { LlmAdapter } from './llm/llm-adapter.interface'

/**
 * Adapter 配置
 */
export interface AdapterConfig {
  name: string
  type: 'anthropic' | 'openai' | 'custom'
  version: string
  enabled: boolean
  config: Record<string, unknown>
}

/**
 * Adapter 管理器接口
 */
export interface IAdapterManager {
  /**
   * 获取 Adapter
   * @param name Adapter 名称
   */
  getAdapter(name: string): Promise<LlmAdapter | null>

  /**
   * 加载 Adapter
   * @param config Adapter 配置
   */
  loadAdapter(config: AdapterConfig): Promise<void>

  /**
   * 卸载 Adapter
   * @param name Adapter 名称
   */
  unloadAdapter(name: string): Promise<void>

  /**
   * 列出所有 Adapter
   */
  listAdapters(): Promise<AdapterConfig[]>

  /**
   * 检查 Adapter 是否已加载
   * @param name Adapter 名称
   */
  isLoaded(name: string): boolean
}
