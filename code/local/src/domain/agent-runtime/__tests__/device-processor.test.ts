/**
 * DeviceProcessor 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeviceProcessor } from '../device-processor'
import type { MessageTask } from '../message-orchestrator.interface'
import type { BackendGateway } from '../../../infrastructure/gateway/backend-gateway.interface'
import type { IAdapterManager } from '../../../infrastructure/adapters/adapter-manager.interface'

describe('DeviceProcessor', () => {
  let deviceProcessor: DeviceProcessor
  let mockBackendGateway: BackendGateway
  let mockAdapterManager: IAdapterManager
  let mockAdapter: any

  beforeEach(() => {
    // Mock LLM Adapter
    mockAdapter = {
      generateResponse: vi.fn().mockResolvedValue('AI response content')
    }

    // Mock AdapterManager
    mockAdapterManager = {
      getAdapter: vi.fn().mockResolvedValue(mockAdapter),
      loadAdapter: vi.fn(),
      unloadAdapter: vi.fn(),
      listAdapters: vi.fn(),
      reloadAdapter: vi.fn(),
      updateAdapterConfig: vi.fn()
    }

    // Mock BackendGateway
    mockBackendGateway = {
      getMessageHistory: vi.fn().mockResolvedValue([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]),
      saveAgentResponse: vi.fn().mockResolvedValue(undefined),
      pushResponseChunk: vi.fn().mockResolvedValue(undefined),
      getExecutionMode: vi.fn(),
      isFeatureFlagEnabled: vi.fn(),
      getFeatureFlags: vi.fn(),
      sendMessageToBackend: vi.fn(),
      fetchRealmConfiguration: vi.fn(),
      getConfigVersion: vi.fn(),
      reportHealth: vi.fn(),
      healthCheck: vi.fn()
    }

    deviceProcessor = new DeviceProcessor(mockBackendGateway, mockAdapterManager)
  })

  describe('process()', () => {
    it('应该成功处理消息任务', async () => {
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await deviceProcessor.process(task)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应该获取对话历史', async () => {
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await deviceProcessor.process(task)

      expect(mockBackendGateway.getMessageHistory).toHaveBeenCalledWith('channel-1')
    })

    it('应该获取 LLM Adapter', async () => {
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await deviceProcessor.process(task)

      expect(mockAdapterManager.getAdapter).toHaveBeenCalledWith('anthropic-adapter')
    })

    it('应该调用 LLM API 生成响应', async () => {
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await deviceProcessor.process(task)

      expect(mockAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.any(String),
          messages: expect.arrayContaining([
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'Test message' }
          ])
        })
      )
    })

    it('应该保存响应到 Backend', async () => {
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await deviceProcessor.process(task)

      expect(mockBackendGateway.saveAgentResponse).toHaveBeenCalledWith({
        channelId: 'channel-1',
        messageId: 'msg-1',
        content: 'AI response content'
      })
    })

    it('当 Adapter 不存在时应该返回错误', async () => {
      mockAdapterManager.getAdapter = vi.fn().mockResolvedValue(null)

      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await deviceProcessor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Adapter')
      expect(result.error).toContain('not found')
    })

    it('当 LLM API 调用失败时应该返回错误', async () => {
      mockAdapter.generateResponse = vi.fn().mockRejectedValue(new Error('API error'))

      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await deviceProcessor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('API error')
    })

    it('当保存响应失败时应该返回错误', async () => {
      mockBackendGateway.saveAgentResponse = vi.fn().mockRejectedValue(new Error('Save failed'))

      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await deviceProcessor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Save failed')
    })

    it('当获取历史失败时应该使用空历史继续处理', async () => {
      mockBackendGateway.getMessageHistory = vi.fn().mockRejectedValue(new Error('History failed'))

      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await deviceProcessor.process(task)

      // 应该继续处理，使用空历史
      expect(result.success).toBe(true)
      expect(mockAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Test message' }]
        })
      )
    })

    it('应该支持流式响应回调', async () => {
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await deviceProcessor.process(task)

      // 验证传递了流式回调
      expect(mockAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          streaming: expect.objectContaining({
            onThinking: expect.any(Function)
          })
        })
      )
    })
  })
})
