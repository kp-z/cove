/**
 * Message Orchestrator Tests
 *
 * TDD: 测试消息编排器
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  IMessageOrchestrator,
  MessageTask,
  EnqueueMessage
} from '../message-orchestrator.interface'

// Mock 实现用于测试
class MockMessageOrchestrator implements IMessageOrchestrator {
  private tasks: Map<string, MessageTask> = new Map()
  private isRunning = false
  private processingInterval?: NodeJS.Timeout

  async enqueue(message: EnqueueMessage): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random()}`
    const task: MessageTask = {
      id: taskId,
      messageId: message.messageId,
      channelId: message.channelId,
      content: message.content,
      state: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      priority: message.priority ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.tasks.set(taskId, task)
    return taskId
  }

  async processNext(): Promise<boolean> {
    // 找到第一个待处理任务
    const pendingTask = Array.from(this.tasks.values())
      .filter(t => t.state === 'PENDING')
      .sort((a, b) => b.priority - a.priority)[0]

    if (!pendingTask) {
      return false
    }

    // 更新为处理中
    pendingTask.state = 'PROCESSING'
    pendingTask.attempts++
    pendingTask.lastAttemptAt = new Date()
    pendingTask.updatedAt = new Date()

    // 模拟处理
    await this.sleep(10)

    // 标记为完成
    pendingTask.state = 'COMPLETED'
    pendingTask.completedAt = new Date()
    pendingTask.updatedAt = new Date()

    return true
  }

  async getTask(taskId: string): Promise<MessageTask | null> {
    return this.tasks.get(taskId) || null
  }

  async getPendingTasks(): Promise<MessageTask[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.state === 'PENDING')
      .sort((a, b) => b.priority - a.priority)
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 测试辅助方法
  getTasks(): MessageTask[] {
    return Array.from(this.tasks.values())
  }
}

describe('MessageOrchestrator', () => {
  let orchestrator: MockMessageOrchestrator

  beforeEach(() => {
    orchestrator = new MockMessageOrchestrator()
  })

  describe('消息入队', () => {
    it('should enqueue a message', async () => {
      const message: EnqueueMessage = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      }

      const taskId = await orchestrator.enqueue(message)

      expect(taskId).toBeDefined()
      expect(taskId).toMatch(/^task-/)

      const task = await orchestrator.getTask(taskId)
      expect(task).toBeDefined()
      expect(task?.messageId).toBe('msg-1')
      expect(task?.state).toBe('PENDING')
      expect(task?.attempts).toBe(0)
    })

    it('should enqueue multiple messages', async () => {
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

    it('should support message priority', async () => {
      const lowPriority = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Low',
        priority: 1
      })

      const highPriority = await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'High',
        priority: 10
      })

      const pending = await orchestrator.getPendingTasks()
      expect(pending[0].id).toBe(highPriority) // 高优先级在前
      expect(pending[1].id).toBe(lowPriority)
    })
  })

  describe('消息处理', () => {
    it('should process next pending message', async () => {
      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      const processed = await orchestrator.processNext()
      expect(processed).toBe(true)

      const task = await orchestrator.getTask(taskId)
      expect(task?.state).toBe('COMPLETED')
      expect(task?.attempts).toBe(1)
      expect(task?.completedAt).toBeDefined()
    })

    it('should return false when no pending messages', async () => {
      const processed = await orchestrator.processNext()
      expect(processed).toBe(false)
    })

    it('should process messages in priority order', async () => {
      const low = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Low',
        priority: 1
      })

      const high = await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'High',
        priority: 10
      })

      await orchestrator.processNext()

      const highTask = await orchestrator.getTask(high)
      const lowTask = await orchestrator.getTask(low)

      expect(highTask?.state).toBe('COMPLETED')
      expect(lowTask?.state).toBe('PENDING')
    })
  })

  describe('任务状态查询', () => {
    it('should get task by id', async () => {
      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      const task = await orchestrator.getTask(taskId)
      expect(task).toBeDefined()
      expect(task?.id).toBe(taskId)
    })

    it('should return null for non-existent task', async () => {
      const task = await orchestrator.getTask('invalid')
      expect(task).toBeNull()
    })

    it('should get all pending tasks', async () => {
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
      expect(pending.every(t => t.state === 'PENDING')).toBe(true)
    })
  })

  describe('生命周期管理', () => {
    it('should start processing loop', async () => {
      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      await orchestrator.start()

      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 200))

      const pending = await orchestrator.getPendingTasks()
      expect(pending).toHaveLength(0)

      await orchestrator.stop()
    })

    it('should stop processing loop', async () => {
      await orchestrator.start()
      await orchestrator.stop()

      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 200))

      // 应该没有被处理
      const pending = await orchestrator.getPendingTasks()
      expect(pending).toHaveLength(1)
    })

    it('should not start twice', async () => {
      await orchestrator.start()
      await orchestrator.start() // 第二次调用应该被忽略

      await orchestrator.stop()
    })
  })

  describe('状态转换', () => {
    it('should track state transitions', async () => {
      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      // PENDING
      let task = await orchestrator.getTask(taskId)
      expect(task?.state).toBe('PENDING')
      expect(task?.attempts).toBe(0)

      // PROCESSING → COMPLETED
      await orchestrator.processNext()
      task = await orchestrator.getTask(taskId)
      expect(task?.state).toBe('COMPLETED')
      expect(task?.attempts).toBe(1)
      expect(task?.lastAttemptAt).toBeDefined()
      expect(task?.completedAt).toBeDefined()
    })
  })
})
