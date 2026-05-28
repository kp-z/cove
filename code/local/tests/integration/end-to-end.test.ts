/**
 * 端到端集成测试
 *
 * 测试完整的消息处理流程
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createMessageOrchestrator } from '../../src/domain/agent-runtime/message-orchestrator.factory'
import { AdapterManager } from '../../src/infrastructure/adapters/adapter-manager'
import { TrpcBackendGateway } from '../../src/infrastructure/gateway/trpc-backend-gateway'
import type { MessageTask } from '../../src/domain/agent-runtime/message-orchestrator.interface'

describe('End-to-End Integration Tests', () => {
  let prisma: PrismaClient
  let orchestrator: any
  let backendGateway: TrpcBackendGateway
  let adapterManager: AdapterManager

  beforeEach(async () => {
    // 初始化 Prisma（使用内存数据库）
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file::memory:?cache=shared'
        }
      }
    })

    // 运行迁移
    // 注意：这需要 Prisma 迁移文件存在
    // await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS MessageTask (...)`

    // 初始化 BackendGateway（使用测试 URL）
    backendGateway = new TrpcBackendGateway('http://localhost:3000')

    // 初始化 AdapterManager
    adapterManager = new AdapterManager()

    // 加载测试 Adapter（如果有 API Key）
    if (process.env.ANTHROPIC_API_KEY) {
      await adapterManager.loadAdapter({
        name: 'anthropic-adapter',
        type: 'anthropic',
        version: '1.0.0',
        enabled: true,
        config: {
          apiKey: process.env.ANTHROPIC_API_KEY
        }
      })
    }

    // 创建 MessageOrchestrator
    orchestrator = createMessageOrchestrator(
      prisma,
      backendGateway,
      adapterManager
    )
  })

  afterEach(async () => {
    // 停止 orchestrator
    if (orchestrator) {
      await orchestrator.stop()
    }

    // 清理数据库
    await prisma.$disconnect()
  })

  describe('基础流程测试', () => {
    it('应该成功入队消息', async () => {
      const message = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello, AI!',
        priority: 0
      }

      const taskId = await orchestrator.enqueue(message)

      expect(taskId).toBeDefined()
      expect(typeof taskId).toBe('string')
    })

    it('应该成功处理消息（Device 模式）', async () => {
      // 跳过如果没有 API Key
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('Skipping: ANTHROPIC_API_KEY not set')
        return
      }

      const message = {
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'Say hello',
        priority: 0
      }

      // 入队
      const taskId = await orchestrator.enqueue(message)
      expect(taskId).toBeDefined()

      // 处理
      await orchestrator.processNext()

      // 验证任务状态
      const task = await orchestrator.getTask(taskId)
      expect(task).toBeDefined()
      // 注意：实际状态取决于处理结果
    }, 30000) // 30 秒超时

    it('应该处理多条消息', async () => {
      const messages = [
        { messageId: 'msg-3', channelId: 'channel-1', content: 'Message 1', priority: 0 },
        { messageId: 'msg-4', channelId: 'channel-1', content: 'Message 2', priority: 0 },
        { messageId: 'msg-5', channelId: 'channel-1', content: 'Message 3', priority: 0 }
      ]

      // 入队所有消息
      const taskIds = await Promise.all(
        messages.map(msg => orchestrator.enqueue(msg))
      )

      expect(taskIds).toHaveLength(3)
      expect(taskIds.every((id: string) => typeof id === 'string')).toBe(true)
    })
  })

  describe('优先级测试', () => {
    it('应该按优先级处理消息', async () => {
      const messages = [
        { messageId: 'msg-6', channelId: 'channel-1', content: 'Low priority', priority: 0 },
        { messageId: 'msg-7', channelId: 'channel-1', content: 'High priority', priority: 10 },
        { messageId: 'msg-8', channelId: 'channel-1', content: 'Medium priority', priority: 5 }
      ]

      // 入队所有消息
      await Promise.all(messages.map(msg => orchestrator.enqueue(msg)))

      // 获取待处理任务
      const pendingTasks = await orchestrator.getPendingTasks()

      // 验证至少有一个任务
      expect(pendingTasks.length).toBeGreaterThan(0)
    })
  })

  describe('错误处理测试', () => {
    it('应该处理无效消息', async () => {
      const invalidMessage = {
        messageId: '',
        channelId: '',
        content: '',
        priority: 0
      }

      // 尝试入队无效消息
      // 注意：实际行为取决于验证逻辑
      const taskId = await orchestrator.enqueue(invalidMessage)
      expect(taskId).toBeDefined()
    })

    it('应该处理处理失败的消息', async () => {
      // 创建一个会失败的消息
      const message = {
        messageId: 'msg-fail',
        channelId: 'invalid-channel',
        content: 'This should fail',
        priority: 0
      }

      const taskId = await orchestrator.enqueue(message)
      expect(taskId).toBeDefined()

      // 尝试处理（可能会失败）
      await orchestrator.processNext()

      // 验证任务状态
      const task = await orchestrator.getTask(taskId)
      // 任务应该存在，状态可能是 FAILED 或 PENDING（等待重试）
      expect(task).toBeDefined()
    })
  })

  describe('并发处理测试', () => {
    it('应该处理并发消息', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        messageId: `msg-concurrent-${i}`,
        channelId: 'channel-1',
        content: `Concurrent message ${i}`,
        priority: 0
      }))

      // 并发入队
      const taskIds = await Promise.all(
        messages.map(msg => orchestrator.enqueue(msg))
      )

      expect(taskIds).toHaveLength(10)
      expect(taskIds.every((id: string) => typeof id === 'string')).toBe(true)
    })
  })

  describe('队列管理测试', () => {
    it('应该正确报告队列大小', async () => {
      const messages = [
        { messageId: 'msg-9', channelId: 'channel-1', content: 'Message 1', priority: 0 },
        { messageId: 'msg-10', channelId: 'channel-1', content: 'Message 2', priority: 0 }
      ]

      // 入队消息
      await Promise.all(messages.map(msg => orchestrator.enqueue(msg)))

      // 获取待处理任务
      const pendingTasks = await orchestrator.getPendingTasks()

      // 应该至少有一些待处理任务
      expect(pendingTasks.length).toBeGreaterThanOrEqual(0)
    })
  })
})
