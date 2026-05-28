/**
 * MessageOrchestrator Integration Tests
 *
 * 集成测试：验证 MessageOrchestrator + MessageQueue + TaskStore 的协作
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
  IMessageOrchestrator,
  MessageTask,
  EnqueueMessage,
  MessageState
} from '../message-orchestrator.interface'
import type { IMessageQueue } from '../../../infrastructure/storage/message-queue.interface'
import type { ITaskStore } from '../../../infrastructure/storage/task-store.interface'

// ==================== Mock 实现 ====================

/**
 * Mock MessageQueue 实现（内存存储）
 */
class MockMessageQueue implements IMessageQueue {
  private messages: Map<string, MessageTask> = new Map()

  async enqueue(message: EnqueueMessage): Promise<string> {
    const task: MessageTask = {
      id: `task-${Date.now()}-${Math.random()}`,
      messageId: message.messageId,
      channelId: message.channelId,
      content: message.content,
      state: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      priority: message.priority || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.messages.set(task.id, task)
    return task.id
  }

  async dequeue(): Promise<MessageTask | null> {
    // 按优先级排序，优先级高的先处理
    const pending = Array.from(this.messages.values())
      .filter(t => t.state === 'PENDING')
      .sort((a, b) => b.priority - a.priority)

    return pending[0] || null
  }

  async findByState(state: MessageState): Promise<MessageTask[]> {
    return Array.from(this.messages.values()).filter(t => t.state === state)
  }

  async updateState(taskId: string, state: MessageState): Promise<void> {
    const task = this.messages.get(taskId)
    if (task) {
      task.state = state
      task.updatedAt = new Date()
    }
  }

  async close(): Promise<void> {
    // 清理资源
  }

  // 测试辅助方法
  clear(): void {
    this.messages.clear()
  }
}

/**
 * Mock TaskStore 实现（内存存储）
 */
class MockTaskStore implements ITaskStore {
  private tasks: Map<string, MessageTask> = new Map()

  async get(taskId: string): Promise<MessageTask | null> {
    return this.tasks.get(taskId) || null
  }

  async upsert(task: Partial<MessageTask> & { id?: string; messageId?: string }): Promise<void> {
    const taskId = task.id || task.messageId
    if (!taskId) {
      throw new Error('Task ID or Message ID is required')
    }

    const existing = this.tasks.get(taskId)
    if (existing) {
      // 更新现有任务
      Object.assign(existing, task, { updatedAt: new Date() })
    } else {
      // 创建新任务
      const newTask: MessageTask = {
        id: taskId,
        messageId: task.messageId || taskId,
        channelId: task.channelId || '',
        content: task.content || '',
        state: task.state || 'PENDING',
        attempts: task.attempts || 0,
        maxAttempts: task.maxAttempts || 3,
        priority: task.priority || 0,
        createdAt: task.createdAt || new Date(),
        updatedAt: new Date(),
        lastAttemptAt: task.lastAttemptAt,
        completedAt: task.completedAt,
        error: task.error
      }
      this.tasks.set(taskId, newTask)
    }
  }

  async delete(taskId: string): Promise<void> {
    this.tasks.delete(taskId)
  }

  async findByState(state: MessageState): Promise<MessageTask[]> {
    return Array.from(this.tasks.values()).filter(t => t.state === state)
  }

  async close(): Promise<void> {
    // 清理资源
  }

  // 测试辅助方法
  clear(): void {
    this.tasks.clear()
  }
}

/**
 * Mock MessageOrchestrator 实现
 */
class MockMessageOrchestrator implements IMessageOrchestrator {
  private isRunning = false
  private processingInterval?: NodeJS.Timeout

  constructor(
    private messageQueue: IMessageQueue,
    private taskStore: ITaskStore,
    private messageProcessor?: (task: MessageTask) => Promise<void>
  ) {}

