/**
 * MessageOrchestrator 单元测试
 *
 * 目标：验证「单一 Device 执行模式」编排逻辑（不依赖 Prisma / 网络）。
 * 使用内存 fake 替代队列、任务存储与处理器。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  MessageOrchestrator,
  type IMessageQueue,
  type ITaskStore,
} from '../message-orchestrator'
import type { MessageTask, MessageState } from '../message-orchestrator.interface'
import type { IMessageProcessor, ProcessResult } from '../message-processor.interface'

/**
 * 内存消息队列（FIFO，足够覆盖编排逻辑）
 */
class FakeMessageQueue implements IMessageQueue {
  private items: MessageTask[] = []

  async enqueue(task: MessageTask): Promise<string> {
    this.items.push(task)
    return task.id
  }

  async dequeue(): Promise<MessageTask | null> {
    return this.items.shift() ?? null
  }

  async peek(): Promise<MessageTask | null> {
    return this.items[0] ?? null
  }

  async size(): Promise<number> {
    return this.items.length
  }
}

/**
 * 内存任务存储
 */
class FakeTaskStore implements ITaskStore {
  private tasks = new Map<string, MessageTask>()

  async upsert(task: MessageTask): Promise<void> {
    // 存副本，避免外部引用被后续修改影响断言
    this.tasks.set(task.id, { ...task })
  }

  async get(taskId: string): Promise<MessageTask | null> {
    return this.tasks.get(taskId) ?? null
  }

  async getPending(): Promise<MessageTask[]> {
    return [...this.tasks.values()].filter((t) => t.state === 'PENDING')
  }

  async updateState(taskId: string, state: MessageState, error?: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      task.state = state
      task.error = error
    }
  }
}

describe('MessageOrchestrator（单一 Device 模式）', () => {
  let messageQueue: FakeMessageQueue
  let taskStore: FakeTaskStore
  let deviceProcessor: IMessageProcessor

  beforeEach(() => {
    messageQueue = new FakeMessageQueue()
    taskStore = new FakeTaskStore()
    deviceProcessor = { process: vi.fn() }
  })

  describe('enqueue()', () => {
    it('应将任务以 device 模式入队并落盘', async () => {
      const orchestrator = new MessageOrchestrator(
        deviceProcessor,
        messageQueue,
        taskStore
      )

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello',
        priority: 0,
      })

      expect(typeof taskId).toBe('string')

      const stored = await taskStore.get(taskId)
      expect(stored).not.toBeNull()
      expect(stored?.executionMode).toBe('device')
      expect(stored?.state).toBe('PENDING')
      expect(await messageQueue.size()).toBe(1)
    })

    it('入队过程不应依赖任何 backend 执行模式查询', async () => {
      const orchestrator = new MessageOrchestrator(
        deviceProcessor,
        messageQueue,
        taskStore
      )

      // device processor 不应在入队阶段被调用
      await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'Hi',
      })

      expect(deviceProcessor.process).not.toHaveBeenCalled()
    })
  })

  describe('processNext()', () => {
    it('应使用 DeviceProcessor 处理并在成功时标记 COMPLETED', async () => {
      ;(deviceProcessor.process as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      } satisfies ProcessResult)

      const orchestrator = new MessageOrchestrator(
        deviceProcessor,
        messageQueue,
        taskStore
      )

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-3',
        channelId: 'channel-1',
        content: 'Run',
      })

      const handled = await orchestrator.processNext()
      expect(handled).toBe(true)
      expect(deviceProcessor.process).toHaveBeenCalledTimes(1)

      const stored = await taskStore.get(taskId)
      expect(stored?.state).toBe('COMPLETED')
      expect(stored?.completedAt).toBeInstanceOf(Date)
    })

    it('队列为空时返回 false 且不调用处理器', async () => {
      const orchestrator = new MessageOrchestrator(
        deviceProcessor,
        messageQueue,
        taskStore
      )

      const handled = await orchestrator.processNext()
      expect(handled).toBe(false)
      expect(deviceProcessor.process).not.toHaveBeenCalled()
    })
  })

  describe('失败重试与死信', () => {
    it('处理失败且未达上限时应重新入队（PENDING）', async () => {
      ;(deviceProcessor.process as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'boom',
      } satisfies ProcessResult)

      const orchestrator = new MessageOrchestrator(
        deviceProcessor,
        messageQueue,
        taskStore,
        { maxAttempts: 2 }
      )

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-4',
        channelId: 'channel-1',
        content: 'Fail once',
      })

      await orchestrator.processNext()

      const stored = await taskStore.get(taskId)
      expect(stored?.state).toBe('PENDING')
      expect(stored?.error).toBe('boom')
      // 重新入队，队列中应再次出现
      expect(await messageQueue.size()).toBe(1)
    })

    it('达到最大重试次数后应进入 DEAD_LETTER', async () => {
      ;(deviceProcessor.process as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'always fails',
      } satisfies ProcessResult)

      const orchestrator = new MessageOrchestrator(
        deviceProcessor,
        messageQueue,
        taskStore,
        { maxAttempts: 1 }
      )

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-5',
        channelId: 'channel-1',
        content: 'Always fail',
      })

      await orchestrator.processNext()

      const stored = await taskStore.get(taskId)
      expect(stored?.state).toBe('DEAD_LETTER')
      expect(stored?.error).toBe('always fails')
    })
  })
})
