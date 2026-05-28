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
   * Send message to backend for cloud execution
   */
  sendMessageToBackend(message: {
    channelId: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}
