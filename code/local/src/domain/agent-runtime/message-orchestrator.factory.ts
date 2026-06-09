/**
 * Message Orchestrator Factory
 *
 * 创建 MessageOrchestrator 实例并集成存储层
 */

import { PrismaClient } from '../../../generated/client'
import { MessageOrchestrator } from './message-orchestrator'
import { DeviceProcessor } from './device-processor'
import { SqliteMessageQueue } from '../../infrastructure/storage/sqlite-message-queue'
import { SqliteTaskStore } from '../../infrastructure/storage/sqlite-task-store'
import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'
import type { IAdapterManager } from '../../infrastructure/adapters/adapter-manager.interface'
import type { MessageOrchestratorConfig } from './message-orchestrator'

/**
 * 创建 MessageOrchestrator 实例
 *
 * 仅创建本地 DeviceProcessor（单一 Device 执行模式）。
 */
export function createMessageOrchestrator(
  prisma: PrismaClient,
  backendGateway: BackendGateway,
  adapterManager: IAdapterManager,
  config?: MessageOrchestratorConfig
): MessageOrchestrator {
  // 创建存储层
  const messageQueue = new SqliteMessageQueue(prisma)
  const taskStore = new SqliteTaskStore(prisma)

  // 创建本地处理器（注入依赖）
  const deviceProcessor = new DeviceProcessor(backendGateway, adapterManager)

  // 创建 MessageOrchestrator
  return new MessageOrchestrator(
    deviceProcessor,
    messageQueue,
    taskStore,
    config
  )
}
