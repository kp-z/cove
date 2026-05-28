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
    this.timeout = config.timeout ?? 60000 // 60 秒超时
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
    return onlineDevices.length > 0 ? onlineDevices[0] : null
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
      // 简单实现：检查是否有对应的响应消息
      // TODO: 实现更精确的响应检查逻辑
      return false // 占位符
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
   * 清理资源
   */
  destroy(): void {
    for (const [messageId, task] of this.pendingTasks.entries()) {
      clearTimeout(task.timeoutId)
      task.reject(new Error('Device processor destroyed'))
    }
    this.pendingTasks.clear()
  }
}
