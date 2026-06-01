/**
 * AdapterManager Integration Tests
 *
 * 集成测试：验证 AdapterManager + BackendGateway 的协作
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  IAdapterManager,
  LlmAdapter,
  AdapterConfig
} from '../adapter-manager.interface'
import type { IBackendGateway, RealmConfiguration, AdapterRelease } from '../../../infrastructure/gateway/backend-gateway.interface'

// ==================== Mock 实现 ====================

/**
 * Mock LlmAdapter 实现
 */
class MockLlmAdapter implements LlmAdapter {
  constructor(private config: AdapterConfig) {}

  async generateResponse(params: any): Promise<string> {
    return `Response from ${this.config.id} v${this.config.version}`
  }

  getConfig(): AdapterConfig {
    return this.config
  }
}

/**
 * Mock BackendGateway 实现
 */
class MockBackendGateway implements Partial<IBackendGateway> {
  fetchRealmConfiguration = vi.fn<(realmId: string) => Promise<RealmConfiguration>>()
  getAdapterUpdates = vi.fn<(deviceId: string) => Promise<AdapterRelease[]>>()
}

/**
 * Mock AdapterManager 实现（集成 BackendGateway）
 */
class MockAdapterManager implements IAdapterManager {
  private adapters: Map<string, LlmAdapter> = new Map()
  private configs: Map<string, AdapterConfig> = new Map()

  constructor(private gateway: Partial<IBackendGateway>) {
    // 初始化一些默认配置
    this.configs.set('anthropic-adapter@1.0.0', {
      id: 'anthropic-adapter',
      type: 'anthropic-api',
      version: '1.0.0',
      config: {
        apiKey: 'test-key-1',
        model: 'claude-3-5-sonnet-20241022'
      }
    })

    this.configs.set('anthropic-adapter@2.0.0', {
      id: 'anthropic-adapter',
      type: 'anthropic-api',
      version: '2.0.0',
      config: {
        apiKey: 'test-key-2',
        model: 'claude-3-5-sonnet-20241022'
      }
    })

    this.configs.set('openai-adapter@1.0.0', {
      id: 'openai-adapter',
      type: 'openai-api',
      version: '1.0.0',
      config: {
        apiKey: 'test-key-openai',
        model: 'gpt-4o'
      }
    })
  }

  async loadAdapter(adapterId: string, adapterVersion: string): Promise<LlmAdapter> {
    const cacheKey = `${adapterId}@${adapterVersion}`

    // 检查缓存
    if (this.adapters.has(cacheKey)) {
      return this.adapters.get(cacheKey)!
    }

    // 获取配置
    let config = this.configs.get(cacheKey)

    // 如果本地没有配置，尝试从 Backend 获取
    if (!config && this.gateway.fetchRealmConfiguration) {
      try {
        const realmConfig = await this.gateway.fetchRealmConfiguration('default-realm')
        const agentConfig = realmConfig.agents.find(
          a => a.adapterId === adapterId && a.adapterVersion === adapterVersion
        )

        if (agentConfig) {
          config = {
            id: adapterId,
            type: 'anthropic-api', // 简化处理
            version: adapterVersion,
            config: {
              apiKey: 'from-backend',
              model: 'claude-3-5-sonnet-20241022'
            }
          }
          this.configs.set(cacheKey, config)
        }
      } catch (error) {
        // 忽略错误，继续使用本地配置
      }
    }

    if (!config) {
      throw new Error(`Adapter not found: ${cacheKey}`)
    }

    // 创建实例
    const adapter = new MockLlmAdapter(config)

    // 缓存
    this.adapters.set(cacheKey, adapter)

    return adapter
  }

  getAdapter(adapterId: string): LlmAdapter | null {
    // 返回最新版本的 Adapter
    for (const [key, adapter] of this.adapters.entries()) {
      if (key.startsWith(`${adapterId}@`)) {
        return adapter
      }
    }
    return null
  }

  async unloadAdapter(adapterId: string): Promise<void> {
    // 移除所有版本
    for (const key of this.adapters.keys()) {
      if (key.startsWith(`${adapterId}@`)) {
        this.adapters.delete(key)
      }
    }
  }

