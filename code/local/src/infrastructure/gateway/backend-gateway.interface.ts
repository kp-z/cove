/**
 * Backend Gateway Interface
 *
 * Anti-Corruption Layer (ACL) between Local Device and Cloud Backend.
 * Provides a stable interface for accessing backend services.
 */

import type { ExecutionMetadata, AgentProgressPhase } from '../../domain/agent-runtime/execution-metadata';

export interface ExecutionMode {
  mode: 'cloud' | 'local' | 'hybrid';
  reason?: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RealmConfiguration {
  realmId: string;
  name: string;
  settings: Record<string, unknown>;
  version: number;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackendGateway {
  /**
   * Get execution mode for a channel
   */
  getExecutionMode(channelId: string): Promise<ExecutionMode>;

  /**
   * Check if a feature flag is enabled
   */
  isFeatureFlagEnabled(flagName: string): Promise<boolean>;

  /**
   * Get all feature flags
   */
  getFeatureFlags(): Promise<FeatureFlag[]>;

  /**
   * Fetch realm configuration from backend
   */
  fetchRealmConfiguration(realmId: string): Promise<RealmConfiguration>;

  /**
   * Get configuration version from backend
   */
  getConfigVersion(realmId: string): Promise<number>;

  /**
   * Report device health to backend
   */
  reportHealth(health: {
    deviceId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics?: Record<string, unknown>;
  }): Promise<void>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get message history for a channel
   */
  getMessageHistory(channelId: string): Promise<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>;

  /**
   * Save agent response to backend
   *
   * @param response.agentId 触发本次响应的 agent id（契约 L5）。
   *   senderId 优先使用此值，避免依赖 channel.getById 反查（后者在多 agent / 字段缺失时不可靠）。
   * @param response.execution 结构化执行元数据（思考/工具/用量等）。
   *   网关负责将其映射为后端 message.saveResponse 期望的「顶层 execution」结构（契约 L4），
   *   而非嵌套在 metadata 内（旧实现会导致后端读取 input.execution 为 undefined）。
   */
  saveAgentResponse(response: {
    channelId: string;
    messageId: string;
    content: string;
    agentId?: string;
    execution?: ExecutionMetadata;
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  /**
   * 契约2：以类型化信封 { phase, data } 上报流式进度。
   *
   * Backend 依据 phase 扇出到不同的 agent.response.* 事件：
   *   - 'thinking' → agent.response.thinking（前端写入思考 UI）
   *   - 'content'  → agent.response.streaming（前端追加正文）
   *   - 'tool'     → agent.response.tool_use（前端进入工具阶段）
   *   - 'status' / 'usage' → 仅用于元数据，落库时统一收口，不再渲染为正文
   *
   * data 为相位相关的结构化对象（不再是裸字符串），从根上消除 JSON 文本污染正文的问题。
   */
  pushResponseChunk(progress: {
    channelId: string;
    messageId: string;
    agentId: string;
    phase: AgentProgressPhase;
    data: Record<string, unknown>;
  }): Promise<void>;

  /**
   * 契约2：上报 agent 响应失败，触发后端发布 agent.response.failed 事件。
   * messageId 为服务端预分配的权威 agentMessageId，使前端占位消息正确进入失败态。
   */
  reportAgentFailure(failure: {
    channelId: string;
    messageId: string;
    agentId?: string;
    error?: string;
  }): Promise<void>;

  /**
   * 上报 agent 响应已由用户中止。
   * userMessageId 用于后端解除触发消息对应的 pending 状态。
   */
  reportAgentAbort(abort: {
    channelId: string;
    messageId: string;
    userMessageId: string;
    agentId?: string;
    partialContent?: string;
    reason?: string;
  }): Promise<void>;

  /**
   * Sync local agent metadata to backend (upsert)
   *
   * Local 扫描本地 agent.md 后，将解析出的元数据批量推送给 Backend 入库。
   */
  syncAgentMetadata(payload: {
    deviceId?: string;
    realmId?: string;
    agents: AgentMetadataDto[];
  }): Promise<{ synced: number; received: number }>;
}

/**
 * Agent 内容传输对象（Phase 4 路线 A：写入 Backend DB 的 contentJson）
 */
export interface AgentContentDto {
  description?: string;
  capabilities?: string[];
  tags?: string[];
  runtimeConfig?: Record<string, unknown>;
  persona?: Record<string, unknown>;
  skills?: Record<string, unknown>;
  tools?: Record<string, unknown>;
  triggers?: Record<string, unknown>;
}

/**
 * Agent 元数据传输对象（与 Backend agentSync.sync 契约一致）
 */
export interface AgentMetadataDto {
  agent_id: string;
  name: string;
  display_name: string;
  status?: string;
  category?: string;
  capabilities?: string[];
  tags?: string[];
  created_by?: string;
  created_at?: string;
  content?: AgentContentDto;
}
