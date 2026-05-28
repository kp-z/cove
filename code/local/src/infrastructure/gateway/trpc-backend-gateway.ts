/**
 * tRPC Backend Gateway Implementation
 *
 * Implements BackendGateway using tRPC client to communicate with Cloud Backend.
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { BackendGateway, ExecutionMode, FeatureFlag, RealmConfiguration } from './backend-gateway.interface';

export class TrpcBackendGateway implements BackendGateway {
  private client: any; // TODO: Import proper AppRouter type from backend

  constructor(private backendUrl: string) {
    this.client = createTRPCProxyClient({
      links: [
        httpBatchLink({
          url: `${backendUrl}/trpc`,
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

  async sendMessageToBackend(message: {
    channelId: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.client.message.send.mutate(message);
    } catch (error) {
      console.error('Failed to send message to backend:', error);
      throw error;
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
      await this.client.device.reportHealth.mutate(health);
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
}
