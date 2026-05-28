/**
 * Message Orchestrator Dual Mode Tests
 *
 * 测试消息编排器的双模式执行
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessageOrchestrator } from '../message-orchestrator'
import type { IExecutionModeRouter } from '../../execution-mode/execution-mode-router.interface'
import type { IMessageProcessor } from '../message-processor.interface'
import type { IMessageQueue, ITaskStore } from '../message-orchestrator'
import type { MessageTask, MessageState } from '../message-orchestrator.interface'

describe('MessageOrchestrator - Dual Mode', () => {
  let orchestrator: MessageOrchestrator
  let mockRouter: IExecutionModeRouter
  let mockBackendProcessor: IMessageProcessor
  let mockDeviceProcessor: IMessageProcessor
  let mockQueue: IMessageQueue
  let mockStore: ITaskStore

  beforeEach(() => {
    // Mock ExecutionModeRouter
    mockRouter = {
      routeMessage: vi.fn(),
      shouldUseNewMode: vi.fn()
    }

    // Mock Backend Processor
    mockBackendProcessor = {
      process: vi.fn().mockResolvedValue({ success: true })
    }

    // Mock Device Processor
    mockDeviceProcessor = {
      process: vi.fn().mockResolvedValue({ success: true })
    }

    // Mock Message Queue
    const queue: MessageTask[] = []
    mockQueue = {
      enqueue: vi.fn().mockImplementation(async (task: MessageTask) => {
        queue.push(task)
        return task.id
      }),
      dequeue: vi.fn().mockImplementation(async () => {
        return queue.shift() ?? null
      }),
      peek: vi.fn().mockImplementation(async () => {
        return queue[0] ?? null
      }),
      size: vi.fn().mockImplementation(async () => {
        return queue.length
      })
    }

    // Mock Task Store
    const store = new Map<string, MessageTask>()
    mockStore = {
      upsert: vi.fn().mockImplementation(async (task: MessageTask) => {
        store.set(task.id, task)
      }),
      get: vi.fn().mockImplementation(async (taskId: string) => {
        return store.get(taskId) ?? null
      }),
      getPending: vi.fn().mockImplementation(async () => {
        return Array.from(store.values()).filter(t => t.state === 'PENDING')
      }),
      updateState: vi.fn().mockImplementation(async (taskId: string, state: MessageState, error?: string) => {
        const task = store.get(taskId)
        if (task) {
          task.state = state
          if (error) {
            task.error = error
          }
          store.set(taskId, task)
        }
      })
    }

    orchestrator = new MessageOrchestrator(
      mockRouter,
      mockBackendProcessor,
      mockDeviceProcessor,
      mockQueue,
      mockStore,
      { maxAttempts: 3, pollInterval: 100 }
    )
  })

  describe('enqueue', () => {
    it('should route message to backend mode', async () => {
      vi.mocked(mockRouter.routeMessage).mockResolvedValue('backend')

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      expect(taskId).toBeDefined()
      expect(mockRouter.routeMessage).toHaveBeenCalledWith({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      const task = await mockStore.get(taskId)
      expect(task).toBeDefined()
      expect(task!.executionMode).toBe('backend')
      expect(task!.state).toBe('PENDING')
    })

    it('should route message to device mode', async () => {
      vi.mocked(mockRouter.routeMessage).mockResolvedValue('device')

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'Hello'
      })

      const task = await mockStore.get(taskId)
      expect(task).toBeDefined()
      expect(task!.executionMode).toBe('device')
      expect(task!.state).toBe('PENDING')
    })
  })

  describe('processNext', () => {
    it('should process backend mode message with backend processor', async () => {
      vi.mocked(mockRouter.routeMessage).mockResolvedValue('backend')

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      const processed = await orchestrator.processNext()
      expect(processed).toBe(true)
      expect(mockBackendProcessor.process).toHaveBeenCalled()
      expect(mockDeviceProcessor.process).not.toHaveBeenCalled()

      const task = await mockStore.get(taskId)
      expect(task!.state).toBe('COMPLETED')
      expect(task!.completedAt).toBeDefined()
    })

    it('should process device mode message with device processor', async () => {
      vi.mocked(mockRouter.routeMessage).mockResolvedValue('device')

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'Hello'
      })

      const processed = await orchestrator.processNext()
      expect(processed).toBe(true)
      expect(mockDeviceProcessor.process).toHaveBeenCalled()
      expect(mockBackendProcessor.process).not.toHaveBeenCalled()

      const task = await mockStore.get(taskId)
      expect(task!.state).toBe('COMPLETED')
      expect(task!.completedAt).toBeDefined()
    })

    it('should return false when queue is empty', async () => {
      const processed = await orchestrator.processNext()
      expect(processed).toBe(false)
    })

    it('should retry failed tasks', async () => {
      vi.mocked(mockRouter.routeMessage).mockResolvedValue('backend')
      vi.mocked(mockBackendProcessor.process).mockResolvedValueOnce({
        success: false,
        error: 'Processing failed'
      })

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      // First attempt fails
      await orchestrator.processNext()

      const task = await mockStore.get(taskId)
      expect(task!.state).toBe('PENDING')
      expect(task!.attempts).toBe(1)
      expect(task!.error).toBe('Processing failed')

      // Queue should have the task again
      const queueSize = await mockQueue.size()
      expect(queueSize).toBe(1)
    })

    it('should move to dead letter queue after max attempts', async () => {
      vi.mocked(mockRouter.routeMessage).mockResolvedValue('backend')
      vi.mocked(mockBackendProcessor.process).mockResolvedValue({
        success: false,
        error: 'Processing failed'
      })

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      // Process 3 times (max attempts)
      await orchestrator.processNext()
      await orchestrator.processNext()
      await orchestrator.processNext()

      const task = await mockStore.get(taskId)
      expect(task!.state).toBe('DEAD_LETTER')
      expect(task!.attempts).toBe(3)
      expect(task!.error).toBe('Processing failed')
    })
  })

  describe('start/stop', () => {
    it('should start and stop processing loop', async () => {
      await orchestrator.start()
      await orchestrator.stop()
      // No assertion needed, just verify no errors
    })

    it('should not start twice', async () => {
      await orchestrator.start()
      await orchestrator.start()
      await orchestrator.stop()
      // No assertion needed, just verify no errors
    })
  })

  describe('getTask', () => {
    it('should get task by id', async () => {
      vi.mocked(mockRouter.routeMessage).mockResolvedValue('backend')

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      const task = await orchestrator.getTask(taskId)
      expect(task).toBeDefined()
      expect(task!.id).toBe(taskId)
      expect(task!.messageId).toBe('msg-1')
    })

    it('should return null for non-existent task', async () => {
      const task = await orchestrator.getTask('non-existent')
      expect(task).toBeNull()
    })
  })

  describe('getPendingTasks', () => {
    it('should get all pending tasks', async () => {
      vi.mocked(mockRouter.routeMessage).mockResolvedValue('backend')

      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'World'
      })

      const pending = await orchestrator.getPendingTasks()
      expect(pending).toHaveLength(2)
    })

    it('should return empty array when no pending tasks', async () => {
      const pending = await orchestrator.getPendingTasks()
      expect(pending).toHaveLength(0)
    })
  })
})
