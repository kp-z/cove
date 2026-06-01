/**
 * Backend Gateway Interface
 *
 * 防腐层：隔离 Backend API 变更，统一接口
 *
 * 职责：
 * - 配置管理：获取 Realm 配置、版本信息、增量变更
 * - 消息处理：获取对话历史、保存 Agent 响应
 * - 设备管理：上报健康状态
 * - Adapter 管理：获取 Adapter 更新信息
 */

/**
 * Realm 配置
 */
export interface RealmConfiguration {
  realmId: string
  version: number
  checksum: string
  agents: AgentConfig[]
  settings: RealmSettings
  updatedAt: Date
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  id: string
  name: string
  description: string
  systemPrompt: string
  adapterId: string
  adapterVersion: string
  enabled: boolean
  priority: number
}

/**
 * Realm 设置
 */
export interface RealmSettings {
  maxConcurrentAgents: number
  messageTimeout: number
  retryPolicy: RetryPolicy
}

/**
 * 重试策略
 */
export interface RetryPolicy {
  maxRetries: number
  backoffMs: number
  maxBackoffMs: number
}

/**
 * 配置变更
 */
export interface ConfigChange {
  version: number
  timestamp: Date
  changes: ConfigDiff[]
  checksum: string
}

/**
 * 配置差异
 */
export interface ConfigDiff {
  path: string
  operation: 'add' | 'update' | 'delete'
  oldValue?: any
  newValue?: any
}

/**
 * 消息
 */
export interface Message {
  id: string
  channelId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

/**
 * Agent 响应
 */
export interface AgentResponse {
  messageId: string
  channelId: string
  agentId: string
  content: string
  metadata?: Record<string, any>
  timestamp: Date
}

/**
 * 设备健康状态
 */
export interface DeviceHealth {
  deviceId: string
  realmId: string
  status: 'online' | 'offline' | 'degraded'
  activeAgents: number
  queueDepth: number
  cpuUsage: number
  memoryUsage: number
  timestamp: Date
}

/**
 * Adapter 发布信息
 */
export interface AdapterRelease {
  adapterId: string
  version: string
  minCompatibleVersion: string
  maxCompatibleVersion: string
  breaking: boolean
  rolloutStrategy: 'immediate' | 'canary' | 'gradual'
  canaryPercentage?: number
  targetDevices?: string[]
  downloadUrl: string
  checksum: string
  changelog: string
  releasedAt: Date
}

/**
 * Backend Gateway 接口
 *
 * 防腐层：隔离 Backend 实现细节（tRPC/REST/gRPC）
 */
export interface IBackendGateway {
  // ==================== 配置管理 ====================

  /**
   * 获取 Realm 配置
   * @param realmId Realm ID
   * @returns Realm 配置
   */
  fetchRealmConfiguration(realmId: string): Promise<RealmConfiguration>

  /**
   * 获取配置版本
   * @param realmId Realm ID
   * @returns 当前版本号
   */
  getConfigVersion(realmId: string): Promise<number>

  /**
   * 获取配置变更（增量同步）
   * @param realmId Realm ID
   * @param fromVersion 起始版本
   * @param toVersion 目标版本
   * @returns 版本链（增量变更）
   */
  getConfigChanges(realmId: string, fromVersion: number, toVersion: number): Promise<ConfigChange[]>

  // ==================== 消息处理 ====================

  /**
   * 获取对话历史
   * @param channelId Channel ID
   * @param limit 最大消息数
   * @returns 消息列表
   */
  fetchMessageHistory(channelId: string, limit?: number): Promise<Message[]>

  /**
   * 保存 Agent 响应
   * @param response Agent 响应
   */
  saveAgentResponse(response: AgentResponse): Promise<void>

  // ==================== 设备管理 ====================

  /**
   * 上报设备健康状态
   * @param health 健康状态
   */
  reportHealth(health: DeviceHealth): Promise<void>

  // ==================== Adapter 管理 ====================

  /**
   * 获取 Adapter 更新信息
   * @param deviceId Device ID
   * @returns Adapter 发布列表
   */
  getAdapterUpdates(deviceId: string): Promise<AdapterRelease[]>
}
