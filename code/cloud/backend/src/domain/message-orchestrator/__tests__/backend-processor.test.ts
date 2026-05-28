/**
 * Backend Processor Tests
 *
 * 测试 Backend 模式处理器
 */

import { describe, it, expect } from 'vitest'
import { BackendProcessor } from '../backend-processor'
import type { MessageTask } from '../message-orchestrator.interface'

describe('BackendProcessor', () => {
  const createMockTask = (): MessageTask => ({
    id: 'task-1',
    messageId: 'msg-1',
    channelId: 'channel-1',
    content: 'Hello',
    state: 'PROCESSING',
    executionMode: 'backend',
    attempts: 1,
    maxAttempts: 3,
    priority: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  describe('process', () => {
    it('should process message successfully', async () => {
      const processor = new BackendProcessor()
      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle processing with custom timeout', async () => {
      const processor = new BackendProcessor({ timeout: 5000 })
      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(true)
    })
  })
})
