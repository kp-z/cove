/**
 * tRPC Backend Gateway Tests
 *
 * TDD: 测试 tRPC 实现的 BackendGateway
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TrpcBackendGateway } from '../trpc-backend-gateway'
import type { AgentResponse, DeviceHealth } from '../backend-gateway.interface'

// Mock fetch
global.fetch = vi.fn()

describe('TrpcBackendGateway', () => {
  let gateway: TrpcBackendGateway

  beforeEach(() => {
    gateway = new TrpcBackendGateway({
      baseUrl: 'http://localhost:3000',
      timeout: 5000,
      retryAttempts: 2,
      retryDelayMs: 100
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('配置管理', () => {
    it('should fetch realm configuration', async () => {
      const mockResponse = {
        result: {
          data: {
            id: 'realm-1',
            version: 5,
            checksum: 'abc123',
            agents: [
              {
                id: 'agent-1',
                name: 'Assistant',
                description: 'General assistant',
                systemPrompt: 'You are helpful',
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
            updatedAt: '2026-06-01T00:00:00Z'
          }
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const config = await gateway.fetchRealmConfiguration('realm-1')

      expect(config.realmId).toBe('realm-1')
      expect(config.version).toBe(5)
      expect(config.agents).toHaveLength(1)
      expect(config.agents[0].name).toBe('Assistant')
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/trpc/realm.getConfiguration',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })

    it('should get config version', async () => {
      const mockResponse = {
        result: {
          data: { version: 8 }
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const version = await gateway.getConfigVersion('realm-1')

      expect(version).toBe(8)
    })

    it('should get config changes', async () => {
      const mockResponse = {
        result: {
          data: [
            {
              version: 6,
              timestamp: '2026-06-01T10:00:00Z',
              changes: [
                {
                  path: 'agents[0].systemPrompt',
                  operation: 'update',
                  oldValue: 'Old',
                  newValue: 'New'
                }
              ],
              checksum: 'checksum-v6'
            }
          ]
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const changes = await gateway.getConfigChanges('realm-1', 5, 6)

      expect(changes).toHaveLength(1)
      expect(changes[0].version).toBe(6)
      expect(changes[0].changes[0].operation).toBe('update')
    })
  })

  describe('消息处理', () => {
    it('should fetch message history', async () => {
      const mockResponse = {
        result: {
          data: [
            {
              id: 'msg-1',
              channelId: 'channel-1',
              role: 'user',
              content: 'Hello',
              timestamp: '2026-06-01T10:00:00Z'
            },
            {
              id: 'msg-2',
              channelId: 'channel-1',
              role: 'assistant',
              content: 'Hi!',
              timestamp: '2026-06-01T10:00:01Z'
            }
          ]
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const messages = await gateway.fetchMessageHistory('channel-1', 10)

      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('Hello')
      expect(messages[1].content).toBe('Hi!')
    })

    it('should save agent response', async () => {
      const mockResponse = {
        result: { data: null }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const response: AgentResponse = {
        messageId: 'msg-3',
        channelId: 'channel-1',
        agentId: 'agent-1',
        content: 'Response',
        timestamp: new Date('2026-06-01T10:00:00Z')
      }

      await gateway.saveAgentResponse(response)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/trpc/message.saveResponse',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
  })

  describe('设备管理', () => {
    it('should report device health', async () => {
      const mockResponse = {
        result: { data: null }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const health: DeviceHealth = {
        deviceId: 'device-1',
        realmId: 'realm-1',
        status: 'online',
        activeAgents: 3,
        queueDepth: 5,
        cpuUsage: 45.5,
        memoryUsage: 512,
        timestamp: new Date('2026-06-01T10:00:00Z')
      }

      await gateway.reportHealth(health)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/trpc/device.reportHealth',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
  })

  describe('Adapter 管理', () => {
    it('should get adapter updates', async () => {
      const mockResponse = {
        result: {
          data: [
            {
              adapterId: 'anthropic-adapter',
              version: '1.1.0',
              minCompatibleVersion: '1.0.0',
              maxCompatibleVersion: '2.0.0',
              breaking: false,
              rolloutStrategy: 'canary',
              canaryPercentage: 10,
              downloadUrl: 'https://example.com/adapter.tar.gz',
              checksum: 'sha256:abc',
              changelog: 'Bug fixes',
              releasedAt: '2026-06-01T00:00:00Z'
            }
          ]
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const updates = await gateway.getAdapterUpdates('device-1')

      expect(updates).toHaveLength(1)
      expect(updates[0].version).toBe('1.1.0')
      expect(updates[0].rolloutStrategy).toBe('canary')
    })
  })

  describe('错误处理', () => {
    it('should handle HTTP errors', async () => {
      // 第一次尝试失败
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({})
      } as Response)

      // 第二次尝试也失败（重试）
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({})
      } as Response)

      await expect(gateway.fetchRealmConfiguration('realm-1'))
        .rejects.toThrow('HTTP 500')
    })

    it('should handle tRPC errors', async () => {
      const mockResponse = {
        error: {
          message: 'Realm not found'
        }
      }

      // 第一次尝试返回 tRPC 错误
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse
      } as Response)

      // 第二次尝试也返回同样的错误（重试）
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse
      } as Response)

      await expect(gateway.fetchRealmConfiguration('invalid'))
        .rejects.toThrow('Realm not found')
    })

    it('should retry on network errors', async () => {
      // 第一次失败
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      // 第二次成功
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { data: { version: 5 } }
        })
      } as Response)

      const version = await gateway.getConfigVersion('realm-1')

      expect(version).toBe(5)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should fail after max retries', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      await expect(gateway.getConfigVersion('realm-1'))
        .rejects.toThrow('tRPC call failed after 2 attempts')

      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle timeout', async () => {
      // 模拟超时
      vi.mocked(fetch).mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      await expect(gateway.getConfigVersion('realm-1'))
        .rejects.toThrow()
    })
  })

  describe('DTO 转换', () => {
    it('should convert dates correctly', async () => {
      const mockResponse = {
        result: {
          data: {
            id: 'realm-1',
            version: 1,
            checksum: 'abc',
            agents: [],
            settings: {
              maxConcurrentAgents: 5,
              messageTimeout: 30000,
              retryPolicy: {
                maxRetries: 3,
                backoffMs: 1000,
                maxBackoffMs: 10000
              }
            },
            updatedAt: '2026-06-01T12:34:56Z'
          }
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const config = await gateway.fetchRealmConfiguration('realm-1')

      expect(config.updatedAt).toBeInstanceOf(Date)
      expect(config.updatedAt.toISOString()).toBe('2026-06-01T12:34:56.000Z')
    })
  })
})