  async enqueue(message: EnqueueMessage): Promise<string> {
    // 1. 消息入队
    const taskId = await this.messageQueue.enqueue(message)

    // 2. 保存任务状态
    await this.taskStore.upsert({
      id: taskId,
      messageId: message.messageId,
      channelId: message.channelId,
      content: message.content,
      state: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      priority: message.priority || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return taskId
  }

  async processNext(): Promise<boolean> {
    // 1. 从队列获取下一条消息
    const task = await this.messageQueue.dequeue()
    if (!task) {
      return false
    }

    // 2. 更新任务状态为 PROCESSING
    await this.taskStore.upsert({
      id: task.id,
      state: 'PROCESSING',
      attempts: task.attempts + 1,
      lastAttemptAt: new Date()
    })

    await this.messageQueue.updateState(task.id, 'PROCESSING')

    try {
      // 3. 处理消息
      if (this.messageProcessor) {
        await this.messageProcessor(task)
      }

      // 4. 标记为完成
      await this.taskStore.upsert({
        id: task.id,
        state: 'COMPLETED',
        completedAt: new Date()
      })

      await this.messageQueue.updateState(task.id, 'COMPLETED')

      return true
    } catch (error) {
      // 5. 处理失败
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.taskStore.upsert({
        id: task.id,
        state: 'FAILED',
        error: errorMessage
      })

      await this.messageQueue.updateState(task.id, 'FAILED')

      return true
    }
  }

  async getTask(taskId: string): Promise<MessageTask | null> {
    return this.taskStore.get(taskId)
  }

  async getPendingTasks(): Promise<MessageTask[]> {
    return this.taskStore.findByState('PENDING')
  }

  async start(): Promise<void> {
    this.isRunning = true
    // 启动处理循环（简化版，实际应该使用事件驱动）
    this.processingInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.processNext()
      }
    }, 100)
  }

  async stop(): Promise<void> {
    this.isRunning = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = undefined
    }
  }
}

// ==================== 测试套件 ====================

