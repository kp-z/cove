/**
 * Agent Execution Metadata Integration Test
 *
 * 测试完整的元数据收集流程：Adapter → Collector → Transmission → Backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExecutionMetadataCollector } from '../execution-metadata/collector'
import { MetadataCollectorFactory } from '../execution-metadata/collector-factory'
import { ResilientTransmissionStrategy } from '../execution-metadata/transmission-strategy'
import type { BackendGateway } from '../../../infrastructure/gateway/backend-gateway.interface'
import type { MessageTask } from '../message-orchestrator.interface'

describe('Agent Execution Metadata - Integration Test', () => {
  let mockBackendGateway: BackendGateway
  let factory: MetadataCollectorFactory
  let transmissionStrategy: ResilientTransmissionStrategy

  beforeEach(() => {
    mockBackendGateway = {
      getMessageHistory: vi.fn(),
      saveAgentResponse: vi.fn().mockResolvedValue(undefined),
      pushResponseChunk: vi.fn().mockResolvedValue(undefined),
      getExecutionMode: vi.fn(),
      isFeatureFlagEnabled: vi.fn(),
      getAllFeatureFlags: vi.fn(),
      getRealmConfiguration: vi.fn(),
      reportHealth: vi.fn(),
      healthCheck: vi.fn()
    } as any

    factory = new MetadataCollectorFactory({
      enablePooling: true,
      maxPoolSize: 5
    })

    transmissionStrategy = new ResilientTransmissionStrategy(mockBackendGateway, {
      enableRetry: true,
      maxRetries: 3
    })
  })

  describe('Streaming Mode Workflow', () => {
    it('应该完整收集流式模式的元数据', async () => {
      // 1. 创建 Collector
      const collector = factory.create('anthropic-adapter', 'streaming')

      // 2. 模拟流式回调
      collector.recordThinking('Let me think about this...')
      collector.recordThinking(' ')
      collector.recordThinking('I should use a tool.')

      collector.recordToolUse({
        id: 'tool-1',
        toolName: 'file_reader',
        action: 'read',
        status: 'success',
        duration: 150,
        result: {
          success: 'File read successfully',
          output: 'file content here'
        }
      })

      collector.recordUsage({
        inputTokens: 200,
        outputTokens: 350,
        totalTokens: 550,
        cache: {
          creationTokens: 0,
          readTokens: 100,
          hitRate: 0.5
        },
        cost: {
          inputCost: 0.006,
          outputCost: 0.0105,
          cacheCost: 0.001,
          totalCost: 0.0175
        },
        model: 'claude-3-5-sonnet-20241022',
        latency: {
          totalMs: 2500,
          tokensPerSecond: 140
        }
      })

      collector.recordStatus('thinking')
      collector.recordStatus('tool_use')
      collector.recordStatus('responding')
      collector.recordStatus('completed')

      // 3. 构建元数据
      const metadata = await collector.build()

      // 4. 验证元数据结构
      expect(metadata.thinking?.content).toBe('Let me think about this... I should use a tool.')
      expect(metadata.thinking?.chunks).toBe(3)
      expect(metadata.toolUses).toHaveLength(1)
      expect(metadata.toolUses[0].toolName).toBe('file_reader')
      expect(metadata.usage?.totalTokens).toBe(550)
      expect(metadata.usage?.cost?.totalCost).toBe(0.0175)
      expect(metadata.statusHistory).toHaveLength(4)
      expect(metadata.executionMode).toBe('streaming')
      expect(metadata.adapter).toBe('anthropic-adapter')

      // 5. 模拟保存到 Backend
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

      // 准备最终化并保存
      await transmissionStrategy.prepareFinalization(task)
      await mockBackendGateway.saveAgentResponse({
        channelId: task.channelId,
        messageId: task.messageId,
        content: 'Final response content',
        metadata: {
          execution: metadata
        }
      })

      // 6. 验证 Backend 调用
      expect(mockBackendGateway.saveAgentResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'channel-1',
          messageId: 'msg-1',
          content: expect.any(String),  // 应该有 content
          metadata: expect.objectContaining({
            execution: metadata
          })
        })
      )

      // 7. 释放 Collector
      factory.release(collector)
      expect(factory.getStats().poolSize).toBe(1)
    })
  })

  describe('Batch Mode Workflow', () => {
    it('应该完整处理批量模式的元数据', async () => {
      // 1. 创建 Collector（批量模式）
      const collector = factory.create('claude-cli', 'batch')

      // 2. 批量设置元数据
      collector.setCompleteThinking('Complete thinking in one shot')

      collector.recordUsage({
        inputTokens: 150,
        outputTokens: 280,
        totalTokens: 430,
        cache: {
          creationTokens: 50,
          readTokens: 80,
          hitRate: 0.53
        },
        cost: {
          inputCost: 0,
          outputCost: 0,
          cacheCost: 0,
          totalCost: 0.0215
        },
        model: 'opus',
        latency: {
          firstTokenMs: 567,
          totalMs: 1850,
          tokensPerSecond: 151
        }
      })

      collector.recordStatus('thinking')
      collector.recordStatus('completed')

      // 3. 构建元数据
      const metadata = await collector.build()

      // 4. 验证批量模式特性
      expect(metadata.thinking?.content).toBe('Complete thinking in one shot')
      expect(metadata.thinking?.chunks).toBe(1)
      expect(metadata.toolUses).toHaveLength(0)
      expect(metadata.executionMode).toBe('batch')
      expect(metadata.adapter).toBe('claude-cli')
      expect(metadata.usage?.cache?.hitRate).toBe(0.53)

      // 5. 释放
      factory.release(collector)
    })
  })

  describe('Error Resilience', () => {
    it('应该在传输失败时继续收集元数据', async () => {
      // Mock 传输失败
      mockBackendGateway.pushResponseChunk = vi.fn().mockRejectedValue(new Error('Network error'))

      const collector = factory.create('test-adapter', 'streaming')
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 传输失败，但不抛出异常
      await transmissionStrategy.transmitThinking(task, 'test chunk')

      // 元数据仍然被收集
      collector.recordThinking('test chunk')
      const metadata = await collector.build()

      expect(metadata.thinking?.content).toBe('test chunk')

      // 获取失败统计
      const stats = transmissionStrategy.getFailureStats('msg-1')
      expect(stats.totalFailures).toBeGreaterThan(0)
    })
  })

  describe('Object Pooling Performance', () => {
    it('应该复用 Collector 实例', () => {
      const collector1 = factory.create('adapter-1', 'streaming')
      const collector2 = factory.create('adapter-2', 'streaming')
      const collector3 = factory.create('adapter-3', 'streaming')

      // 释放所有
      factory.release(collector1)
      factory.release(collector2)
      factory.release(collector3)

      // 应该都在池中
      expect(factory.getStats().poolSize).toBe(3)

      // 获取新的应该复用
      const collector4 = factory.create('adapter-4', 'streaming')
      expect(collector4).toBe(collector3) // 复用最后一个

      expect(factory.getStats().poolSize).toBe(2)
    })
  })

  describe('Complete End-to-End Simulation', () => {
    it('应该模拟完整的 DeviceProcessor 流程', async () => {
      const collector = factory.create('anthropic-adapter', 'streaming')

      // 模拟完整执行流程
      const task: MessageTask = {
        id: 'task-1',
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Explain quantum computing',
        state: 'PENDING',
        executionMode: 'device',
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 1. Thinking 阶段
      collector.recordStatus('thinking')
      await transmissionStrategy.transmitStatus(task, 'thinking')

      collector.recordThinking('Quantum computing is complex.')
      await transmissionStrategy.transmitThinking(task, 'Quantum computing is complex.')

      // 2. Tool use 阶段
      collector.recordStatus('tool_use')
      const toolLog = {
        id: 'tool-1',
        toolName: 'search',
        action: 'query',
        status: 'success' as const,
        duration: 234
      }
      collector.recordToolUse(toolLog)
      await transmissionStrategy.transmitToolUse(task, toolLog)

      // 3. Responding 阶段
      collector.recordStatus('responding')
      await transmissionStrategy.transmitStatus(task, 'responding')

      // 4. 完成阶段
      collector.recordStatus('completed')
      const usage = {
        inputTokens: 300,
        outputTokens: 500,
        totalTokens: 800,
        cost: {
          inputCost: 0.009,
          outputCost: 0.015,
          cacheCost: 0,
          totalCost: 0.024
        }
      }
      collector.recordUsage(usage)
      await transmissionStrategy.transmitUsage(task, usage)

      // 5. 构建并保存最终元数据
      const metadata = await collector.build()

      // 准备最终化（模拟 DeviceProcessor.saveResponse）
      await transmissionStrategy.prepareFinalization(task)

      // 模拟实际保存（由 DeviceProcessor.saveResponse 完成）
      await mockBackendGateway.saveAgentResponse({
        channelId: task.channelId,
        messageId: task.messageId,
        content: 'Final response content',
        metadata: {
          execution: metadata
        }
      })

      // 6. 验证完整性
      expect(metadata.thinking).toBeDefined()
      expect(metadata.toolUses).toHaveLength(1)
      expect(metadata.usage).toBeDefined()
      expect(metadata.statusHistory).toHaveLength(4)
      expect(mockBackendGateway.saveAgentResponse).toHaveBeenCalled()

      // 7. 清理
      factory.release(collector)
    })
  })
})
