/**
 * Stage 2 End-to-End Tests
 *
 * 测试 Feature Flag 系统和双模式执行的完整流程
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FeatureFlagService } from '../feature-flag/feature-flag.service'
import { ExecutionModeRouter } from '../execution-mode/execution-mode-router'
import { MessageOrchestrator } from '../message-orchestrator/message-orchestrator'
import { BackendProcessor } from '../message-orchestrator/backend-processor'
import { DeviceProcessor } from '../message-orchestrator/device-processor'
import type { IFeatureFlagStore } from '../../infrastructure/storage/feature-flag-store.interface'
import type { FeatureFlagConfig } from '../feature-flag/feature-flag.interface'
import type { IMessageQueue, ITaskStore } from '../message-orchestrator/message-orchestrator'
import type { MessageTask, MessageState } from '../message-orchestrator/message-orchestrator.interface'

describe('Stage 2 E2E Tests', () => {
  let featureFlagService: FeatureFlagService
  let executionModeRouter: ExecutionModeRouter
  let messageOrchestrator: MessageOrchestrator
  let mockStore: IFeatureFlagStore
  let mockQueue: IMessageQueue
  let mockTaskStore: ITaskStore

  beforeEach(() => {
    // Mock Feature Flag Store
    const configStore = new Map<string, FeatureFlagConfig>()
    mockStore = {
      get: async (realmId: string) => configStore.get(realmId) ?? null,
      set: async (config: FeatureFlagConfig) => {
        configStore.set(config.realmId, config)
      },
      delete: async (realmId: string) => {
        configStore.delete(realmId)
      },
      list: async () => Array.from(configStore.values()),
      close: async () => {
        // No-op
      }
    }

    // Mock Message Queue
    const queue: MessageTask[] = []
    mockQueue = {
      enqueue: async (task: MessageTask) => {
        queue.push(task)
        return task.id
      },
      dequeue: async () => queue.shift() ?? null,
      peek: async () => queue[0] ?? null,
      size: async () => queue.length
    }

    // Mock Task Store
    const taskStore = new Map<string, MessageTask>()
    mockTaskStore = {
      upsert: async (task: MessageTask) => {
        taskStore.set(task.id, task)
      },
      get: async (taskId: string) => taskStore.get(taskId) ?? null,
      getPending: async () => {
        return Array.from(taskStore.values()).filter(t => t.state === 'PENDING')
      },
      updateState: async (taskId: string, state: MessageState, error?: string) => {
        const task = taskStore.get(taskId)
        if (task) {
          task.state = state
          if (error) {
            task.error = error
          }
          taskStore.set(taskId, task)
        }
      }
    }

    // Create services
    featureFlagService = new FeatureFlagService(mockStore)
    executionModeRouter = new ExecutionModeRouter(featureFlagService)
    const backendProcessor = new BackendProcessor()
    const deviceProcessor = new DeviceProcessor()
    messageOrchestrator = new MessageOrchestrator(
      executionModeRouter,
      backendProcessor,
      deviceProcessor,
      mockQueue,
      mockTaskStore
    )
  })

  describe('Scenario 1: Backend Mode (Default)', () => {
    it('should route all messages to backend mode when feature flag is disabled', async () => {
      // Feature flag is disabled by default

      // Enqueue messages
      const taskId1 = await messageOrchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'realm-1:channel-1',
        content: 'Hello'
      })

      const taskId2 = await messageOrchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'realm-1:channel-2',
        content: 'World'
      })

      // Verify tasks are routed to backend mode
      const task1 = await messageOrchestrator.getTask(taskId1)
      const task2 = await messageOrchestrator.getTask(taskId2)

      expect(task1!.executionMode).toBe('backend')
      expect(task2!.executionMode).toBe('backend')
    })
  })

  describe('Scenario 2: Device Mode (100% Rollout)', () => {
    it('should route all messages to device mode when feature flag is enabled with 100% rollout', async () => {
      // Enable feature flag with 100% rollout
      await featureFlagService.enable('realm-1')
      await featureFlagService.setMode('realm-1', 'device')
      await featureFlagService.setRolloutPercentage('realm-1', 100)

      // Enqueue messages
      const taskId1 = await messageOrchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'realm-1:channel-1',
        content: 'Hello'
      })

      const taskId2 = await messageOrchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'realm-1:channel-2',
        content: 'World'
      })

      // Verify tasks are routed to device mode
      const task1 = await messageOrchestrator.getTask(taskId1)
      const task2 = await messageOrchestrator.getTask(taskId2)

      expect(task1!.executionMode).toBe('device')
      expect(task2!.executionMode).toBe('device')
    })
  })

  describe('Scenario 3: Gradual Rollout (50%)', () => {
    it('should route approximately 50% of messages to device mode', async () => {
      // Enable feature flag with 50% rollout for multiple realms
      // This tests that approximately 50% of realms will use device mode
      const realmCount = 100
      const taskIds: string[] = []

      for (let i = 0; i < realmCount; i++) {
        const realmId = `realm-${i}`

        // Enable feature flag with 50% rollout for each realm
        await featureFlagService.enable(realmId)
        await featureFlagService.setMode(realmId, 'device')
        await featureFlagService.setRolloutPercentage(realmId, 50)

        // Enqueue one message per realm
        const taskId = await messageOrchestrator.enqueue({
          messageId: `msg-${i}`,
          channelId: `${realmId}:channel-1`,
          content: `Message ${i}`
        })
        taskIds.push(taskId)
      }

      // Count device mode tasks
      let deviceCount = 0
      let backendCount = 0

      for (const taskId of taskIds) {
        const task = await messageOrchestrator.getTask(taskId)
        if (task!.executionMode === 'device') {
          deviceCount++
        } else {
          backendCount++
        }
      }

      // Verify approximately 50% are routed to device mode
      // Allow 10% margin of error
      expect(deviceCount).toBeGreaterThan(40)
      expect(deviceCount).toBeLessThan(60)
      expect(backendCount).toBeGreaterThan(40)
      expect(backendCount).toBeLessThan(60)
    })
  })

  describe('Scenario 4: Multi-Realm Routing', () => {
    it('should route messages based on realm-specific feature flags', async () => {
      // Realm 1: Device mode (100%)
      await featureFlagService.enable('realm-1')
      await featureFlagService.setMode('realm-1', 'device')
      await featureFlagService.setRolloutPercentage('realm-1', 100)

      // Realm 2: Backend mode (disabled)
      await featureFlagService.disable('realm-2')

      // Enqueue messages for realm-1
      const taskId1 = await messageOrchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'realm-1:channel-1',
        content: 'Hello'
      })

      // Enqueue messages for realm-2
      const taskId2 = await messageOrchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'realm-2:channel-1',
        content: 'World'
      })

      // Verify routing
      const task1 = await messageOrchestrator.getTask(taskId1)
      const task2 = await messageOrchestrator.getTask(taskId2)

      expect(task1!.executionMode).toBe('device')
      expect(task2!.executionMode).toBe('backend')
    })
  })

  describe('Scenario 5: Message Processing', () => {
    it('should process messages successfully in both modes', async () => {
      // Enable device mode for realm-1
      await featureFlagService.enable('realm-1')
      await featureFlagService.setMode('realm-1', 'device')
      await featureFlagService.setRolloutPercentage('realm-1', 100)

      // Enqueue backend mode message
      const backendTaskId = await messageOrchestrator.enqueue({
        messageId: 'msg-backend',
        channelId: 'realm-2:channel-1',
        content: 'Backend message'
      })

      // Enqueue device mode message
      const deviceTaskId = await messageOrchestrator.enqueue({
        messageId: 'msg-device',
        channelId: 'realm-1:channel-1',
        content: 'Device message'
      })

      // Process messages
      await messageOrchestrator.processNext()
      await messageOrchestrator.processNext()

      // Verify both messages are completed
      const backendTask = await messageOrchestrator.getTask(backendTaskId)
      const deviceTask = await messageOrchestrator.getTask(deviceTaskId)

      expect(backendTask!.state).toBe('COMPLETED')
      expect(deviceTask!.state).toBe('COMPLETED')
    })
  })

  describe('Scenario 6: Feature Flag Updates', () => {
    it('should apply new routing rules after feature flag update', async () => {
      // Initially disabled (backend mode)
      const taskId1 = await messageOrchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'realm-1:channel-1',
        content: 'Hello'
      })

      const task1 = await messageOrchestrator.getTask(taskId1)
      expect(task1!.executionMode).toBe('backend')

      // Enable device mode
      await featureFlagService.enable('realm-1')
      await featureFlagService.setMode('realm-1', 'device')
      await featureFlagService.setRolloutPercentage('realm-1', 100)

      // New messages should use device mode
      const taskId2 = await messageOrchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'realm-1:channel-2',
        content: 'World'
      })

      const task2 = await messageOrchestrator.getTask(taskId2)
      expect(task2!.executionMode).toBe('device')
    })
  })
})
