/**
 * Backend Gateway Interface
 *
 * Anti-Corruption Layer (ACL) between Local Device and Cloud Backend.
 * Provides a stable interface for accessing backend services.
 */

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
   */
  saveAgentResponse(response: {
    channelId: string;
    messageId: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  /**
   * Push response chunk to backend (for streaming)
   */
  pushResponseChunk(chunk: {
    channelId: string;
    messageId: string;
    agentId: string;
    chunk: string;
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
}
