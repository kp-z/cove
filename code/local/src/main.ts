#!/usr/bin/env node
/**
 * Cove Local Device Agent
 *
 * This is the main entry point for the local device agent that connects
 * to the Cloud backend and executes tasks locally.
 */

import { DeviceClient } from './device-client';
import { loadConfig } from './config';

class ShutdownManager {
  private isShuttingDown = false;
  private forceExitTimer: NodeJS.Timeout | null = null;

  constructor(private client: DeviceClient) {}

  async shutdown(signal: string, exitCode: number): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    console.log(`\n🛑 Shutting down gracefully... (signal: ${signal})`);

    this.forceExitTimer = setTimeout(() => {
      console.log('⚠️  Shutdown timeout reached, forcing exit...');
      process.exit(1);
    }, 30000); // 30 seconds timeout

    try {
      await this.client.stop();

      if (this.forceExitTimer) {
        clearTimeout(this.forceExitTimer);
      }

      console.log('✅ Shutdown complete');
      process.exit(exitCode);
    } catch (error) {
      console.error('⚠️  Error during shutdown:', error);
      process.exit(1);
    }
  }
}

async function main() {
  console.log('🚀 Starting Cove Local Device Agent...');

  // Load configuration
  const config = await loadConfig();

  // Create Device Client
  const client = new DeviceClient({
    ...config,
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  // Setup shutdown manager
  const shutdownManager = new ShutdownManager(client);

  // Register signal handlers
  process.on('SIGTERM', () => shutdownManager.shutdown('SIGTERM', 0));
  process.on('SIGINT', () => shutdownManager.shutdown('SIGINT', 0));
  process.on('SIGHUP', () => shutdownManager.shutdown('SIGHUP', 0));

  process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled rejection:', reason);
    shutdownManager.shutdown('unhandledRejection', 1);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    shutdownManager.shutdown('uncaughtException', 1);
  });

  // Start the client
  await client.start();

  console.log('✅ Local Device Agent is running');
  console.log('Press Ctrl+C to stop');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
