#!/usr/bin/env node
/**
 * Cove Local Device Agent
 *
 * This is the main entry point for the local device agent that connects
 * to the Cloud backend and executes tasks locally.
 */

import { WebSocketClient } from './websocket-client';
import { AdapterExecutor } from './adapter-executor';
import { loadConfig } from './config';

class ShutdownManager {
  private isShuttingDown = false;
  private forceExitTimer: NodeJS.Timeout | null = null;

  constructor(
    private wsClient: WebSocketClient,
    private adapterExecutor: AdapterExecutor
  ) {}

  async shutdown(signal: string, exitCode: number): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    console.log(`\n🛑 Shutting down gracefully... (signal: ${signal})`);

    this.forceExitTimer = setTimeout(() => {
      console.log('⚠️  Shutdown timeout reached, forcing exit...');
      process.exit(1);
    }, 10000);

    try {
      await this.adapterExecutor.cleanup();
      await this.wsClient.disconnect();

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

  const config = await loadConfig();
  console.log(`📡 Connecting to: ${config.server.url}`);

  const adapterExecutor = new AdapterExecutor({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  const wsClient = new WebSocketClient(config, adapterExecutor);

  await wsClient.connect();

  console.log('✅ Local Device Agent is running');

  const shutdownManager = new ShutdownManager(wsClient, adapterExecutor);

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
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
