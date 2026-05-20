/**
 * Cove Local Device Agent
 *
 * This is the main entry point for the local device agent that connects
 * to the Cloud backend and executes tasks locally.
 */

import { WebSocketClient } from './websocket-client';
import { TaskExecutor } from './task-executor';
import { loadConfig } from './config';

async function main() {
  console.log('🚀 Starting Cove Local Device Agent...');

  // Load configuration
  const config = await loadConfig();
  console.log(`📡 Connecting to: ${config.server.url}`);

  // Initialize task executor
  const taskExecutor = new TaskExecutor(config);

  // Initialize WebSocket client
  const wsClient = new WebSocketClient(config, taskExecutor);

  // Connect to Cloud backend
  await wsClient.connect();

  console.log('✅ Local Device Agent is running');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await wsClient.disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
