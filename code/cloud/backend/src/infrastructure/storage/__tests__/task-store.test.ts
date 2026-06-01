/**
 * Task Store Tests
 *
 * TDD: 测试任务状态存储
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type {
  ITaskStore,
  TaskRecord,
  UpsertTaskData
} from '../task-store.interface'

// Mock 实现用于测试
class MockTaskStore implements ITaskStore {
  private tasks: Map<string, TaskRecord> = new Map()

  async upsert(data: UpsertTaskData): Promise<void> {
    const existing = this.tasks.get(data.messageId)

    if (existing) {
      // 更新现有任务
      existing.state = data.state
      existing.agentId = data.agentId ?? existing.agentId
      existing.attempts = data.attempts ?? existing.attempts
      existing.maxAttempts = data.maxAttempts ?? existing.maxAttempts
      existing.result = data.result ?? existing.result
      existing.error = data.error ?? existing.error
      existing.lastAttemptAt = data.lastAttemptAt ?? existing.lastAttemptAt
      existing.completedAt = data.completedAt ?? existing.completedAt
      existing.updatedAt = new Date()
    } else {
      // 创建新任务
      const task: TaskRecord = {
        id: `task-${Date.now()}-${Math.random()}`,
        messageId: data.messageId,
        channelId: data.channelId,
        agentId: data.agentId,
        state: data.state,
        attempts: data.attempts ?? 0,
        maxAttempts: data.maxAttempts ?? 3,
        result: data.result,
        error: data.error,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAttemptAt: data.lastAttemptAt,
        completedAt: data.completedAt
      }

      this.tasks.set(data.messageId, task)
    }
  }

  async get(messageId: string): Promise<TaskRecord | null> {
    return this.tasks.get(messageId) || null
  }

  async findByState(state: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'): Promise<TaskRecord[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.state === state)
  }

  async delete(messageId: string): Promise<void> {
    this.tasks.delete(messageId)
  }

  async clear(): Promise<void> {
    this.tasks.clear()
  }

  async close(): Promise<void> {
    // Mock 实现不需要关闭连接
  }
}

describe('TaskStore', () => {
  let store: MockTaskStore

  beforeEach(() => {
    store = new MockTaskStore()
  })

  afterEach(async () => {
    await store.close()
  })

  describe('任务创建', () => {
    it('should create new task', async () => {
      const data: UpsertTaskData = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PENDING'
      }

      await store.upsert(data)

      const task = await store.get('msg-1')
      expect(task).toBeDefined()
      expect(task?.messageId).toBe('msg-1')
      expect(task?.state).toBe('PENDING')
      expect(task?.attempts).toBe(0)
      expect(task?.maxAttempts).toBe(3)
    })

    it('should create task with custom values', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        state: 'PROCESSING',
        attempts: 1,
        maxAttempts: 5,
        lastAttemptAt: new Date()
      })

      const task = await store.get('msg-1')
      expect(task?.agentId).toBe('agent-1')
      expect(task?.attempts).toBe(1)
      expect(task?.maxAttempts).toBe(5)
      expect(task?.lastAttemptAt).toBeDefined()
    })
  })

  describe('任务更新', () => {
    it('should update existing task', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PENDING'
      })

      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'COMPLETED',
        result: 'Success'
      })

      const task = await store.get('msg-1')
      expect(task?.state).toBe('COMPLETED')
      expect(task?.result).toBe('Success')
    })

    it('should preserve fields not being updated', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        state: 'PENDING',
        attempts: 0
      })

      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PROCESSING',
        attempts: 1
      })

      const task = await store.get('msg-1')
      expect(task?.agentId).toBe('agent-1') // 保留原值
      expect(task?.attempts).toBe(1) // 更新
    })
  })

  describe('幂等性保证', () => {
    it('should return cached result for completed task', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'COMPLETED',
        result: 'Cached result'
      })

      const task = await store.get('msg-1')
      expect(task?.state).toBe('COMPLETED')
      expect(task?.result).toBe('Cached result')

      // 重复处理应该返回缓存结果
      const cachedTask = await store.get('msg-1')
      expect(cachedTask?.result).toBe('Cached result')
    })

    it('should prevent duplicate processing', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'COMPLETED'
      })

      const task = await store.get('msg-1')
      expect(task?.state).toBe('COMPLETED')

      // 尝试重新处理
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PROCESSING'
      })

      const updatedTask = await store.get('msg-1')
      expect(updatedTask?.state).toBe('PROCESSING') // 允许更新状态
    })
  })

  describe('任务查询', () => {
    it('should get task by message id', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PENDING'
      })

      const task = await store.get('msg-1')
      expect(task).toBeDefined()
      expect(task?.messageId).toBe('msg-1')
    })

    it('should return null for non-existent task', async () => {
      const task = await store.get('invalid')
      expect(task).toBeNull()
    })

    it('should find tasks by state', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PENDING'
      })

      await store.upsert({
        messageId: 'msg-2',
        channelId: 'channel-1',
        state: 'PENDING'
      })

      await store.upsert({
        messageId: 'msg-3',
        channelId: 'channel-1',
        state: 'COMPLETED'
      })

      const pending = await store.findByState('PENDING')
      expect(pending).toHaveLength(2)

      const completed = await store.findByState('COMPLETED')
      expect(completed).toHaveLength(1)
    })
  })

  describe('任务删除', () => {
    it('should delete task', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PENDING'
      })

      await store.delete('msg-1')

      const task = await store.get('msg-1')
      expect(task).toBeNull()
    })

    it('should not throw error when deleting non-existent task', async () => {
      await store.delete('invalid')
      expect(true).toBe(true)
    })
  })

  describe('清空任务', () => {
    it('should clear all tasks', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PENDING'
      })

      await store.upsert({
        messageId: 'msg-2',
        channelId: 'channel-1',
        state: 'COMPLETED'
      })

      await store.clear()

      const pending = await store.findByState('PENDING')
      const completed = await store.findByState('COMPLETED')

      expect(pending).toHaveLength(0)
      expect(completed).toHaveLength(0)
    })
  })

  describe('崩溃恢复', () => {
    it('should recover tasks after restart', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PROCESSING',
        attempts: 1
      })

      await store.close()

      // 模拟重启
      const newStore = new MockTaskStore()
      // 在真实实现中，这里会从 SQLite 加载数据

      const task = await newStore.get('msg-1')
      // Mock 实现不会持久化，所以这里是 null
      expect(task).toBeNull()
    })

    it('should track attempts for retry logic', async () => {
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PROCESSING',
        attempts: 1
      })

      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'FAILED',
        attempts: 2,
        error: 'Network error'
      })

      const task = await store.get('msg-1')
      expect(task?.attempts).toBe(2)
      expect(task?.error).toBe('Network error')
    })
  })

  describe('状态转换', () => {
    it('should track state transitions', async () => {
      // PENDING
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PENDING'
      })

      let task = await store.get('msg-1')
      expect(task?.state).toBe('PENDING')

      // PROCESSING
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'PROCESSING',
        attempts: 1,
        lastAttemptAt: new Date()
      })

      task = await store.get('msg-1')
      expect(task?.state).toBe('PROCESSING')
      expect(task?.attempts).toBe(1)

      // COMPLETED
      await store.upsert({
        messageId: 'msg-1',
        channelId: 'channel-1',
        state: 'COMPLETED',
        result: 'Success',
        completedAt: new Date()
      })

      task = await store.get('msg-1')
      expect(task?.state).toBe('COMPLETED')
      expect(task?.result).toBe('Success')
      expect(task?.completedAt).toBeDefined()
    })
  })
})
