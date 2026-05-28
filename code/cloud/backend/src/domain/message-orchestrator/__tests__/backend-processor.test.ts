/**
 * Backend Processor Tests
 *
 * 测试 Backend 模式处理器
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BackendProcessor } from '../backend-processor'
import type { MessageTask } from '../message-orchestrator.interface'
import type { IMessageRepository } from '../../../application/interfaces/repositories/message.repository.interface'
import type { LlmAdapter } from '../../../infrastructure/adapters/llm/llm-adapter.interface'

describe('BackendProcessor', () => {
  let processor: BackendProcessor
  let mockMessageRepository: IMessageRepository
  let mockLlmAdapter: LlmAdapter

  const createMockTask = (): MessageTask => ({
    id: 'task-1',
    messageId: 'msg-1',
    channelId: 'channel-1',
    content: 'Hello',
    realmId: 'realm-1',
    state: 'PROCESSING',
    executionMode: 'backend',
    attempts: 1,
    maxAttempts: 3,
    priority: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  beforeEach(() => {
    // Mock MessageRepository
    mockMessageRepository = {
      findByChannel: vi.fn().mockResolvedValue([
        {
          id: 'msg-0',
          channelId: 'channel-1',
          senderId: 'user-1',
          content: 'Previous message',
          createdAt: new Date()
        }
      ]),
      save: vi.fn().mockResolvedValue(undefined)
    } as any

    // Mock LlmAdapter
    mockLlmAdapter = {
      generateResponse: vi.fn().mockResolvedValue('Hello! How can I help you?')
    }

    processor = new BackendProcessor(
      {
        messageRepository: mockMessageRepository,
        llmAdapter: mockLlmAdapter
      },
      {
        timeout: 5000,
        systemPrompt: 'You are a test assistant.'
      }
    )
  })

  describe('process', () => {
    it('should process message successfully', async () => {
      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockMessageRepository.findByChannel).toHaveBeenCalledWith('channel-1', 50)
      expect(mockLlmAdapter.generateResponse).toHaveBeenCalled()
      expect(mockMessageRepository.save).toHaveBeenCalled()
    })

    it('should handle empty message history', async () => {
      mockMessageRepository.findByChannel = vi.fn().mockResolvedValue([])

      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(true)
      expect(mockLlmAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      )
    })

    it('should handle LLM adapter error', async () => {
      mockLlmAdapter.generateResponse = vi.fn().mockRejectedValue(new Error('API error'))

      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('API error')
    })

    it('should handle message repository error gracefully', async () => {
      mockMessageRepository.findByChannel = vi.fn().mockRejectedValue(new Error('DB error'))

      const task = createMockTask()

      // Should still process with empty history
      const result = await processor.process(task)

      expect(result.success).toBe(true)
      expect(mockLlmAdapter.generateResponse).toHaveBeenCalled()
    })

    it('should handle save response error', async () => {
      mockMessageRepository.save = vi.fn().mockRejectedValue(new Error('Save error'))

      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Save error')
    })

    it('should handle timeout', async () => {
      mockLlmAdapter.generateResponse = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('Response'), 10000))
      )

      const shortTimeoutProcessor = new BackendProcessor(
        {
          messageRepository: mockMessageRepository,
          llmAdapter: mockLlmAdapter
        },
        {
          timeout: 100
        }
      )

      const task = createMockTask()

      const result = await shortTimeoutProcessor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('should pass system prompt to LLM adapter', async () => {
      const task = createMockTask()

      await processor.process(task)

      expect(mockLlmAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: 'You are a test assistant.'
        })
      )
    })

    it('should convert message history to chat format', async () => {
      mockMessageRepository.findByChannel = vi.fn().mockResolvedValue([
        {
          id: 'msg-1',
          channelId: 'channel-1',
          senderId: 'user-1',
          content: 'Hello',
          createdAt: new Date()
        },
        {
          id: 'msg-2',
          channelId: 'channel-1',
          senderId: 'system',
          content: 'Hi there!',
          createdAt: new Date()
        }
      ])

      const task = createMockTask()

      await processor.process(task)

      expect(mockLlmAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'Hello' }
          ]
        })
      )
    })

    it('should support streaming callbacks', async () => {
      mockLlmAdapter.generateResponse = vi.fn().mockImplementation(async (params) => {
        if (params.streaming?.onThinking) {
          await params.streaming.onThinking('Thinking...')
        }
        return 'Response'
      })

      const task = createMockTask()

      await processor.process(task)

      expect(mockLlmAdapter.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          streaming: expect.objectContaining({
            onThinking: expect.any(Function)
          })
        })
      )
    })

    it('should limit message history to 50 messages', async () => {
      const task = createMockTask()

      await processor.process(task)

      expect(mockMessageRepository.findByChannel).toHaveBeenCalledWith('channel-1', 50)
    })
  })
})
