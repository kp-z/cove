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
      generateResponse: vi.fn().mockResolvedValue('AI response content'),
      getCapabilities: vi.fn().mockReturnValue({
        supportsStreaming: true,
        supportsBatchMetadata: false,
        supportsThinking: true,
        supportsToolUse: true,
        supportsCostTracking: true
      })
    }

    // Mock AdapterManager
    mockAdapterManager = {
      getAdapter: vi.fn().mockResolvedValue(mockAdapter),
      loadAdapter: vi.fn(),
      unloadAdapter: vi.fn(),
      listAdapters: vi.fn(),
      isLoaded: vi.fn().mockReturnValue(true)
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
      syncAgentMetadata: vi.fn(),
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

      expect(mockBackendGateway.saveAgentResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'channel-1',
          messageId: 'msg-1',
          content: 'AI response content',
          metadata: expect.objectContaining({
            executionMode: 'device',
            adapter: 'anthropic-adapter',
            timestamp: expect.any(String)
          })
        })
      )
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

      // 验证传递了所有流式回调
      expect(mockAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          streaming: expect.objectContaining({
            onThinking: expect.any(Function),
            onToolUse: expect.any(Function),
            onUsage: expect.any(Function),
            onStatusChange: expect.any(Function)
          })
        })
      )
    })

    it('应该支持 Adapter 降级', async () => {
      const fallbackAdapter = {
        generateResponse: vi.fn().mockResolvedValue('Fallback response'),
        getCapabilities: vi.fn().mockReturnValue({
          supportsStreaming: true,
          supportsBatchMetadata: false,
          supportsThinking: true,
          supportsToolUse: true,
          supportsCostTracking: true
        })
      }

      // 主 Adapter 失败
      mockAdapter.generateResponse = vi.fn().mockRejectedValue(new Error('Primary failed'))

      // 配置备用 Adapter
      mockAdapterManager.getAdapter = vi.fn()
        .mockResolvedValueOnce(mockAdapter) // 第一次返回主 Adapter
        .mockResolvedValueOnce(fallbackAdapter) // 第二次返回备用 Adapter

      const deviceProcessorWithFallback = new DeviceProcessor(
        mockBackendGateway,
        mockAdapterManager,
        {
          defaultAdapter: 'primary-adapter',
          fallbackAdapters: ['fallback-adapter']
        }
      )

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

      const result = await deviceProcessorWithFallback.process(task)

      expect(result.success).toBe(true)
      expect(fallbackAdapter.generateResponse).toHaveBeenCalled()
    })

    it('应该截断历史消息', async () => {
      // 创建超过限制的历史消息
      const longHistory = Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }))

      mockBackendGateway.getMessageHistory = vi.fn().mockResolvedValue(longHistory)

      const deviceProcessorWithLimit = new DeviceProcessor(
        mockBackendGateway,
        mockAdapterManager,
        {
          maxHistoryMessages: 10
        }
      )

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

      await deviceProcessorWithLimit.process(task)

      // 验证只使用了最近的 10 条消息 + 当前消息
      expect(mockAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'Message 20' }), // 最近的第 10 条
            expect.objectContaining({ content: 'Test message' }) // 当前消息
          ])
        })
      )

      const call = mockAdapter.generateResponse.mock.calls[0][0]
      expect(call.messages.length).toBe(11) // 10 条历史 + 1 条当前
    })

    it('应该使用自定义系统提示', async () => {
      const deviceProcessorWithPrompt = new DeviceProcessor(
        mockBackendGateway,
        mockAdapterManager,
        {
          defaultSystemPrompt: 'You are a coding assistant.'
        }
      )

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

      await deviceProcessorWithPrompt.process(task)

      expect(mockAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: 'You are a coding assistant.'
        })
      )
    })

    it('应该重试失败的 chunks', async () => {
      let chunkCallCount = 0
      mockBackendGateway.pushResponseChunk = vi.fn().mockImplementation(() => {
        chunkCallCount++
        if (chunkCallCount === 1) {
          // 第一次失败
          return Promise.reject(new Error('Chunk push failed'))
        }
        // 第二次成功
        return Promise.resolve()
      })

      // 模拟流式响应
      mockAdapter.generateResponse = vi.fn().mockImplementation(async (params) => {
        if (params.streaming?.onThinking) {
          await params.streaming.onThinking('test chunk')
        }
        return 'AI response'
      })

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

      // 验证 chunk 被推送了至少两次（第一次失败，第二次重试，可能还有性能指标）
      expect(mockBackendGateway.pushResponseChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'channel-1',
          messageId: 'msg-1',
          chunk: 'test chunk'
        })
      )

      // 验证重试逻辑被触发
      const chunkCalls = (mockBackendGateway.pushResponseChunk as any).mock.calls.filter(
        (call: any) => call[0].chunk === 'test chunk'
      )
      expect(chunkCalls.length).toBe(2) // 第一次失败，第二次重试
    })

    it('应该上报性能指标', async () => {
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

      // 验证上报了性能指标
      const metricsCalls = (mockBackendGateway.pushResponseChunk as any).mock.calls.filter(
        (call: any) => {
          try {
            const data = JSON.parse(call[0].chunk)
            return data.type === 'metrics'
          } catch {
            return false
          }
        }
      )

      expect(metricsCalls.length).toBeGreaterThan(0)
    })
  })
})