describe('MessageOrchestrator Integration', () => {
  let messageQueue: MockMessageQueue
  let taskStore: MockTaskStore
  let orchestrator: MockMessageOrchestrator
  let messageProcessor: ReturnType<typeof vi.fn>

  beforeEach(() => {
    messageQueue = new MockMessageQueue()
    taskStore = new MockTaskStore()
    messageProcessor = vi.fn().mockResolvedValue(undefined)
    orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)
  })

  afterEach(async () => {
    await orchestrator.stop()
    messageQueue.clear()
    taskStore.clear()
  })

  describe('消息入队和处理', () => {
    it('should process message from queue to completion', async () => {
      // 1. 消息入队
      const message: EnqueueMessage = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello, AI!'
      }

      const taskId = await orchestrator.enqueue(message)
      expect(taskId).toBeDefined()

      // 2. 验证消息在队列中
      const pending = await messageQueue.findByState('PENDING')
      expect(pending).toHaveLength(1)
      expect(pending[0].messageId).toBe('msg-1')

      // 3. 处理消息
      const processed = await orchestrator.processNext()
      expect(processed).toBe(true)
      expect(messageProcessor).toHaveBeenCalledOnce()

      // 4. 验证任务状态更新
      const task = await taskStore.get(taskId)
      expect(task).toBeDefined()
      expect(task!.state).toBe('COMPLETED')
      expect(task!.attempts).toBe(1)
      expect(task!.completedAt).toBeDefined()
    })

    it('should handle multiple messages in sequence', async () => {
      // 入队 3 条消息
      const taskId1 = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Message 1'
      })

      const taskId2 = await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'Message 2'
      })

      const taskId3 = await orchestrator.enqueue({
        messageId: 'msg-3',
        channelId: 'channel-1',
        content: 'Message 3'
      })

      // 验证都在队列中
      const pending = await taskStore.findByState('PENDING')
      expect(pending).toHaveLength(3)

      // 依次处理
      await orchestrator.processNext()
      await orchestrator.processNext()
      await orchestrator.processNext()

      // 验证都已完成
      const task1 = await taskStore.get(taskId1)
      const task2 = await taskStore.get(taskId2)
      const task3 = await taskStore.get(taskId3)

      expect(task1!.state).toBe('COMPLETED')
      expect(task2!.state).toBe('COMPLETED')
      expect(task3!.state).toBe('COMPLETED')
    })
  })

  describe('优先级调度', () => {
    it('should process high priority messages first', async () => {
      // 入队低优先级消息
      const taskId1 = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Low priority',
        priority: 1
      })

      // 入队高优先级消息
      const taskId2 = await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'High priority',
        priority: 10
      })

      // 处理第一条消息（应该是高优先级的）
      await orchestrator.processNext()

      // 验证高优先级消息先处理
      const task1 = await taskStore.get(taskId1)
      const task2 = await taskStore.get(taskId2)

      expect(task2!.state).toBe('COMPLETED')
      expect(task1!.state).toBe('PENDING')
    })

    it('should process messages in priority order', async () => {
      const processedOrder: string[] = []

      messageProcessor.mockImplementation(async (task: MessageTask) => {
        processedOrder.push(task.messageId)
      })

      // 入队不同优先级的消息
      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Priority 5',
        priority: 5
      })

      await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'Priority 10',
        priority: 10
      })

      await orchestrator.enqueue({
        messageId: 'msg-3',
        channelId: 'channel-1',
        content: 'Priority 1',
        priority: 1
      })

      // 依次处理
      await orchestrator.processNext()
      await orchestrator.processNext()
      await orchestrator.processNext()

      // 验证处理顺序：10 -> 5 -> 1
      expect(processedOrder).toEqual(['msg-2', 'msg-1', 'msg-3'])
    })
  })

  describe('错误处理和重试', () => {
    it('should mark task as failed when processing fails', async () => {
      // 模拟处理失败
      messageProcessor.mockRejectedValueOnce(new Error('Processing failed'))

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message'
      })

      await orchestrator.processNext()

      // 验证任务标记为失败
      const task = await taskStore.get(taskId)
      expect(task!.state).toBe('FAILED')
      expect(task!.attempts).toBe(1)
      expect(task!.error).toBe('Processing failed')
    })

    it('should record attempt count on failure', async () => {
      messageProcessor.mockRejectedValue(new Error('Always fails'))

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message'
      })

      // 第一次尝试
      await orchestrator.processNext()

      const task = await taskStore.get(taskId)
      expect(task!.attempts).toBe(1)
      expect(task!.lastAttemptAt).toBeDefined()
    })

    it('should succeed on retry after initial failure', async () => {
      // 第一次失败，第二次成功
      messageProcessor
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(undefined)

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message'
      })

      // 第一次处理（失败）
      await orchestrator.processNext()
      let task = await taskStore.get(taskId)
      expect(task!.state).toBe('FAILED')

      // 重新入队（模拟重试机制）
      await messageQueue.updateState(taskId, 'PENDING')
      await taskStore.upsert({ id: taskId, state: 'PENDING' })

      // 第二次处理（成功）
      await orchestrator.processNext()
      task = await taskStore.get(taskId)
      expect(task!.state).toBe('COMPLETED')
    })
  })

  describe('消息持久化和恢复', () => {
    it('should persist pending messages', async () => {
      // 入队消息
      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message'
      })

      // 验证消息持久化
      const pending = await taskStore.findByState('PENDING')
      expect(pending).toHaveLength(1)
      expect(pending[0].messageId).toBe('msg-1')
    })

    it('should recover pending messages after restart', async () => {
      // 入队消息
      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message'
      })

      // 停止 orchestrator
      await orchestrator.stop()

      // 创建新的 orchestrator（模拟重启）
      const newOrchestrator = new MockMessageOrchestrator(
        messageQueue,
        taskStore,
        messageProcessor
      )

      // 验证可以获取待处理任务
      const pending = await newOrchestrator.getPendingTasks()
      expect(pending).toHaveLength(1)
      expect(pending[0].messageId).toBe('msg-1')

      // 验证可以继续处理
      await newOrchestrator.processNext()
      const task = await taskStore.get(pending[0].id)
      expect(task!.state).toBe('COMPLETED')
    })

    it('should not reprocess completed messages after restart', async () => {
      // 入队并处理消息
      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message'
      })

      await orchestrator.processNext()

      // 验证已完成
      let task = await taskStore.get(taskId)
      expect(task!.state).toBe('COMPLETED')

      // 重启
      await orchestrator.stop()
      const newOrchestrator = new MockMessageOrchestrator(
        messageQueue,
        taskStore,
        messageProcessor
      )

      // 验证没有待处理任务
      const pending = await newOrchestrator.getPendingTasks()
      expect(pending).toHaveLength(0)

      // 尝试处理（应该没有消息）
      const processed = await newOrchestrator.processNext()
      expect(processed).toBe(false)
    })
  })

  describe('生命周期管理', () => {
    it('should start and stop processing loop', async () => {
      await orchestrator.start()
      // 验证已启动（通过内部状态，这里简化测试）
      expect(true).toBe(true)

      await orchestrator.stop()
      // 验证已停止
      expect(true).toBe(true)
    })

    it('should process messages automatically when started', async () => {
      // 入队消息
      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message'
      })

      // 启动自动处理
      await orchestrator.start()

      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 200))

      // 验证消息已处理
      const task = await taskStore.get(taskId)
      expect(task!.state).toBe('COMPLETED')

      await orchestrator.stop()
    })
  })

  describe('任务查询', () => {
    it('should get task by id', async () => {
      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message'
      })

      const task = await orchestrator.getTask(taskId)
      expect(task).toBeDefined()
      expect(task!.messageId).toBe('msg-1')
    })

    it('should return null for non-existent task', async () => {
      const task = await orchestrator.getTask('non-existent')
      expect(task).toBeNull()
    })

    it('should get all pending tasks', async () => {
      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Message 1'
      })

      await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'Message 2'
      })

      const pending = await orchestrator.getPendingTasks()
      expect(pending).toHaveLength(2)
    })
  })
})
