/**
 * Message Orchestrator Factory
 *
 * 创建 MessageOrchestrator 实例并集成存储层
 */

import { PrismaClient } from '@prisma/client'
import { MessageOrchestrator } from './message-orchestrator'
import { DeviceProcessor } from './device-processor'
import { SqliteMessageQueue } from '../../infrastructure/storage/sqlite-message-queue'
import { SqliteTaskStore } from '../../infrastructure/storage/sqlite-task-store'
import type { MessageOrchestratorConfig } from './message-orchestrator'
import type { DeviceConnectionManager } from '../../infrastructure/websocket/device-connection-manager'
import type { IMessageRepository } from '../../application/interfaces/repositories/message.repository.interface'

/**
 * 创建 MessageOrchestrator 实例
 */
export function createMessageOrchestrator(
  prisma: PrismaClient,
  deviceConnectionManager: DeviceConnectionManager,
  messageRepository: IMessageRepository,
  config?: MessageOrchestratorConfig
): MessageOrchestrator {
  // 创建存储层
  const messageQueue = new SqliteMessageQueue(prisma)
  const taskStore = new SqliteTaskStore(prisma)

  // 创建 Device 处理器（所有消息都通过 Device 处理）
  const deviceProcessor = new DeviceProcessor({
    deviceConnectionManager,
    messageRepository
  })

  // 创建 MessageOrchestrator（只使用 Device 模式）
  return new MessageOrchestrator(
    deviceProcessor,
    messageQueue,
    taskStore,
    config
  )
}
