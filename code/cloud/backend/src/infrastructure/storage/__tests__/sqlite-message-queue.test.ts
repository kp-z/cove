/**
 * SQLite Message Queue Tests
 *
 * 测试 SQLite 消息队列实现
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '../../../../generated/client'
import { SqliteMessageQueue } from '../sqlite-message-queue'
import type { MessageTask } from '../../../domain/message-orchestrator/message-orchestrator.interface'

describe('SqliteMessageQueue', () => {
  let prisma: PrismaClient
  let queue: SqliteMessageQueue

  beforeEach(async () => {
    prisma = new PrismaClient()
    queue = new SqliteMessageQueue(prisma)

    // 清空测试数据
    await prisma.messageTask.deleteMany()
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  const createMockTask = (overrides?: Partial<MessageTask>): MessageTask => ({
    id: `task-${Date.now()}-${Math.random()}`,
    messageId: 'msg-1',
    channelId: 'channel-1',
    content: 'Hello',
    state: 'PENDING',
    executionMode: 'backend',
    attempts: 0,
    maxAttempts: 3,
    priority: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })

  describe('enqueue', () => {
    it('should enqueue a task', async () => {
      const task = createMockTask()

      const taskId = await queue.enqueue(task)

      expect(taskId).toBe(task.id)
      const size = await queue.size()
      expect(size).toBe(1)
    })

    it('should enqueue multiple tasks', async () => {
      await queue.enqueue(createMockTask())
      await queue.enqueue(createMockTask())
      await queue.enqueue(createMockTask())

      const size = await queue.size()
      expect(size).toBe(3)
    })
  })

  describe('dequeue', () => {
    it('should dequeue a task', async () => {
      const task = createMockTask()
      await queue.enqueue(task)

      const dequeued = await queue.dequeue()

      expect(dequeued).toBeDefined()
      expect(dequeued!.id).toBe(task.id)

      const size = await queue.size()
      expect(size).toBe(0)
    })

    it('should return null when queue is empty', async () => {
      const dequeued = await queue.dequeue()
      expect(dequeued).toBeNull()
    })

    it('should dequeue tasks in priority order', async () => {
      const task1 = createMockTask({ id: 'task-1', priority: 0 })
      const task2 = createMockTask({ id: 'task-2', priority: 1 })
      const task3 = createMockTask({ id: 'task-3', priority: 2 })

      await queue.enqueue(task1)
      await queue.enqueue(task2)
      await queue.enqueue(task3)

      const dequeued1 = await queue.dequeue()
      expect(dequeued1!.id).toBe('task-3') // highest priority

      const dequeued2 = await queue.dequeue()
      expect(dequeued2!.id).toBe('task-2')

      const dequeued3 = await queue.dequeue()
      expect(dequeued3!.id).toBe('task-1') // lowest priority
    })

    it('should dequeue tasks in FIFO order for same priority', async () => {
      const now = new Date()
      const task1 = createMockTask({
        id: 'task-1',
        priority: 0,
        createdAt: now
      })
      const task2 = createMockTask({
        id: 'task-2',
        priority: 0,
        createdAt: new Date(now.getTime() + 1000)
      })
      const task3 = createMockTask({
        id: 'task-3',
        priority: 0,
        createdAt: new Date(now.getTime() + 2000)
      })

      await queue.enqueue(task1)
      await queue.enqueue(task2)
      await queue.enqueue(task3)

      const dequeued1 = await queue.dequeue()
      expect(dequeued1!.id).toBe('task-1') // earliest

      const dequeued2 = await queue.dequeue()
      expect(dequeued2!.id).toBe('task-2')

      const dequeued3 = await queue.dequeue()
      expect(dequeued3!.id).toBe('task-3') // latest
    })
  })

  describe('peek', () => {
    it('should peek at the next task without removing it', async () => {
      const task = createMockTask()
      await queue.enqueue(task)

      const peeked = await queue.peek()

      expect(peeked).toBeDefined()
      expect(peeked!.id).toBe(task.id)

      const size = await queue.size()
      expect(size).toBe(1) // task still in queue
    })

    it('should return null when queue is empty', async () => {
      const peeked = await queue.peek()
      expect(peeked).toBeNull()
    })

    it('should peek at the highest priority task', async () => {
      const task1 = createMockTask({ id: 'task-1', priority: 0 })
      const task2 = createMockTask({ id: 'task-2', priority: 1 })

      await queue.enqueue(task1)
      await queue.enqueue(task2)

      const peeked = await queue.peek()
      expect(peeked!.id).toBe('task-2') // highest priority
    })
  })

  describe('size', () => {
    it('should return 0 for empty queue', async () => {
      const size = await queue.size()
      expect(size).toBe(0)
    })

    it('should return correct size', async () => {
      await queue.enqueue(createMockTask())
      await queue.enqueue(createMockTask())
      await queue.enqueue(createMockTask())

      const size = await queue.size()
      expect(size).toBe(3)
    })

    it('should update size after dequeue', async () => {
      await queue.enqueue(createMockTask())
      await queue.enqueue(createMockTask())

      await queue.dequeue()

      const size = await queue.size()
      expect(size).toBe(1)
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent enqueues', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask({ id: `task-${i}` })
      )

      await Promise.all(tasks.map(task => queue.enqueue(task)))

      const size = await queue.size()
      expect(size).toBe(10)
    })

    it('should handle concurrent dequeues', async () => {
      // Enqueue tasks
      const tasks = Array.from({ length: 5 }, (_, i) =>
        createMockTask({ id: `task-${i}` })
      )
      await Promise.all(tasks.map(task => queue.enqueue(task)))

      // Dequeue concurrently
      const dequeued = await Promise.all([
        queue.dequeue(),
        queue.dequeue(),
        queue.dequeue()
      ])

      // All should be unique
      const ids = dequeued.filter(t => t !== null).map(t => t!.id)
      expect(new Set(ids).size).toBe(ids.length)

      const size = await queue.size()
      expect(size).toBe(2)
    })
  })
})
