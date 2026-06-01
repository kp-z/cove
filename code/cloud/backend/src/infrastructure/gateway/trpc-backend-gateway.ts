/**
 * tRPC Backend Gateway Implementation
 *
 * 防腐层：将 tRPC 调用封装为统一的 BackendGateway 接口
 *
 * 职责：
 * - DTO ↔ Domain 转换
 * - 错误处理和重试
 * - 网络超时控制
 */

import type {
  IBackendGateway,
  RealmConfiguration,
  ConfigChange,
  Message,
  AgentResponse,
  DeviceHealth,
  AdapterRelease,
  AgentConfig,
  RealmSettings
} from './backend-gateway.interface'

/**
 * tRPC 客户端配置
 */
export interface TrpcClientConfig {
  baseUrl: string
  timeout?: number
  retryAttempts?: number
  retryDelayMs?: number
}

/**
 * tRPC DTO 类型（从 Backend API 返回的数据结构）
 */
interface RealmConfigDto {
  id: string
  version: number
  checksum: string
  agents: AgentDto[]
  settings: RealmSettingsDto
  updatedAt: string
}

interface AgentDto {
  id: string
  name: string
  description: string
  systemPrompt: string
  adapterId: string
  adapterVersion: string
  enabled: boolean
  priority: number
}

interface RealmSettingsDto {
  maxConcurrentAgents: number
  messageTimeout: number
  retryPolicy: {
    maxRetries: number
    backoffMs: number
    maxBackoffMs: number
  }
}

interface MessageDto {
  id: string
  channelId: string
  role: string
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

/**
 * tRPC Backend Gateway
 *
 * 实现 IBackendGateway 接口，封装 tRPC 调用
 */
export class TrpcBackendGateway implements IBackendGateway {
  private config: Required<TrpcClientConfig>

  constructor(config: TrpcClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      timeout: config.timeout ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000
    }
  }

  // ==================== 配置管理 ====================

  async fetchRealmConfiguration(realmId: string): Promise<RealmConfiguration> {
    const dto = await this.callTrpc<RealmConfigDto>('realm.getConfiguration', { realmId })
    return this.mapRealmConfigFromDto(dto)
  }

  async getConfigVersion(realmId: string): Promise<number> {
    const result = await this.callTrpc<{ version: number }>('realm.getVersion', { realmId })
    return result.version
  }

  async getConfigChanges(realmId: string, fromVersion: number, toVersion: number): Promise<ConfigChange[]> {
    const dtos = await this.callTrpc<any[]>('realm.getConfigChanges', {
      realmId,
      fromVersion,
      toVersion
    })

    return dtos.map(dto => ({
      version: dto.version,
      timestamp: new Date(dto.timestamp),
      changes: dto.changes,
      checksum: dto.checksum
    }))
  }

  // ==================== 消息处理 ====================

  async fetchMessageHistory(channelId: string, limit?: number): Promise<Message[]> {
    const dtos = await this.callTrpc<MessageDto[]>('message.getHistory', {
      channelId,
      limit
    })

    return dtos.map(dto => this.mapMessageFromDto(dto))
  }

  async saveAgentResponse(response: AgentResponse): Promise<void> {
    await this.callTrpc('message.saveResponse', {
      messageId: response.messageId,
      channelId: response.channelId,
      agentId: response.agentId,
      content: response.content,
      metadata: response.metadata,
      timestamp: response.timestamp.toISOString()
    })
  }

  // ==================== 设备管理 ====================

  async reportHealth(health: DeviceHealth): Promise<void> {
    await this.callTrpc('device.reportHealth', {
      deviceId: health.deviceId,
      realmId: health.realmId,
      status: health.status,
      activeAgents: health.activeAgents,
      queueDepth: health.queueDepth,
      cpuUsage: health.cpuUsage,
      memoryUsage: health.memoryUsage,
      timestamp: health.timestamp.toISOString()
    })
  }

  // ==================== Adapter 管理 ====================

  async getAdapterUpdates(deviceId: string): Promise<AdapterRelease[]> {
    const dtos = await this.callTrpc<any[]>('adapter.getUpdates', { deviceId })

    return dtos.map(dto => ({
      adapterId: dto.adapterId,
      version: dto.version,
      minCompatibleVersion: dto.minCompatibleVersion,
      maxCompatibleVersion: dto.maxCompatibleVersion,
      breaking: dto.breaking,
      rolloutStrategy: dto.rolloutStrategy,
      canaryPercentage: dto.canaryPercentage,
      targetDevices: dto.targetDevices,
      downloadUrl: dto.downloadUrl,
      checksum: dto.checksum,
      changelog: dto.changelog,
      releasedAt: new Date(dto.releasedAt)
    }))
  }

  // ==================== 私有方法 ====================

  /**
   * 调用 tRPC 端点（带重试和超时）
   */
  private async callTrpc<T>(procedure: string, input?: any): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.executeTrpcCall<T>(procedure, input)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // 最后一次尝试，直接抛出错误
        if (attempt === this.config.retryAttempts) {
          break
        }

        // 指数退避
        const delay = Math.min(
          this.config.retryDelayMs * Math.pow(2, attempt - 1),
          10000
        )
        await this.sleep(delay)
      }
    }

    throw new Error(`tRPC call failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`)
  }

  /**
   * 执行单次 tRPC 调用
   */
  private async executeTrpcCall<T>(procedure: string, input?: any): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(`${this.config.baseUrl}/trpc/${procedure}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as { error?: { message?: string }, result?: { data?: T } }

      if (data.error) {
        throw new Error(data.error.message || 'tRPC error')
      }

      return data.result?.data as T
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * DTO → Domain 转换：Realm 配置
   */
  private mapRealmConfigFromDto(dto: RealmConfigDto): RealmConfiguration {
    return {
      realmId: dto.id,
      version: dto.version,
      checksum: dto.checksum,
      agents: dto.agents.map(a => this.mapAgentFromDto(a)),
      settings: this.mapSettingsFromDto(dto.settings),
      updatedAt: new Date(dto.updatedAt)
    }
  }

  /**
   * DTO → Domain 转换：Agent 配置
   */
  private mapAgentFromDto(dto: AgentDto): AgentConfig {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      systemPrompt: dto.systemPrompt,
      adapterId: dto.adapterId,
      adapterVersion: dto.adapterVersion,
      enabled: dto.enabled,
      priority: dto.priority
    }
  }

  /**
   * DTO → Domain 转换：Realm 设置
   */
  private mapSettingsFromDto(dto: RealmSettingsDto): RealmSettings {
    return {
      maxConcurrentAgents: dto.maxConcurrentAgents,
      messageTimeout: dto.messageTimeout,
      retryPolicy: dto.retryPolicy
    }
  }

  /**
   * DTO → Domain 转换：消息
   */
  private mapMessageFromDto(dto: MessageDto): Message {
    return {
      id: dto.id,
      channelId: dto.channelId,
      role: dto.role as 'user' | 'assistant' | 'system',
      content: dto.content,
      timestamp: new Date(dto.timestamp),
      metadata: dto.metadata
    }
  }

  /**
   * 延迟工具函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
