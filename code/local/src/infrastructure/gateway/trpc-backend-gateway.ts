/**
 * tRPC Backend Gateway Implementation
 *
 * Implements BackendGateway using tRPC client to communicate with Cloud Backend.
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { BackendGateway, ExecutionMode, FeatureFlag, RealmConfiguration, AgentMetadataDto } from './backend-gateway.interface';

export class TrpcBackendGateway implements BackendGateway {
  private client: any; // TODO: Import proper AppRouter type from backend

  constructor(
    private backendUrl: string,
    private realmId?: string,
    private deviceId?: string
  ) {
    this.client = createTRPCProxyClient({
      links: [
        httpBatchLink({
          url: `${backendUrl}/trpc`,
          headers: () => {
            const headers: Record<string, string> = {};
            if (this.realmId) {
              headers['x-realm-id'] = this.realmId;
            }
            if (this.deviceId) {
              headers['x-user-id'] = this.deviceId;
            }
            return headers;
          },
        }),
      ],
    });
  }

  async getExecutionMode(channelId: string): Promise<ExecutionMode> {
    try {
      const result = await this.client.executionMode.getMode.query({ channelId });
      return result;
    } catch (error) {
      console.error('Failed to get execution mode:', error);
      // Fallback to local mode on error
      return { mode: 'local', reason: 'Backend unavailable' };
    }
  }

  async isFeatureFlagEnabled(flagName: string): Promise<boolean> {
    try {
      const result = await this.client.featureFlag.isEnabled.query({ name: flagName });
      return result;
    } catch (error) {
      console.error('Failed to check feature flag:', error);
      return false;
    }
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const result = await this.client.featureFlag.list.query();
      return result;
    } catch (error) {
      console.error('Failed to get feature flags:', error);
      return [];
    }
  }

  async fetchRealmConfiguration(realmId: string): Promise<RealmConfiguration> {
    try {
      const result = await this.client.configuration.fetch.query({ realmId });
      return result;
    } catch (error) {
      console.error('Failed to fetch realm configuration:', error);
      throw error;
    }
  }

  async getConfigVersion(realmId: string): Promise<number> {
    try {
      const result = await this.client.configuration.getVersion.query({ realmId });
      return result;
    } catch (error) {
      console.error('Failed to get config version:', error);
      throw error;
    }
  }

  async reportHealth(health: {
    deviceId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // 使用 deviceSubscription.heartbeat 替代 device.reportHealth
      await this.client.deviceSubscription.heartbeat.mutate({
        deviceId: health.deviceId,
        status: health.metrics,
      });
    } catch (error) {
      console.error('Failed to report health:', error);
      // Don't throw - health reporting is best-effort
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.health.check.query();
      return true;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  async getMessageHistory(channelId: string): Promise<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>> {
    try {
      const result = await this.client.message.getHistory.query({ channelId });
      return result;
    } catch (error) {
      console.error('Failed to get message history:', error);
      return [];
    }
  }

  async saveAgentResponse(response: {
    channelId: string;
    messageId: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // Extract channel ID without realm prefix
      const channelId = response.channelId.includes(':')
        ? response.channelId.split(':')[1]
        : response.channelId;

      // Get channel info to find agent ID
      let senderId = 'system'; // fallback
      try {
        const channelInfo = await this.client.channel.getById.query({ channelId });
        senderId = channelInfo.agentId || channelInfo.id || 'system';
      } catch (err) {
        console.warn('Could not get channel info, using fallback senderId');
      }

      await this.client.message.saveResponse.mutate({
        ...response,
        senderId,
      });
    } catch (error) {
      console.error('Failed to save agent response:', error);
      throw error;
    }
  }

  async pushResponseChunk(chunk: {
    channelId: string;
    messageId: string;
    agentId: string;
    chunk: string;
  }): Promise<void> {
    try {
      await this.client.message.pushChunk.mutate(chunk);
    } catch (error) {
      console.error('Failed to push response chunk:', error);
      // Don't throw - chunk pushing is best-effort
    }
  }

  async syncAgentMetadata(payload: {
    deviceId?: string;
    realmId?: string;
    agents: AgentMetadataDto[];
  }): Promise<{ synced: number; received: number }> {
    try {
      return await this.client.agentSync.sync.mutate(payload);
    } catch (error) {
      console.error('Failed to sync agent metadata:', error);
      // 同步失败不应阻断设备启动，返回 0 同步数兜底
      return { synced: 0, received: payload.agents.length };
    }
  }
}
