/**
 * Message Orchestrator Factory
 *
 * 创建 MessageOrchestrator 实例并集成存储层
 */

import { PrismaClient } from '@prisma/client'
import { MessageOrchestrator } from './message-orchestrator'
import { BackendProcessor } from './backend-processor'
import { DeviceProcessor } from './device-processor'
import { SqliteMessageQueue } from '../../infrastructure/storage/sqlite-message-queue'
import { SqliteTaskStore } from '../../infrastructure/storage/sqlite-task-store'
import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'
import type { MessageOrchestratorConfig } from './message-orchestrator'

/**
 * 创建 MessageOrchestrator 实例
 */
export function createMessageOrchestrator(
  prisma: PrismaClient,
  backendGateway: BackendGateway,
  config?: MessageOrchestratorConfig
): MessageOrchestrator {
  // 创建存储层
  const messageQueue = new SqliteMessageQueue(prisma)
  const taskStore = new SqliteTaskStore(prisma)

  // 创建处理器
  const backendProcessor = new BackendProcessor()
  const deviceProcessor = new DeviceProcessor()

  // 创建 MessageOrchestrator
  return new MessageOrchestrator(
    backendGateway,
    backendProcessor,
    deviceProcessor,
    messageQueue,
    taskStore,
    config
  )
}
