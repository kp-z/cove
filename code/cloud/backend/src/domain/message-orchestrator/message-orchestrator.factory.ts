/**
 * Message Orchestrator Factory
 *
 * 创建 MessageOrchestrator 实例并集成存储层
 */

import { PrismaClient } from '@prisma/client'
import { MessageOrchestrator } from './message-orchestrator'
import { BackendProcessor } from './backend-processor'
import { DeviceProcessor } from './device-processor'
import { ExecutionModeRouter } from '../execution-mode/execution-mode-router'
import { FeatureFlagService } from '../feature-flag/feature-flag.service'
import { SqliteMessageQueue } from '../../infrastructure/storage/sqlite-message-queue'
import { SqliteTaskStore } from '../../infrastructure/storage/sqlite-task-store'
import { SqliteFeatureFlagStore } from '../../infrastructure/storage/sqlite-feature-flag-store'
import type { MessageOrchestratorConfig } from './message-orchestrator'

/**
 * 创建 MessageOrchestrator 实例
 */
export function createMessageOrchestrator(
  prisma: PrismaClient,
  config?: MessageOrchestratorConfig
): MessageOrchestrator {
  // 创建存储层
  const messageQueue = new SqliteMessageQueue(prisma)
  const taskStore = new SqliteTaskStore(prisma)
  const featureFlagStore = new SqliteFeatureFlagStore(prisma)

  // 创建 Feature Flag 服务
  const featureFlagService = new FeatureFlagService(featureFlagStore)

  // 创建执行模式路由器
  const executionModeRouter = new ExecutionModeRouter(featureFlagService)

  // 创建处理器
  const backendProcessor = new BackendProcessor()
  const deviceProcessor = new DeviceProcessor()

  // 创建 MessageOrchestrator
  return new MessageOrchestrator(
    executionModeRouter,
    backendProcessor,
    deviceProcessor,
    messageQueue,
    taskStore,
    config
  )
}
