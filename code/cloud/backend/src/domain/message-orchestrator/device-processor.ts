/**
 * Device Processor
 *
 * Device 模式处理器：通过 WebSocket 推送消息到 Local Device 处理
 */

import type { IMessageProcessor, ProcessResult } from './message-processor.interface'
import type { MessageTask } from './message-orchestrator.interface'
import type { IMessageRepository } from '../../application/interfaces/repositories/message.repository.interface'
import type { DeviceConnectionManager } from '../../infrastructure/websocket/device-connection-manager'

/**
 * Device 处理器配置
 */
export interface DeviceProcessorConfig {
  timeout?: number
  pollInterval?: number
}

/**
 * Device 处理器依赖
 */
export interface DeviceProcessorDependencies {
  deviceConnectionManager: DeviceConnectionManager
  messageRepository: IMessageRepository
}

/**
 * Device 模式处理器
 */
export class DeviceProcessor implements IMessageProcessor {
  private readonly timeout: number
  private readonly pollInterval: number
  private readonly pendingTasks = new Map<string, {
    resolve: (result: ProcessResult) => void
    reject: (error: Error) => void
    timeoutId: NodeJS.Timeout
  }>()

  constructor(
    private readonly dependencies: DeviceProcessorDependencies,
    config: DeviceProcessorConfig = {}
  ) {
    // 根因修复：此处的「等待 Device 响应」仅是一层兜底轮询（数据库对账），
    // 真正的完成/失败信号由 Local 通过 tRPC 直接上报（message.router 的
    // saveResponse / reportFailure），并独立驱动前端的 agent.response.* 事件。
    // 旧默认值 60s 远小于真实 CLI Agent 任务（thinking/tool 多轮）的常见耗时，
    // 一旦超时就会触发 handleFailure 重新入队 → 再次向同一 Device 推送
    // message.process，导致同一条用户消息被并发/重复处理（重复计费、
    // 流式事件交叉污染），而前端却因为独立的 tRPC 事件链路完全无感知。
    // 因此把它调大为一个「设备彻底失联」才会触发的超长兜底值，正常任务
    // 无论跑多久都不会被这层轮询误判为失败。
    this.timeout = config.timeout ?? 30 * 60 * 1000 // 30 分钟兜底超时（非正常完成信号）
    this.pollInterval = config.pollInterval ?? 1000 // 1 秒轮询间隔
  }

  /**
   * 处理消息任务
   */
  async process(task: MessageTask): Promise<ProcessResult> {
    try {
      // 1. 查找可用的 Device（基于 realmId）
      const deviceId = await this.findAvailableDevice(task.realmId)
      if (!deviceId) {
        return {
          success: false,
          error: 'No available device found for this realm'
        }
      }

      // 2. 推送消息到 Device
      const sent = await this.sendToDevice(deviceId, task)
      if (!sent) {
        return {
          success: false,
          error: `Failed to send message to device: ${deviceId}`
        }
      }

      // 3. 等待 Device 处理完成
      const result = await this.waitForDeviceResponse(task.messageId)

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 查找可用的 Device
   */
  private async findAvailableDevice(realmId: string): Promise<string | null> {
    const onlineDevices = this.dependencies.deviceConnectionManager.getOnlineDevices()

    // 简单策略：返回第一个在线的 Device
    // TODO: 实现更智能的设备选择策略（负载均衡、设备能力匹配等）
    for (const deviceId of onlineDevices) {
      const connection = this.dependencies.deviceConnectionManager.getConnection(deviceId)
      if (connection && connection.metadata?.realmId === realmId) {
        return deviceId
      }
    }

    // 如果没有找到匹配的 Device，返回第一个在线的
    return onlineDevices.length > 0 ? (onlineDevices[0] ?? null) : null
  }

  /**
   * 发送消息到 Device
   */
  private async sendToDevice(deviceId: string, task: MessageTask): Promise<boolean> {
    return await this.dependencies.deviceConnectionManager.sendToDevice(deviceId, {
      type: 'message.process',
      payload: {
        messageId: task.messageId,
        channelId: task.channelId,
        content: task.content,
        realmId: task.realmId,
        metadata: task.metadata
      }
    })
  }

  /**
   * 等待 Device 响应
   */
  private async waitForDeviceResponse(messageId: string): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.pendingTasks.delete(messageId)
        reject(new Error(`Device response timeout after ${this.timeout}ms`))
      }, this.timeout)

      // 保存 Promise 回调
      this.pendingTasks.set(messageId, {
        resolve,
        reject,
        timeoutId
      })

      // 启动轮询检查响应
      this.startPolling(messageId)
    })
  }

  /**
   * 启动轮询检查响应
   */
  private startPolling(messageId: string): void {
    const pollInterval = setInterval(async () => {
      const task = this.pendingTasks.get(messageId)
      if (!task) {
        clearInterval(pollInterval)
        return
      }

      // 检查数据库中是否有响应
      // TODO: 实现更高效的响应通知机制（WebSocket 回调）
      const hasResponse = await this.checkResponseInDatabase(messageId)
      if (hasResponse) {
        clearInterval(pollInterval)
        clearTimeout(task.timeoutId)
        this.pendingTasks.delete(messageId)
        task.resolve({ success: true })
      }
    }, this.pollInterval)
  }

  /**
   * 检查数据库中是否有响应
   */
  private async checkResponseInDatabase(messageId: string): Promise<boolean> {
    try {
      // 检查是否有 Agent 回复该用户消息
      // 使用 getPrismaClient 获取 Prisma 实例
      const { getPrismaClient } = await import('../../infrastructure/database/prisma-client');
      const prisma = getPrismaClient();

      // 1. 获取用户消息
      const userMessage = await prisma.message.findUnique({
        where: { id: messageId }
      });

      if (!userMessage) {
        return false;
      }

      // 2. 查找该消息之后的 Agent 回复（同一 channel，senderType = 'agent'）
      const agentResponse = await prisma.message.findFirst({
        where: {
          channelId: userMessage.channelId,
          senderType: 'agent',
          createdAt: { gte: userMessage.createdAt }
        },
        orderBy: { createdAt: 'asc' }
      });

      return !!agentResponse;
    } catch (error) {
      console.warn('Failed to check response in database:', error)
      return false
    }
  }

  /**
   * 处理 Device 响应（由外部调用）
   */
  handleDeviceResponse(messageId: string, result: ProcessResult): void {
    const task = this.pendingTasks.get(messageId)
    if (task) {
      clearTimeout(task.timeoutId)
      this.pendingTasks.delete(messageId)
      task.resolve(result)
    }
  }

  /**
   * 将用户中止作为成功终态解析，避免编排器触发失败重试。
   */
  notifyAborted(userMessageId: string): void {
    this.handleDeviceResponse(userMessageId, { success: true, aborted: true })
  }

  /**
   * 清理资源
   */
  destroy(): void {
    for (const [_messageId, task] of this.pendingTasks.entries()) {
      clearTimeout(task.timeoutId)
      task.reject(new Error('Device processor destroyed'))
    }
    this.pendingTasks.clear()
  }
}
