/**
 * BackendProcessor 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackendProcessor } from '../backend-processor'
import type { MessageTask } from '../message-orchestrator.interface'
import type { BackendGateway } from '../../../infrastructure/gateway/backend-gateway.interface'

describe('BackendProcessor', () => {
  let backendProcessor: BackendProcessor
  let mockBackendGateway: BackendGateway

  beforeEach(() => {
    // Mock BackendGateway
    mockBackendGateway = {
      sendMessageToBackend: vi.fn().mockResolvedValue(undefined),
      getExecutionMode: vi.fn(),
      isFeatureFlagEnabled: vi.fn(),
      getFeatureFlags: vi.fn(),
      fetchRealmConfiguration: vi.fn(),
      getConfigVersion: vi.fn(),
      reportHealth: vi.fn(),
      healthCheck: vi.fn(),
      getMessageHistory: vi.fn(),
      saveAgentResponse: vi.fn(),
      pushResponseChunk: vi.fn()
    }

    backendProcessor = new BackendProcessor(mockBackendGateway)
  })

  describe('process()', () => {
    it('应该成功处理消息任务', async () => {
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'backend',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await backendProcessor.process(task)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应该将消息转发到 Backend', async () => {
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'backend',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await backendProcessor.process(task)

      expect(mockBackendGateway.sendMessageToBackend).toHaveBeenCalledWith({
        channelId: 'channel-1',
        content: 'Test message',
        metadata: {
          messageId: 'msg-1',
          executionMode: 'backend'
        }
      })
    })

    it('当转发失败时应该返回错误', async () => {
      mockBackendGateway.sendMessageToBackend = vi.fn().mockRejectedValue(new Error('Network error'))

      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'backend',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await backendProcessor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('应该处理未知错误', async () => {
      mockBackendGateway.sendMessageToBackend = vi.fn().mockRejectedValue('Unknown error')

      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'backend',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await backendProcessor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('应该包含正确的 metadata', async () => {
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'backend',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await backendProcessor.process(task)

      expect(mockBackendGateway.sendMessageToBackend).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            messageId: 'msg-1',
            executionMode: 'backend'
          })
        })
      )
    })
  })
})
