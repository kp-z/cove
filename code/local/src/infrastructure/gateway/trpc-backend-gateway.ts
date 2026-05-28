/**
 * tRPC Backend Gateway Implementation
 *
 * Implements BackendGateway using tRPC client to communicate with Cloud Backend.
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { BackendGateway, ExecutionMode, FeatureFlag } from './backend-gateway.interface';

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