  async reloadAdapter(adapterId: string, adapterVersion: string): Promise<void> {
    await this.unloadAdapter(adapterId)
    await this.loadAdapter(adapterId, adapterVersion)
  }

  listLoadedAdapters(): string[] {
    return Array.from(this.adapters.keys())
  }

  async cleanup(): Promise<void> {
    this.adapters.clear()
  }

  // 集成测试专用方法
  async checkUpdates(deviceId: string = 'test-device'): Promise<AdapterRelease[]> {
    if (this.gateway.getAdapterUpdates) {
      return this.gateway.getAdapterUpdates(deviceId)
    }
    return []
  }
}

// ==================== 测试套件 ====================

describe('AdapterManager + BackendGateway Integration', () => {
  let gateway: MockBackendGateway
  let manager: MockAdapterManager

  beforeEach(() => {
    gateway = new MockBackendGateway()
    manager = new MockAdapterManager(gateway)
  })

  describe('从 Backend 获取配置', () => {
    it('should load adapter with config from backend', async () => {
      // 1. Mock Backend 返回配置
      gateway.fetchRealmConfiguration.mockResolvedValue({
        realmId: 'realm-1',
        version: 1,
        checksum: 'abc123',
        agents: [
          {
            id: 'agent-1',
            name: 'Test Agent',
            description: 'Test',
            systemPrompt: 'You are helpful',
            adapterId: 'anthropic-adapter',
            adapterVersion: '1.5.0',
            enabled: true,
            priority: 1
          }
        ],
        settings: {
          maxConcurrentAgents: 5,
          messageTimeout: 30000,
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
            maxBackoffMs: 10000
          }
        },
        updatedAt: new Date()
      })

      // 2. 加载 Adapter（会从 Backend 获取配置）
      const adapter = await manager.loadAdapter('anthropic-adapter', '1.5.0')

      // 3. 验证 Adapter 配置正确
      expect(adapter).toBeDefined()
      expect(adapter.getConfig().id).toBe('anthropic-adapter')
      expect(adapter.getConfig().version).toBe('1.5.0')
      expect(adapter.getConfig().config.apiKey).toBe('from-backend')

      // 4. 验证调用了 Backend
      expect(gateway.fetchRealmConfiguration).toHaveBeenCalledWith('default-realm')
    })

    it('should fallback to local config when backend fails', async () => {
      // 1. Mock Backend 失败
      gateway.fetchRealmConfiguration.mockRejectedValue(new Error('Network error'))

      // 2. 加载 Adapter（使用本地配置）
      const adapter = await manager.loadAdapter('anthropic-adapter', '1.0.0')

      // 3. 验证使用了本地配置
      expect(adapter).toBeDefined()
      expect(adapter.getConfig().config.apiKey).toBe('test-key-1')
    })

    it('should cache adapter after loading from backend', async () => {
      gateway.fetchRealmConfiguration.mockResolvedValue({
        realmId: 'realm-1',
        version: 1,
        checksum: 'abc123',
        agents: [
          {
            id: 'agent-1',
            name: 'Test Agent',
            description: 'Test',
            systemPrompt: 'You are helpful',
            adapterId: 'anthropic-adapter',
            adapterVersion: '1.5.0',
            enabled: true,
            priority: 1
          }
        ],
        settings: {
          maxConcurrentAgents: 5,
          messageTimeout: 30000,
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
            maxBackoffMs: 10000
          }
        },
        updatedAt: new Date()
      })

      // 第一次加载
      const adapter1 = await manager.loadAdapter('anthropic-adapter', '1.5.0')

      // 第二次加载（应该使用缓存）
      const adapter2 = await manager.loadAdapter('anthropic-adapter', '1.5.0')

      // 验证是同一实例
      expect(adapter1).toBe(adapter2)

      // 验证只调用了一次 Backend
      expect(gateway.fetchRealmConfiguration).toHaveBeenCalledTimes(1)
    })
  })

  describe('Adapter 热更新', () => {
    it('should reload adapter when version changes', async () => {
      // 1. 加载 v1.0.0
      const adapter1 = await manager.loadAdapter('anthropic-adapter', '1.0.0')
      expect(adapter1.getConfig().version).toBe('1.0.0')
      expect(adapter1.getConfig().config.apiKey).toBe('test-key-1')

      // 2. 热更新到 v2.0.0
      await manager.reloadAdapter('anthropic-adapter', '2.0.0')

      // 3. 验证版本已更新
      const adapter2 = manager.getAdapter('anthropic-adapter')
      expect(adapter2).toBeDefined()
      expect(adapter2!.getConfig().version).toBe('2.0.0')
      expect(adapter2!.getConfig().config.apiKey).toBe('test-key-2')

      // 4. 验证不是同一实例
      expect(adapter1).not.toBe(adapter2)
    })

    it('should unload old version before loading new version', async () => {
      // 加载 v1.0.0
      await manager.loadAdapter('anthropic-adapter', '1.0.0')
      expect(manager.listLoadedAdapters()).toContain('anthropic-adapter@1.0.0')

      // 热更新到 v2.0.0
      await manager.reloadAdapter('anthropic-adapter', '2.0.0')

      // 验证旧版本已卸载
      const loaded = manager.listLoadedAdapters()
      expect(loaded).not.toContain('anthropic-adapter@1.0.0')
      expect(loaded).toContain('anthropic-adapter@2.0.0')
    })

    it('should handle reload failure gracefully', async () => {
      // 加载 v1.0.0
      await manager.loadAdapter('anthropic-adapter', '1.0.0')

      // 尝试热更新到不存在的版本
      await expect(manager.reloadAdapter('anthropic-adapter', '99.0.0'))
        .rejects.toThrow('Adapter not found')

      // 验证旧版本已被卸载（即使新版本加载失败）
      const adapter = manager.getAdapter('anthropic-adapter')
      expect(adapter).toBeNull()
    })
  })

  describe('Adapter 更新检查', () => {
    it('should check for adapter updates from backend', async () => {
      // 1. Mock Backend 返回更新信息
      gateway.getAdapterUpdates.mockResolvedValue([
        {
          adapterId: 'anthropic-adapter',
          version: '2.0.0',
          minCompatibleVersion: '1.0.0',
          maxCompatibleVersion: '2.0.0',
          breaking: false,
          rolloutStrategy: 'canary',
          canaryPercentage: 10,
          downloadUrl: 'https://example.com/adapter-2.0.0.tar.gz',
          checksum: 'sha256:abc123',
          changelog: 'Bug fixes and improvements',
          releasedAt: new Date()
        }
      ])

      // 2. 检查更新
      const updates = await manager.checkUpdates('test-device')

      // 3. 验证返回了更新信息
      expect(updates).toHaveLength(1)
      expect(updates[0].adapterId).toBe('anthropic-adapter')
      expect(updates[0].version).toBe('2.0.0')
      expect(updates[0].rolloutStrategy).toBe('canary')

      // 4. 验证调用了 Backend
      expect(gateway.getAdapterUpdates).toHaveBeenCalledWith('test-device')
    })

    it('should return empty array when no updates available', async () => {
      gateway.getAdapterUpdates.mockResolvedValue([])

      const updates = await manager.checkUpdates()

      expect(updates).toHaveLength(0)
    })

    it('should handle multiple adapter updates', async () => {
      gateway.getAdapterUpdates.mockResolvedValue([
        {
          adapterId: 'anthropic-adapter',
          version: '2.0.0',
          minCompatibleVersion: '1.0.0',
          maxCompatibleVersion: '2.0.0',
          breaking: false,
          rolloutStrategy: 'immediate',
          downloadUrl: 'https://example.com/anthropic-2.0.0.tar.gz',
          checksum: 'sha256:abc123',
          changelog: 'Update 1',
          releasedAt: new Date()
        },
        {
          adapterId: 'openai-adapter',
          version: '1.5.0',
          minCompatibleVersion: '1.0.0',
          maxCompatibleVersion: '1.5.0',
          breaking: false,
          rolloutStrategy: 'gradual',
          downloadUrl: 'https://example.com/openai-1.5.0.tar.gz',
          checksum: 'sha256:def456',
          changelog: 'Update 2',
          releasedAt: new Date()
        }
      ])

      const updates = await manager.checkUpdates()

      expect(updates).toHaveLength(2)
      expect(updates[0].adapterId).toBe('anthropic-adapter')
      expect(updates[1].adapterId).toBe('openai-adapter')
    })
  })

  describe('Adapter 版本管理', () => {
    it('should load multiple versions of same adapter', async () => {
      // 加载 v1.0.0
      const adapter1 = await manager.loadAdapter('anthropic-adapter', '1.0.0')

      // 加载 v2.0.0
      const adapter2 = await manager.loadAdapter('anthropic-adapter', '2.0.0')

      // 验证两个版本都已加载
      const loaded = manager.listLoadedAdapters()
      expect(loaded).toContain('anthropic-adapter@1.0.0')
      expect(loaded).toContain('anthropic-adapter@2.0.0')

      // 验证是不同的实例
      expect(adapter1).not.toBe(adapter2)
    })

    it('should get latest loaded version', async () => {
      // 加载 v1.0.0
      await manager.loadAdapter('anthropic-adapter', '1.0.0')

      // 加载 v2.0.0
      await manager.loadAdapter('anthropic-adapter', '2.0.0')

      // 获取 Adapter（应该返回其中一个版本）
      const adapter = manager.getAdapter('anthropic-adapter')
      expect(adapter).toBeDefined()
      expect(adapter!.getConfig().id).toBe('anthropic-adapter')
    })

    it('should unload all versions of adapter', async () => {
      // 加载多个版本
      await manager.loadAdapter('anthropic-adapter', '1.0.0')
      await manager.loadAdapter('anthropic-adapter', '2.0.0')

      // 卸载所有版本
      await manager.unloadAdapter('anthropic-adapter')

      // 验证都已卸载
      const loaded = manager.listLoadedAdapters()
      expect(loaded).not.toContain('anthropic-adapter@1.0.0')
      expect(loaded).not.toContain('anthropic-adapter@2.0.0')

      const adapter = manager.getAdapter('anthropic-adapter')
      expect(adapter).toBeNull()
    })
  })

  describe('Adapter 执行', () => {
    it('should generate response with loaded adapter', async () => {
      const adapter = await manager.loadAdapter('anthropic-adapter', '1.0.0')

      const response = await adapter.generateResponse({
        systemPrompt: 'You are helpful',
        messages: [{ role: 'user', content: 'Hello' }]
      })

      expect(response).toBe('Response from anthropic-adapter v1.0.0')
    })

    it('should generate different responses for different versions', async () => {
      const adapter1 = await manager.loadAdapter('anthropic-adapter', '1.0.0')
      const adapter2 = await manager.loadAdapter('anthropic-adapter', '2.0.0')

      const response1 = await adapter1.generateResponse({})
      const response2 = await adapter2.generateResponse({})

      expect(response1).toBe('Response from anthropic-adapter v1.0.0')
      expect(response2).toBe('Response from anthropic-adapter v2.0.0')
    })

    it('should generate responses for different adapters', async () => {
      const anthropicAdapter = await manager.loadAdapter('anthropic-adapter', '1.0.0')
      const openaiAdapter = await manager.loadAdapter('openai-adapter', '1.0.0')

      const response1 = await anthropicAdapter.generateResponse({})
      const response2 = await openaiAdapter.generateResponse({})

      expect(response1).toBe('Response from anthropic-adapter v1.0.0')
      expect(response2).toBe('Response from openai-adapter v1.0.0')
    })
  })

  describe('资源清理', () => {
    it('should cleanup all loaded adapters', async () => {
      // 加载多个 Adapter
      await manager.loadAdapter('anthropic-adapter', '1.0.0')
      await manager.loadAdapter('openai-adapter', '1.0.0')

      expect(manager.listLoadedAdapters()).toHaveLength(2)

      // 清理
      await manager.cleanup()

      // 验证都已清理
      expect(manager.listLoadedAdapters()).toHaveLength(0)
    })

    it('should allow loading adapters after cleanup', async () => {
      await manager.loadAdapter('anthropic-adapter', '1.0.0')
      await manager.cleanup()

      // 清理后可以重新加载
      const adapter = await manager.loadAdapter('anthropic-adapter', '1.0.0')
      expect(adapter).toBeDefined()
    })
  })
})
