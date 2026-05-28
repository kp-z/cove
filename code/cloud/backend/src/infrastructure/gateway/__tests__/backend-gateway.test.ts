/**
 * Backend Gateway Tests
 *
 * TDD: 测试 BackendGateway 防腐层
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  IBackendGateway,
  RealmConfiguration,
  ConfigChange,
  Message,
  AgentResponse,
  DeviceHealth,
  AdapterRelease
} from '../backend-gateway.interface'

// Mock 实现用于测试
class MockBackendGateway implements IBackendGateway {
  private configs: Map<string, RealmConfiguration> = new Map()
  private messages: Map<string, Message[]> = new Map()
  private responses: AgentResponse[] = []
  private healthReports: DeviceHealth[] = []

  constructor() {
    // 初始化测试数据
    this.configs.set('realm-1', {
      realmId: 'realm-1',
      version: 5,
      checksum: 'abc123',
      agents: [
        {
          id: 'agent-1',
          name: 'Assistant',
          description: 'General assistant',
          systemPrompt: 'You are a helpful assistant',
          adapterId: 'anthropic-adapter',
          adapterVersion: '1.0.0',
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
      updatedAt: new Date('2026-06-01T00:00:00Z')
    })

    this.messages.set('channel-1', [
      {
        id: 'msg-1',
        channelId: 'channel-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date('2026-06-01T10:00:00Z')
      },
      {
        id: 'msg-2',
        channelId: 'channel-1',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date('2026-06-01T10:00:01Z')
      }
    ])
  }

  async fetchRealmConfiguration(realmId: string): Promise<RealmConfiguration> {
    const config = this.configs.get(realmId)
    if (!config) {
      throw new Error(`Realm not found: ${realmId}`)
    }
    return config
  }

  async getConfigVersion(realmId: string): Promise<number> {
    const config = await this.fetchRealmConfiguration(realmId)
    return config.version
  }

  async getConfigChanges(realmId: string, fromVersion: number, toVersion: number): Promise<ConfigChange[]> {
    // 模拟版本链
    const changes: ConfigChange[] = []
    for (let v = fromVersion + 1; v <= toVersion; v++) {
      changes.push({
        version: v,
        timestamp: new Date(`2026-06-01T${10 + v}:00:00Z`),
        changes: [
          {
            path: 'agents[0].systemPrompt',
            operation: 'update',
            oldValue: 'Old prompt',
            newValue: 'New prompt'
          }
        ],
        checksum: `checksum-v${v}`
      })
    }
    return changes
  }

  async fetchMessageHistory(channelId: string, limit?: number): Promise<Message[]> {
    const messages = this.messages.get(channelId) || []
    return limit ? messages.slice(-limit) : messages
  }

  async saveAgentResponse(response: AgentResponse): Promise<void> {
    this.responses.push(response)
  }

  async reportHealth(health: DeviceHealth): Promise<void> {
    this.healthReports.push(health)
  }

  async getAdapterUpdates(deviceId: string): Promise<AdapterRelease[]> {
    return [
      {
        adapterId: 'anthropic-adapter',
        version: '1.1.0',
        minCompatibleVersion: '1.0.0',
        maxCompatibleVersion: '2.0.0',
        breaking: false,
        rolloutStrategy: 'canary',
        canaryPercentage: 10,
        downloadUrl: 'https://example.com/adapters/anthropic-1.1.0.tar.gz',
        checksum: 'sha256:abc123',
        changelog: 'Bug fixes and improvements',
        releasedAt: new Date('2026-06-01T00:00:00Z')
      }
    ]
  }

  // 测试辅助方法
  getResponses(): AgentResponse[] {
    return this.responses
  }

  getHealthReports(): DeviceHealth[] {
    return this.healthReports
  }
}

describe('BackendGateway', () => {
  let gateway: MockBackendGateway

  beforeEach(() => {
    gateway = new MockBackendGateway()
  })

  describe('配置管理', () => {
    it('should fetch realm configuration', async () => {
      const config = await gateway.fetchRealmConfiguration('realm-1')

      expect(config).toBeDefined()
      expect(config.realmId).toBe('realm-1')
      expect(config.version).toBe(5)
      expect(config.checksum).toBe('abc123')
      expect(config.agents).toHaveLength(1)
      expect(config.agents[0].name).toBe('Assistant')
    })

    it('should throw error for non-existent realm', async () => {
      await expect(gateway.fetchRealmConfiguration('invalid'))
        .rejects.toThrow('Realm not found: invalid')
    })

    it('should get config version', async () => {
      const version = await gateway.getConfigVersion('realm-1')
      expect(version).toBe(5)
    })

    it('should get config changes (incremental sync)', async () => {
      const changes = await gateway.getConfigChanges('realm-1', 3, 5)

      expect(changes).toHaveLength(2) // v4, v5
      expect(changes[0].version).toBe(4)
      expect(changes[1].version).toBe(5)
      expect(changes[0].changes[0].path).toBe('agents[0].systemPrompt')
      expect(changes[0].changes[0].operation).toBe('update')
    })
  })

  describe('消息处理', () => {
    it('should fetch message history', async () => {
      const messages = await gateway.fetchMessageHistory('channel-1')

      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('Hello')
      expect(messages[1].content).toBe('Hi there!')
    })

    it('should fetch limited message history', async () => {
      const messages = await gateway.fetchMessageHistory('channel-1', 1)

      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Hi there!') // 最后一条
    })

    it('should return empty array for non-existent channel', async () => {
      const messages = await gateway.fetchMessageHistory('invalid')
      expect(messages).toHaveLength(0)
    })

    it('should save agent response', async () => {
      const response: AgentResponse = {
        messageId: 'msg-3',
        channelId: 'channel-1',
        agentId: 'agent-1',
        content: 'Response from agent',
        timestamp: new Date()
      }

      await gateway.saveAgentResponse(response)

      const responses = gateway.getResponses()
      expect(responses).toHaveLength(1)
      expect(responses[0].content).toBe('Response from agent')
    })
  })

  describe('设备管理', () => {
    it('should report device health', async () => {
      const health: DeviceHealth = {
        deviceId: 'device-1',
        realmId: 'realm-1',
        status: 'online',
        activeAgents: 3,
        queueDepth: 5,
        cpuUsage: 45.5,
        memoryUsage: 512,
        timestamp: new Date()
      }

      await gateway.reportHealth(health)

      const reports = gateway.getHealthReports()
      expect(reports).toHaveLength(1)
      expect(reports[0].deviceId).toBe('device-1')
      expect(reports[0].status).toBe('online')
    })
  })

  describe('Adapter 管理', () => {
    it('should get adapter updates', async () => {
      const updates = await gateway.getAdapterUpdates('device-1')

      expect(updates).toHaveLength(1)
      expect(updates[0].adapterId).toBe('anthropic-adapter')
      expect(updates[0].version).toBe('1.1.0')
      expect(updates[0].rolloutStrategy).toBe('canary')
      expect(updates[0].canaryPercentage).toBe(10)
    })
  })

  describe('错误处理', () => {
    it('should handle network errors gracefully', async () => {
      const faultyGateway = new MockBackendGateway()

      // 模拟网络错误
      vi.spyOn(faultyGateway, 'fetchRealmConfiguration').mockRejectedValue(
        new Error('Network error')
      )

      await expect(faultyGateway.fetchRealmConfiguration('realm-1'))
        .rejects.toThrow('Network error')
    })

    it('should handle timeout errors', async () => {
      const slowGateway = new MockBackendGateway()

      // 模拟超时
      vi.spyOn(slowGateway, 'fetchMessageHistory').mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      await expect(slowGateway.fetchMessageHistory('channel-1'))
        .rejects.toThrow('Timeout')
    })
  })
})
