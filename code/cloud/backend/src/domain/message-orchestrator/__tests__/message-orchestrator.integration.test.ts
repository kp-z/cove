/**
 * Message Orchestrator Integration Tests
 *
 * 测试 MessageOrchestrator 与存储层的集成
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createMessageOrchestrator } from '../message-orchestrator.factory'
import { FeatureFlagService } from '../../feature-flag/feature-flag.service'
import { SqliteFeatureFlagStore } from '../../../infrastructure/storage/sqlite-feature-flag-store'

describe('MessageOrchestrator Integration', () => {
  let prisma: PrismaClient
  let featureFlagService: FeatureFlagService

  beforeEach(async () => {
    prisma = new PrismaClient()

    // 清空测试数据
    await prisma.messageTask.deleteMany()
    await prisma.featureFlagConfig.deleteMany()

    // 创建 Feature Flag 服务
    const featureFlagStore = new SqliteFeatureFlagStore(prisma)
    featureFlagService = new FeatureFlagService(featureFlagStore)
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  describe('Backend Mode (Default)', () => {
    it('should process message in backend mode', async () => {
      const orchestrator = createMessageOrchestrator(prisma)

      // Enqueue message
      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'realm-1:channel-1',
        content: 'Hello'
      })

      expect(taskId).toBeDefined()

      // Get task
      const task = await orchestrator.getTask(taskId)
      expect(task).toBeDefined()
      expect(task!.executionMode).toBe('backend')
      expect(task!.state).toBe('PENDING')

      // Process message
      const processed = await orchestrator.processNext()
      expect(processed).toBe(true)

      // Verify task completed
      const completedTask = await orchestrator.getTask(taskId)
      expect(completedTask!.state).toBe('COMPLETED')
    })

    it('should handle multiple messages', async () => {
      const orchestrator = createMessageOrchestrator(prisma)

      // Enqueue multiple messages
      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'realm-1:channel-1',
        content: 'Hello'
      })
      await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'realm-1:channel-1',
        content: 'World'
      })

      // Process all messages
      await orchestrator.processNext()
      await orchestrator.processNext()

      // Verify no more messages
      const hasMore = await orchestrator.processNext()
      expect(hasMore).toBe(false)
    })
  })

  describe('Device Mode (100% Rollout)', () => {
    it('should process message in device mode', async () => {
      // Enable device mode
      await featureFlagService.enable('realm-1')
      await featureFlagService.setMode('realm-1', 'device')
      await featureFlagService.setRolloutPercentage('realm-1', 100)

      const orchestrator = createMessageOrchestrator(prisma)

      // Enqueue message
      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'realm-1:channel-1',
        content: 'Hello'
      })

      // Get task
      const task = await orchestrator.getTask(taskId)
      expect(task!.executionMode).toBe('device')

      // Process message
      await orchestrator.processNext()

      // Verify task completed
      const completedTask = await orchestrator.getTask(taskId)
      expect(completedTask!.state).toBe('COMPLETED')
    })
  })

  describe('Priority Queue', () => {
    it('should process high priority messages first', async () => {
      const orchestrator = createMessageOrchestrator(prisma)

      // Enqueue messages with different priorities
      await orchestrator.enqueue({
        messageId: 'msg-low',
        channelId: 'realm-1:channel-1',
        content: 'Low priority',
        priority: 0
      })
      await orchestrator.enqueue({
        messageId: 'msg-high',
        channelId: 'realm-1:channel-1',
        content: 'High priority',
        priority: 10
      })

      // Process first message (should be high priority)
      await orchestrator.processNext()

      // Verify high priority message was processed
      const pending = await orchestrator.getPendingTasks()
      expect(pending).toHaveLength(1)
      expect(pending[0].messageId).toBe('msg-low')
    })
  })

  describe('Persistence', () => {
    it('should persist tasks across orchestrator instances', async () => {
      // Create first orchestrator and enqueue message
      const orchestrator1 = createMessageOrchestrator(prisma)
      const taskId = await orchestrator1.enqueue({
        messageId: 'msg-1',
        channelId: 'realm-1:channel-1',
        content: 'Hello'
      })

      // Create second orchestrator and retrieve task
      const orchestrator2 = createMessageOrchestrator(prisma)
      const task = await orchestrator2.getTask(taskId)

      expect(task).toBeDefined()
      expect(task!.messageId).toBe('msg-1')
    })
  })
})
