/**
 * DeviceProcessor 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeviceProcessor } from '../device-processor'
import { ExecutionRegistry } from '../execution-registry'
import type { MessageTask } from '../message-orchestrator.interface'
import type { BackendGateway } from '../../../infrastructure/gateway/backend-gateway.interface'
import type { IAdapterManager } from '../../../infrastructure/adapters/adapter-manager.interface'

describe('DeviceProcessor', () => {
  let deviceProcessor: DeviceProcessor
  let mockBackendGateway: BackendGateway
  let mockAdapterManager: IAdapterManager
  let mockAdapter: any
  let executionRegistry: ExecutionRegistry

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
      reportAgentFailure: vi.fn().mockResolvedValue(undefined),
      reportAgentAbort: vi.fn().mockResolvedValue(undefined),
      getExecutionMode: vi.fn(),
      isFeatureFlagEnabled: vi.fn(),
      getFeatureFlags: vi.fn(),
      syncAgentMetadata: vi.fn(),
      fetchRealmConfiguration: vi.fn(),
      getConfigVersion: vi.fn(),
      reportHealth: vi.fn(),
      healthCheck: vi.fn()
    }

    executionRegistry = new ExecutionRegistry()
    deviceProcessor = new DeviceProcessor(
      mockBackendGateway,
      mockAdapterManager,
      {},
      executionRegistry
    )
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

      // 契约 L4：执行元数据作为顶层 execution 字段下发（而非嵌套在 metadata 内）
      expect(mockBackendGateway.saveAgentResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'channel-1',
          messageId: 'msg-1',
          content: 'AI response content',
          execution: expect.objectContaining({
            executionMode: 'streaming',
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

    it('用户中止执行后应上报 abort 终态且不按失败处理', async () => {
      const agentMessageId = 'agent-message-1'
      const task: MessageTask = {
        id: 'task-abort',
        messageId: 'user-message-fallback',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          agentId: 'agent-1',
          agentMessageId,
          userMessageId: 'user-message-1'
        }
      }

      mockAdapter.generateResponse = vi.fn().mockImplementation(({ signal }) => {
        if (!signal) {
          return Promise.reject(new Error('AbortSignal missing'))
        }

        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          }, { once: true })
        })
      })

      const processing = deviceProcessor.process(task)
      await vi.waitFor(() => expect(executionRegistry.has(agentMessageId)).toBe(true))
      expect(executionRegistry.abort(agentMessageId)).toBe(true)

      await expect(processing).resolves.toEqual({ success: true, aborted: true })
      expect(mockBackendGateway.reportAgentAbort).toHaveBeenCalledWith({
        channelId: 'channel-1',
        messageId: agentMessageId,
        userMessageId: 'user-message-1',
        agentId: 'agent-1',
        reason: 'user'
      })
      expect(mockBackendGateway.reportAgentFailure).not.toHaveBeenCalled()
      expect(executionRegistry.has(agentMessageId)).toBe(false)
    })

    it('abort 终态连续上报失败时应返回失败且不得上报普通执行失败', async () => {
      const agentMessageId = 'agent-message-report-failure'
      const task: MessageTask = {
        id: 'task-abort-report-failure',
        messageId: 'user-message-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          agentId: 'agent-1',
          agentMessageId,
          userMessageId: 'user-message-1'
        }
      }

      mockAdapter.generateResponse = vi.fn().mockImplementation(({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          }, { once: true })
        })
      )
      mockBackendGateway.reportAgentAbort = vi.fn().mockRejectedValue(new Error('Cloud unavailable'))

      const processing = deviceProcessor.process(task)
      await vi.waitFor(() => expect(executionRegistry.has(agentMessageId)).toBe(true))
      executionRegistry.abort(agentMessageId)

      await expect(processing).resolves.toMatchObject({
        success: false,
        aborted: true,
        error: expect.stringContaining('Cloud unavailable')
      })
      expect(mockBackendGateway.reportAgentAbort).toHaveBeenCalledTimes(3)
      expect(mockBackendGateway.reportAgentFailure).not.toHaveBeenCalled()
    })

    it('abort 上报短暂失败后应重试并在成功后结束云端等待', async () => {
      const agentMessageId = 'agent-message-report-retry'
      const task: MessageTask = {
        id: 'task-abort-report-retry',
        messageId: 'user-message-1',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          agentId: 'agent-1',
          agentMessageId,
          userMessageId: 'user-message-1'
        }
      }

      mockAdapter.generateResponse = vi.fn().mockImplementation(({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          }, { once: true })
        })
      )
      mockBackendGateway.reportAgentAbort = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined)

      const processing = deviceProcessor.process(task)
      await vi.waitFor(() => expect(executionRegistry.has(agentMessageId)).toBe(true))
      executionRegistry.abort(agentMessageId)

      await expect(processing).resolves.toEqual({ success: true, aborted: true })
      expect(mockBackendGateway.reportAgentAbort).toHaveBeenCalledTimes(2)
      expect(mockBackendGateway.reportAgentFailure).not.toHaveBeenCalled()
    })

    it('abort 上报缺少 metadata userMessageId 时应使用 task.messageId', async () => {
      const agentMessageId = 'agent-message-user-fallback'
      const task: MessageTask = {
        id: 'task-abort-user-fallback',
        messageId: 'user-message-fallback',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { agentMessageId }
      }

      mockAdapter.generateResponse = vi.fn().mockImplementation(({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          }, { once: true })
        })
      )

      const processing = deviceProcessor.process(task)
      await vi.waitFor(() => expect(executionRegistry.has(agentMessageId)).toBe(true))
      executionRegistry.abort(agentMessageId)
      await processing

      expect(mockBackendGateway.reportAgentAbort).toHaveBeenCalledWith(
        expect.objectContaining({ userMessageId: 'user-message-fallback' })
      )
    })

    it('历史拉取期间收到 abort 应命中 registry 并上报 abort 终态', async () => {
      const agentMessageId = 'agent-message-history-abort'
      const task: MessageTask = {
        id: 'task-history-abort',
        messageId: 'user-message-fallback',
        channelId: 'channel-1',
        content: 'Test message',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          agentId: 'agent-1',
          agentMessageId,
          userMessageId: 'user-message-1'
        }
      }

      mockBackendGateway.getMessageHistory = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      const processing = deviceProcessor.process(task)
      await vi.waitFor(() => expect(executionRegistry.has(agentMessageId)).toBe(true))
      expect(executionRegistry.abort(agentMessageId)).toBe(true)

      await expect(processing).resolves.toEqual({ success: true, aborted: true })
      expect(mockBackendGateway.reportAgentAbort).toHaveBeenCalledWith({
        channelId: 'channel-1',
        messageId: agentMessageId,
        userMessageId: 'user-message-1',
        agentId: 'agent-1',
        reason: 'user'
      })
      expect(mockAdapter.generateResponse).not.toHaveBeenCalled()
      expect(executionRegistry.has(agentMessageId)).toBe(false)
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
        },
        executionRegistry
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
        },
        executionRegistry
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
        },
        executionRegistry
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

      // 契约2：thinking 以类型化信封 { phase:'thinking', data:{ text } } 上报
      expect(mockBackendGateway.pushResponseChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'channel-1',
          messageId: 'msg-1',
          phase: 'thinking',
          data: expect.objectContaining({ text: 'test chunk' })
        })
      )

      // 验证重试逻辑被触发（第一次失败，第二次重试）
      const chunkCalls = (mockBackendGateway.pushResponseChunk as any).mock.calls.filter(
        (call: any) => call[0].phase === 'thinking' && call[0].data?.text === 'test chunk'
      )
      expect(chunkCalls.length).toBe(2) // 第一次失败，第二次重试
    })

    it('处理成功后落库并携带执行元数据（性能指标在落库时收口）', async () => {
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

      // 处理成功
      expect(result.success).toBe(true)

      // 契约 L4：响应落库时携带顶层 execution 执行元数据（处理耗时等指标在此收口）。
      // 注：DeviceProcessor 不再以 chunk 形式单独上报 metrics；性能数据随 execution 一并持久化。
      expect(mockBackendGateway.saveAgentResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'channel-1',
          messageId: 'msg-1',
          execution: expect.objectContaining({
            executionMode: expect.any(String),
          }),
        })
      )
    })
  })
})
