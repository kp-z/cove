/**
 * SQLite Task Store Tests
 *
 * 测试 SQLite 任务存储实现
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '../../../generated/client'
import { SqliteTaskStore } from '../sqlite-task-store'
import type { MessageTask } from '../../../domain/message-orchestrator/message-orchestrator.interface'

describe('SqliteTaskStore', () => {
  let prisma: PrismaClient
  let store: SqliteTaskStore

  beforeEach(async () => {
    prisma = new PrismaClient()
    store = new SqliteTaskStore(prisma)

    // 清空测试数据
    await prisma.messageTask.deleteMany()
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  const createMockTask = (overrides?: Partial<MessageTask>): MessageTask => ({
    id: 'task-1',
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

  describe('upsert', () => {
    it('should insert a new task', async () => {
      const task = createMockTask()

      await store.upsert(task)

      const retrieved = await store.get(task.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe(task.id)
      expect(retrieved!.messageId).toBe(task.messageId)
      expect(retrieved!.state).toBe('PENDING')
    })

    it('should update an existing task', async () => {
      const task = createMockTask()
      await store.upsert(task)

      // 更新任务
      task.state = 'PROCESSING'
      task.attempts = 1
      task.updatedAt = new Date()
      await store.upsert(task)

      const retrieved = await store.get(task.id)
      expect(retrieved!.state).toBe('PROCESSING')
      expect(retrieved!.attempts).toBe(1)
    })

    it('should handle task with error', async () => {
      const task = createMockTask({
        state: 'FAILED',
        error: 'Processing failed'
      })

      await store.upsert(task)

      const retrieved = await store.get(task.id)
      expect(retrieved!.state).toBe('FAILED')
      expect(retrieved!.error).toBe('Processing failed')
    })

    it('should handle task with completion time', async () => {
      const completedAt = new Date()
      const task = createMockTask({
        state: 'COMPLETED',
        completedAt
      })

      await store.upsert(task)

      const retrieved = await store.get(task.id)
      expect(retrieved!.state).toBe('COMPLETED')
      expect(retrieved!.completedAt).toBeDefined()
    })
  })

  describe('get', () => {
    it('should return task by id', async () => {
      const task = createMockTask()
      await store.upsert(task)

      const retrieved = await store.get(task.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe(task.id)
    })

    it('should return null for non-existent task', async () => {
      const retrieved = await store.get('non-existent')
      expect(retrieved).toBeNull()
    })
  })

  describe('getPending', () => {
    it('should return all pending tasks', async () => {
      await store.upsert(createMockTask({ id: 'task-1', state: 'PENDING' }))
      await store.upsert(createMockTask({ id: 'task-2', state: 'PENDING' }))
      await store.upsert(createMockTask({ id: 'task-3', state: 'COMPLETED' }))

      const pending = await store.getPending()
      expect(pending).toHaveLength(2)
      expect(pending.every(t => t.state === 'PENDING')).toBe(true)
    })

    it('should return empty array when no pending tasks', async () => {
      const pending = await store.getPending()
      expect(pending).toHaveLength(0)
    })

    it('should order by priority desc and createdAt asc', async () => {
      const now = new Date()
      await store.upsert(createMockTask({
        id: 'task-1',
        priority: 0,
        createdAt: new Date(now.getTime() + 1000)
      }))
      await store.upsert(createMockTask({
        id: 'task-2',
        priority: 1,
        createdAt: now
      }))
      await store.upsert(createMockTask({
        id: 'task-3',
        priority: 1,
        createdAt: new Date(now.getTime() + 2000)
      }))

      const pending = await store.getPending()
      expect(pending[0].id).toBe('task-2') // priority 1, earliest
      expect(pending[1].id).toBe('task-3') // priority 1, later
      expect(pending[2].id).toBe('task-1') // priority 0
    })
  })

  describe('updateState', () => {
    it('should update task state', async () => {
      const task = createMockTask()
      await store.upsert(task)

      await store.updateState(task.id, 'PROCESSING')

      const retrieved = await store.get(task.id)
      expect(retrieved!.state).toBe('PROCESSING')
    })

    it('should update task state with error', async () => {
      const task = createMockTask()
      await store.upsert(task)

      await store.updateState(task.id, 'FAILED', 'Processing failed')

      const retrieved = await store.get(task.id)
      expect(retrieved!.state).toBe('FAILED')
      expect(retrieved!.error).toBe('Processing failed')
    })

    it('should set completedAt when state is COMPLETED', async () => {
      const task = createMockTask()
      await store.upsert(task)

      await store.updateState(task.id, 'COMPLETED')

      const retrieved = await store.get(task.id)
      expect(retrieved!.state).toBe('COMPLETED')
      expect(retrieved!.completedAt).toBeDefined()
    })
  })

  describe('execution modes', () => {
    it('should handle backend execution mode', async () => {
      const task = createMockTask({ executionMode: 'backend' })
      await store.upsert(task)

      const retrieved = await store.get(task.id)
      expect(retrieved!.executionMode).toBe('backend')
    })

    it('should handle device execution mode', async () => {
      const task = createMockTask({ executionMode: 'device' })
      await store.upsert(task)

      const retrieved = await store.get(task.id)
      expect(retrieved!.executionMode).toBe('device')
    })
  })
})
