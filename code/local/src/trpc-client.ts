/**
 * tRPC Client for Local Device Agent
 *
 * Connects to Cloud Backend using tRPC WebSocket subscriptions
 */

import { createTRPCClient, createWSClient, wsLink, splitLink, httpBatchLink } from '@trpc/client';
import { Config } from './config';

/**
 * Create a tRPC client for the Local Device Agent
 *
 * Note: We use `any` for the router type to avoid cross-package type dependencies.
 * The actual type safety is maintained at runtime through tRPC's protocol.
 */
export function createDeviceTRPCClient(config: Config) {
  // Parse WebSocket URL from config
  const serverUrl = new URL(config.server.url);
  const wsProtocol = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${serverUrl.host}`;
  const httpUrl = config.server.url.replace(/^ws/, 'http');

  // Create WebSocket client with device authentication
  const wsClient = createWSClient({
    url: wsUrl,
    connectionParams: async () => ({
      deviceId: config.device.id,
      apiKey: config.device.apiKey,
      realmId: config.device.realmId,
    }),
  } as any);

  // Create tRPC client with split link (WebSocket for subscriptions, HTTP for queries/mutations)
  const client = createTRPCClient<any>({
    links: [
      splitLink({
        condition: (op) => op.type === 'subscription',
        true: wsLink({ client: wsClient }),
        false: httpBatchLink({
          url: httpUrl,
          headers: () => ({
            'x-device-id': config.device.id,
            'x-api-key': config.device.apiKey,
            'x-realm-id': config.device.realmId,
          }),
        }),
      }),
    ],
  });

  return { client, wsClient };
}
