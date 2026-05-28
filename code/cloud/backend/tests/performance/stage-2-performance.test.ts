/**
 * Stage 2 Performance Tests
 *
 * 测试 Backend 和 Device 模式的性能指标
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FeatureFlagService } from '../../src/domain/feature-flag/feature-flag.service'
import { ExecutionModeRouter } from '../../src/domain/execution-mode/execution-mode-router'
import { BackendProcessor } from '../../src/domain/message-orchestrator/backend-processor'
import { DeviceProcessor } from '../../src/domain/message-orchestrator/device-processor'
import type { IFeatureFlagStore } from '../../src/infrastructure/storage/feature-flag-store.interface'
import type { FeatureFlagConfig } from '../../src/domain/feature-flag/feature-flag.interface'
import type { MessageTask } from '../../src/domain/message-orchestrator/message-orchestrator.interface'
import type { IMessageRepository } from '../../src/application/interfaces/repositories/message.repository.interface'
import type { LlmAdapter } from '../../src/infrastructure/adapters/llm/llm-adapter.interface'
import type { DeviceConnectionManager } from '../../src/infrastructure/websocket/device-connection-manager'

describe('Stage 2 Performance Tests', () => {
  let featureFlagService: FeatureFlagService
  let executionModeRouter: ExecutionModeRouter
  let backendProcessor: BackendProcessor
  let deviceProcessor: DeviceProcessor
  let mockFeatureFlagStore: IFeatureFlagStore
  let mockMessageRepository: IMessageRepository
  let mockLlmAdapter: LlmAdapter
  let mockDeviceConnectionManager: DeviceConnectionManager

  beforeEach(() => {
    // Mock Feature Flag Store
    const configStore = new Map<string, FeatureFlagConfig>()
    mockFeatureFlagStore = {
      get: vi.fn(async (realmId: string) => configStore.get(realmId) ?? null),
      set: vi.fn(async (config: FeatureFlagConfig) => {
        configStore.set(config.realmId, config)
      }),
      delete: vi.fn(async (realmId: string) => {
        configStore.delete(realmId)
      }),
      list: vi.fn(async () => Array.from(configStore.values())),
      close: vi.fn(async () => {})
    }

    // Mock Message Repository (fast)
    mockMessageRepository = {
      findByChannel: vi.fn(async () => []),
      save: vi.fn(async () => {})
    } as any

    // Mock LLM Adapter (fast, simulated response)
    mockLlmAdapter = {
      generateResponse: vi.fn(async () => 'Fast response')
    }

    // Mock Device Connection Manager
    const devices = new Map<string, any>()
    devices.set('device-1', {
      deviceId: 'device-1',
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      metadata: { realmId: 'realm-1' }
    })

    mockDeviceConnectionManager = {
      getOnlineDevices: vi.fn(() => Array.from(devices.keys())),
      getConnection: vi.fn((deviceId: string) => devices.get(deviceId)),
      sendToDevice: vi.fn(async () => true)
    } as any

    // Create services
    featureFlagService = new FeatureFlagService(mockFeatureFlagStore)
    executionModeRouter = new ExecutionModeRouter(featureFlagService)
    backendProcessor = new BackendProcessor(
      {
        messageRepository: mockMessageRepository,
        llmAdapter: mockLlmAdapter
      },
      {
        timeout: 5000,
        systemPrompt: 'You are a test assistant.'
      }
    )
    deviceProcessor = new DeviceProcessor(
      {
        deviceConnectionManager: mockDeviceConnectionManager,
        messageRepository: mockMessageRepository
      },
      {
        timeout: 5000,
        pollInterval: 100
      }
    )
  })

  afterEach(() => {
    deviceProcessor.destroy()
  })

  describe('Message Processing Throughput', () => {
    it('should process 100 messages per second in backend mode', async () => {
      // Arrange
      const messageCount = 100
      const tasks: MessageTask[] = []
      for (let i = 0; i < messageCount; i++) {
        tasks.push({
          id: `task-${i}`,
          messageId: `msg-${i}`,
          channelId: 'channel-1',
          content: `Message ${i}`,
          realmId: 'realm-1',
          state: 'PROCESSING',
          executionMode: 'backend',
          attempts: 1,
          maxAttempts: 3,
          priority: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // Act
      const startTime = Date.now()
      await Promise.all(tasks.map(task => backendProcessor.process(task)))
      const endTime = Date.now()
      const duration = endTime - startTime

      // Assert
      const throughput = (messageCount / duration) * 1000 // messages per second
      console.log(`Backend Mode Throughput: ${throughput.toFixed(2)} msg/s`)
      console.log(`Duration: ${duration}ms for ${messageCount} messages`)

      // Target: > 100 msg/s (< 1000ms for 100 messages)
      expect(duration).toBeLessThan(1000)
      expect(throughput).toBeGreaterThan(100)
    })

    it('should handle concurrent device mode requests', async () => {
      // Arrange
      const messageCount = 50
      const tasks: MessageTask[] = []
      for (let i = 0; i < messageCount; i++) {
        tasks.push({
          id: `task-${i}`,
          messageId: `msg-${i}`,
          channelId: 'channel-1',
          content: `Message ${i}`,
          realmId: 'realm-1',
          state: 'PROCESSING',
          executionMode: 'device',
          attempts: 1,
          maxAttempts: 3,
          priority: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // Simulate device responses
      tasks.forEach(task => {
        setTimeout(() => {
          deviceProcessor.handleDeviceResponse(task.messageId, { success: true })
        }, 10)
      })

      // Act
      const startTime = Date.now()
      await Promise.all(tasks.map(task => deviceProcessor.process(task)))
      const endTime = Date.now()
      const duration = endTime - startTime

      // Assert
      const throughput = (messageCount / duration) * 1000
      console.log(`Device Mode Throughput: ${throughput.toFixed(2)} msg/s`)
      console.log(`Duration: ${duration}ms for ${messageCount} messages`)

      // Target: > 50 msg/s (< 1000ms for 50 messages)
      expect(duration).toBeLessThan(1000)
      expect(throughput).toBeGreaterThan(50)
    })
  })

  describe('Feature Flag Query Performance', () => {
    it('should query feature flag in less than 10ms', async () => {
      // Arrange
      await featureFlagService.enable('realm-1', 'llm-execution-mode')

      // Act
      const iterations = 100
      const startTime = Date.now()
      for (let i = 0; i < iterations; i++) {
        await featureFlagService.isEnabled('realm-1', 'llm-execution-mode')
      }
      const endTime = Date.now()
      const avgDuration = (endTime - startTime) / iterations

      // Assert
      console.log(`Feature Flag Query: ${avgDuration.toFixed(2)}ms average`)
      expect(avgDuration).toBeLessThan(10)
    })

    it('should query execution mode in less than 10ms', async () => {
      // Arrange
      await featureFlagService.enable('realm-1', 'llm-execution-mode')
      await featureFlagService.setMode('realm-1', 'device')

      // Act
      const iterations = 100
      const startTime = Date.now()
      for (let i = 0; i < iterations; i++) {
        await executionModeRouter.getMode('realm-1')
      }
      const endTime = Date.now()
      const avgDuration = (endTime - startTime) / iterations

      // Assert
      console.log(`Execution Mode Query: ${avgDuration.toFixed(2)}ms average`)
      expect(avgDuration).toBeLessThan(10)
    })
  })

  describe('Gradual Rollout Performance', () => {
    it('should route messages in less than 1ms', async () => {
      // Arrange
      await featureFlagService.enable('realm-1', 'llm-execution-mode')
      await featureFlagService.setMode('realm-1', 'device')
      await featureFlagService.setRolloutPercentage('realm-1', 50)

      const message = {
        realmId: 'realm-1',
        userId: 'user-1',
        channelId: 'channel-1',
        content: 'test'
      }

      // Act
      const iterations = 1000
      const startTime = Date.now()
      for (let i = 0; i < iterations; i++) {
        await executionModeRouter.routeMessage(message)
      }
      const endTime = Date.now()
      const avgDuration = (endTime - startTime) / iterations

      // Assert
      console.log(`Gradual Rollout Routing: ${avgDuration.toFixed(3)}ms average`)
      expect(avgDuration).toBeLessThan(1)
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory during message processing', async () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024 // MB

      // Act - Process many messages
      const messageCount = 1000
      for (let i = 0; i < messageCount; i++) {
        const task: MessageTask = {
          id: `task-${i}`,
          messageId: `msg-${i}`,
          channelId: 'channel-1',
          content: `Message ${i}`,
          realmId: 'realm-1',
          state: 'PROCESSING',
          executionMode: 'backend',
          attempts: 1,
          maxAttempts: 3,
          priority: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        await backendProcessor.process(task)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024 // MB
      const memoryIncrease = finalMemory - initialMemory

      // Assert
      console.log(`Initial Memory: ${initialMemory.toFixed(2)} MB`)
      console.log(`Final Memory: ${finalMemory.toFixed(2)} MB`)
      console.log(`Memory Increase: ${memoryIncrease.toFixed(2)} MB`)

      // Target: < 50MB increase for 1000 messages
      expect(memoryIncrease).toBeLessThan(50)
    })
  })

  describe('Concurrent Connection Support', () => {
    it('should support 100 concurrent device connections', async () => {
      // Arrange
      const deviceCount = 100
      const devices = new Map<string, any>()
      for (let i = 0; i < deviceCount; i++) {
        devices.set(`device-${i}`, {
          deviceId: `device-${i}`,
          connectedAt: new Date(),
          lastHeartbeat: new Date(),
          metadata: { realmId: `realm-${i % 10}` }
        })
      }

      mockDeviceConnectionManager.getOnlineDevices = vi.fn(() => Array.from(devices.keys()))
      mockDeviceConnectionManager.getConnection = vi.fn((deviceId: string) => devices.get(deviceId))

      // Act
      const startTime = Date.now()
      const results = await Promise.all(
        Array.from({ length: deviceCount }, (_, i) => {
          const task: MessageTask = {
            id: `task-${i}`,
            messageId: `msg-${i}`,
            channelId: 'channel-1',
            content: `Message ${i}`,
            realmId: `realm-${i % 10}`,
            state: 'PROCESSING',
            executionMode: 'device',
            attempts: 1,
            maxAttempts: 3,
            priority: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }

          // Simulate device response
          setTimeout(() => {
            deviceProcessor.handleDeviceResponse(task.messageId, { success: true })
          }, 10)

          return deviceProcessor.process(task)
        })
      )
      const endTime = Date.now()
      const duration = endTime - startTime

      // Assert
      const successCount = results.filter(r => r.success).length
      console.log(`Concurrent Connections: ${deviceCount}`)
      console.log(`Success Rate: ${(successCount / deviceCount * 100).toFixed(2)}%`)
      console.log(`Duration: ${duration}ms`)

      expect(successCount).toBe(deviceCount)
      expect(duration).toBeLessThan(2000) // < 2s for 100 concurrent connections
    })
  })

  describe('End-to-End Latency', () => {
    it('should complete message processing in less than 2s (p95)', async () => {
      // Arrange
      const messageCount = 100
      const latencies: number[] = []

      // Act
      for (let i = 0; i < messageCount; i++) {
        const task: MessageTask = {
          id: `task-${i}`,
          messageId: `msg-${i}`,
          channelId: 'channel-1',
          content: `Message ${i}`,
          realmId: 'realm-1',
          state: 'PROCESSING',
          executionMode: 'backend',
          attempts: 1,
          maxAttempts: 3,
          priority: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const startTime = Date.now()
        await backendProcessor.process(task)
        const endTime = Date.now()
        latencies.push(endTime - startTime)
      }

      // Calculate p95
      latencies.sort((a, b) => a - b)
      const p95Index = Math.floor(messageCount * 0.95)
      const p95Latency = latencies[p95Index]
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / messageCount

      // Assert
      console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`)
      console.log(`P95 Latency: ${p95Latency}ms`)
      console.log(`Max Latency: ${latencies[latencies.length - 1]}ms`)

      expect(p95Latency).toBeLessThan(2000)
      expect(avgLatency).toBeLessThan(100)
    })
  })
})
