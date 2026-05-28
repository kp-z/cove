/**
 * Adapter Manager Interface
 *
 * Adapter 管理器：负责管理多个 Adapter 实例
 *
 * 职责：
 * - Adapter 加载：从配置加载 Adapter
 * - Adapter 缓存：缓存已创建的 Adapter 实例
 * - Adapter 选择：根据 Agent 配置选择合适的 Adapter
 * - 版本管理：支持 Adapter 版本更新
 */

/**
 * LLM Adapter 接口（简化版，用于类型引用）
 */
export interface LlmAdapter {
  generateResponse(params: any): Promise<string>
}

/**
 * Adapter 配置（简化版，Device 端使用）
 */
export interface AdapterConfig {
  id: string
  type: 'anthropic-api' | 'openai-api'
  version: string
  config: {
    apiKey?: string
    model?: string
    baseUrl?: string
    temperature?: number
    maxTokens?: number
  }
}

/**
 * Adapter 管理器接口
 */
export interface IAdapterManager {
  /**
   * 加载 Adapter
   * @param adapterId Adapter ID
   * @param adapterVersion Adapter 版本
   * @returns Adapter 实例
   */
  loadAdapter(adapterId: string, adapterVersion: string): Promise<LlmAdapter>

  /**
   * 获取已加载的 Adapter
   * @param adapterId Adapter ID
   * @returns Adapter 实例或 null
   */
  getAdapter(adapterId: string): LlmAdapter | null

  /**
   * 卸载 Adapter
   * @param adapterId Adapter ID
   */
  unloadAdapter(adapterId: string): Promise<void>

  /**
   * 重新加载 Adapter（用于热更新）
   * @param adapterId Adapter ID
   * @param adapterVersion 新版本
   */
  reloadAdapter(adapterId: string, adapterVersion: string): Promise<void>

  /**
   * 列出所有已加载的 Adapter
   * @returns Adapter ID 列表
   */
  listLoadedAdapters(): string[]

  /**
   * 清理所有 Adapter
   */
  cleanup(): Promise<void>
}
