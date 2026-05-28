/**
 * Device Processor Tests
 *
 * 测试 Device 模式处理器
 */

import { describe, it, expect } from 'vitest'
import { DeviceProcessor } from '../device-processor'
import type { MessageTask } from '../message-orchestrator.interface'

describe('DeviceProcessor', () => {
  const createMockTask = (): MessageTask => ({
    id: 'task-1',
    messageId: 'msg-1',
    channelId: 'channel-1',
    content: 'Hello',
    state: 'PROCESSING',
    executionMode: 'device',
    attempts: 1,
    maxAttempts: 3,
    priority: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  describe('process', () => {
    it('should process message successfully', async () => {
      const processor = new DeviceProcessor()
      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle processing with custom timeout', async () => {
      const processor = new DeviceProcessor({ timeout: 5000 })
      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(true)
    })
  })
})
