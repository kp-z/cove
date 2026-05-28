/**
 * Stage 2 Dual Mode End-to-End Tests
 *
 * 测试 Backend 和 Device 模式的完整执行流程
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

describe('Stage 2 Dual Mode E2E Tests', () => {
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

    // Mock Message Repository
    const messages: any[] = []
    mockMessageRepository = {
      findByChannel: vi.fn(async () => messages),
      save: vi.fn(async (message: any) => {
        messages.push(message)
      })
    } as any

    // Mock LLM Adapter
    mockLlmAdapter = {
      generateResponse: vi.fn(async (params) => {
        return `Response to: ${params.messages[params.messages.length - 1].content}`
      })
    }

    // Mock Device Connection Manager
    const devices = new Map<string, any>()
    mockDeviceConnectionManager = {
      getOnlineDevices: vi.fn(() => Array.from(devices.keys())),
      getConnection: vi.fn((deviceId: string) => devices.get(deviceId)),
      sendToDevice: vi.fn(async () => true)
    } as any

    // Register a mock device
    devices.set('device-1', {
      deviceId: 'device-1',
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      metadata: { realmId: 'realm-1' }
    })

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

  describe('Backend Mode E2E', () => {
    it('should process message in backend mode successfully', async () => {
      // Arrange
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'What is 2+2?',
        realmId: 'realm-1',
        state: 'PROCESSING',
        executionMode: 'backend',
        attempts: 1,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const result = await backendProcessor.process(task)

      // Assert
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockMessageRepository.findByChannel).toHaveBeenCalledWith('channel-1', 50)
      expect(mockLlmAdapter.generateResponse).toHaveBeenCalled()
      expect(mockMessageRepository.save).toHaveBeenCalled()
    })

    it('should handle LLM API error gracefully', async () => {
      // Arrange
      mockLlmAdapter.generateResponse = vi.fn().mockRejectedValue(new Error('API rate limit'))
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello',
        realmId: 'realm-1',
        state: 'PROCESSING',
        executionMode: 'backend',
        attempts: 1,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const result = await backendProcessor.process(task)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('API rate limit')
    })

    it('should process with conversation history', async () => {
      // Arrange
      mockMessageRepository.findByChannel = vi.fn().mockResolvedValue([
        {
          id: 'msg-0',
          channelId: 'channel-1',
          senderId: 'user-1',
          content: 'Hello',
          createdAt: new Date()
        },
        {
          id: 'msg-1',
          channelId: 'channel-1',
          senderId: 'system',
          content: 'Hi there!',
          createdAt: new Date()
        }
      ])

      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'How are you?',
        realmId: 'realm-1',
        state: 'PROCESSING',
        executionMode: 'backend',
        attempts: 1,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const result = await backendProcessor.process(task)

      // Assert
      expect(result.success).toBe(true)
      expect(mockLlmAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' }
          ]
        })
      )
    })
  })

  describe('Device Mode E2E', () => {
    it('should send message to device successfully', async () => {
      // Arrange
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello from device mode',
        realmId: 'realm-1',
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
        deviceProcessor.handleDeviceResponse('msg-1', { success: true })
      }, 50)

      // Act
      const result = await deviceProcessor.process(task)

      // Assert
      expect(result.success).toBe(true)
      expect(mockDeviceConnectionManager.sendToDevice).toHaveBeenCalledWith(
        'device-1',
        expect.objectContaining({
          type: 'message.process',
          payload: expect.objectContaining({
            messageId: 'msg-1',
            content: 'Hello from device mode'
          })
        })
      )
    })

    it('should handle no available device', async () => {
      // Arrange
      mockDeviceConnectionManager.getOnlineDevices = vi.fn(() => [])
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello',
        realmId: 'realm-1',
        state: 'PROCESSING',
        executionMode: 'device',
        attempts: 1,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const result = await deviceProcessor.process(task)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('No available device')
    })

    it('should handle device timeout', async () => {
      // Arrange
      const shortTimeoutProcessor = new DeviceProcessor(
        {
          deviceConnectionManager: mockDeviceConnectionManager,
          messageRepository: mockMessageRepository
        },
        {
          timeout: 100
        }
      )

      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello',
        realmId: 'realm-1',
        state: 'PROCESSING',
        executionMode: 'device',
        attempts: 1,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const result = await shortTimeoutProcessor.process(task)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')

      shortTimeoutProcessor.destroy()
    })
  })

  describe('Feature Flag Routing E2E', () => {
    it('should route to backend mode when feature flag is disabled', async () => {
      // Arrange
      await featureFlagService.disable('realm-1', 'llm-execution-mode')

      // Act
      const mode = await executionModeRouter.getMode('realm-1')

      // Assert
      expect(mode).toBe('backend')
    })

    it('should route to device mode when feature flag is enabled', async () => {
      // Arrange
      await featureFlagService.enable('realm-1', 'llm-execution-mode')
      await featureFlagService.setMode('realm-1', 'device')

      // Act
      const mode = await executionModeRouter.getMode('realm-1')

      // Assert
      expect(mode).toBe('device')
    })

    it('should support gradual rollout based on realm hash', async () => {
      // Arrange - Test with multiple realms to see gradual rollout
      const realms = []
      for (let i = 0; i < 100; i++) {
        realms.push(`realm-${i}`)
      }

      // Enable feature flag with 50% rollout for all realms
      for (const realmId of realms) {
        await featureFlagService.enable(realmId, 'llm-execution-mode')
        await featureFlagService.setMode(realmId, 'device')
        await featureFlagService.setRolloutPercentage(realmId, 50)
      }

      // Act - Test routing for each realm
      const results = new Map<string, number>()
      for (const realmId of realms) {
        const message = {
          realmId,
          userId: 'user-1',
          channelId: 'channel-1',
          content: 'test'
        }
        const mode = await executionModeRouter.routeMessage(message)
        results.set(mode, (results.get(mode) || 0) + 1)
      }

      // Assert - Should be roughly 50/50 split across realms
      const backendCount = results.get('backend') || 0
      const deviceCount = results.get('device') || 0

      // With 50% rollout and 100 realms, expect roughly 40-60 in each bucket
      expect(backendCount).toBeGreaterThan(35)
      expect(backendCount).toBeLessThan(65)
      expect(deviceCount).toBeGreaterThan(35)
      expect(deviceCount).toBeLessThan(65)
      expect(backendCount + deviceCount).toBe(100)
    })
  })

  describe('End-to-End Flow', () => {
    it('should complete full message processing flow in backend mode', async () => {
      // Arrange
      await featureFlagService.disable('realm-1', 'llm-execution-mode')
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Complete flow test',
        realmId: 'realm-1',
        state: 'PROCESSING',
        executionMode: 'backend',
        attempts: 1,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act
      const mode = await executionModeRouter.getMode('realm-1')
      expect(mode).toBe('backend')

      const result = await backendProcessor.process(task)

      // Assert
      expect(result.success).toBe(true)
      expect(mockLlmAdapter.generateResponse).toHaveBeenCalled()
      expect(mockMessageRepository.save).toHaveBeenCalled()
    })

    it('should complete full message processing flow in device mode', async () => {
      // Arrange
      await featureFlagService.enable('realm-1', 'llm-execution-mode')
      await featureFlagService.setMode('realm-1', 'device')
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Complete flow test',
        realmId: 'realm-1',
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
        deviceProcessor.handleDeviceResponse('msg-1', { success: true })
      }, 50)

      // Act
      const mode = await executionModeRouter.getMode('realm-1')
      expect(mode).toBe('device')

      const result = await deviceProcessor.process(task)

      // Assert
      expect(result.success).toBe(true)
      expect(mockDeviceConnectionManager.sendToDevice).toHaveBeenCalled()
    })

    it('should switch between modes dynamically', async () => {
      // Arrange
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Dynamic switch test',
        realmId: 'realm-1',
        state: 'PROCESSING',
        executionMode: 'backend',
        attempts: 1,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Act 1: Backend mode
      await featureFlagService.disable('realm-1', 'llm-execution-mode')
      const mode1 = await executionModeRouter.getMode('realm-1')
      expect(mode1).toBe('backend')

      const result1 = await backendProcessor.process(task)
      expect(result1.success).toBe(true)

      // Act 2: Switch to Device mode
      await featureFlagService.enable('realm-1', 'llm-execution-mode')
      await featureFlagService.setMode('realm-1', 'device')
      const mode2 = await executionModeRouter.getMode('realm-1')
      expect(mode2).toBe('device')

      const task2 = { ...task, id: 'task-2', messageId: 'msg-2' }
      setTimeout(() => {
        deviceProcessor.handleDeviceResponse('msg-2', { success: true })
      }, 50)

      const result2 = await deviceProcessor.process(task2)
      expect(result2.success).toBe(true)
    })
  })
})
