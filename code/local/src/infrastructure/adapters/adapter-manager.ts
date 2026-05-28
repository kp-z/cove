/**
 * Adapter Manager Implementation
 *
 * Adapter 管理器：负责 LLM Adapter 的加载、管理和版本控制
 */

import type { IAdapterManager, AdapterConfig } from './adapter-manager.interface'
import type { LlmAdapter } from './llm/llm-adapter.interface'
import { AnthropicAdapter } from './llm/anthropic-adapter'
import { OpenAIAdapter } from './llm/openai-adapter'

/**
 * Adapter 管理器实现
 */
export class AdapterManager implements IAdapterManager {
  private adapters: Map<string, LlmAdapter> = new Map()
  private configs: Map<string, AdapterConfig> = new Map()

  /**
   * 获取 Adapter
   */
  async getAdapter(name: string): Promise<LlmAdapter | null> {
    return this.adapters.get(name) || null
  }

  /**
   * 加载 Adapter
   */
  async loadAdapter(config: AdapterConfig): Promise<void> {
    if (this.adapters.has(config.name)) {
      console.warn(`Adapter ${config.name} already loaded`)
      return
    }

    // 根据类型创建 Adapter 实例
    let adapter: LlmAdapter

    switch (config.type) {
      case 'anthropic':
        adapter = new AnthropicAdapter(config.config as any)
        break
      case 'openai':
        adapter = new OpenAIAdapter(config.config as any)
        break
      default:
        throw new Error(`Unsupported adapter type: ${config.type}`)
    }

    // 保存 Adapter 和配置
    this.adapters.set(config.name, adapter)
    this.configs.set(config.name, config)

    console.log(`Adapter ${config.name} (${config.type}) loaded successfully`)
  }

  /**
   * 卸载 Adapter
   */
  async unloadAdapter(name: string): Promise<void> {
    if (!this.adapters.has(name)) {
      console.warn(`Adapter ${name} not found`)
      return
    }

    this.adapters.delete(name)
    this.configs.delete(name)

    console.log(`Adapter ${name} unloaded successfully`)
  }

  /**
   * 列出所有 Adapter
   */
  async listAdapters(): Promise<AdapterConfig[]> {
    return Array.from(this.configs.values())
  }

  /**
   * 检查 Adapter 是否已加载
   */
  isLoaded(name: string): boolean {
    return this.adapters.has(name)
  }

  /**
   * 重新加载 Adapter
   */
  async reloadAdapter(name: string): Promise<void> {
    const config = this.configs.get(name)
    if (!config) {
      throw new Error(`Adapter ${name} not found`)
    }

    await this.unloadAdapter(name)
    await this.loadAdapter(config)
  }

  /**
   * 更新 Adapter 配置
   */
  async updateAdapterConfig(name: string, newConfig: Partial<AdapterConfig>): Promise<void> {
    const config = this.configs.get(name)
    if (!config) {
      throw new Error(`Adapter ${name} not found`)
    }

    const updatedConfig: AdapterConfig = {
      ...config,
      ...newConfig,
      name: config.name, // 不允许修改名称
      type: config.type  // 不允许修改类型
    }

    // 重新加载 Adapter
    await this.unloadAdapter(name)
    await this.loadAdapter(updatedConfig)
  }
}
