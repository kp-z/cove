/**
 * Cove Local Device Agent
 *
 * This is the main entry point for the local device agent that connects
 * to the Cloud backend and executes tasks locally.
 */

import { WebSocketClient } from './websocket-client';
import { AdapterExecutor } from './adapter-executor';
import { loadConfig } from './config';

async function main() {
  console.log('🚀 Starting Cove Local Device Agent...');

  // Load configuration
  const config = await loadConfig();
  console.log(`📡 Connecting to: ${config.server.url}`);

  // Initialize adapter executor
  const adapterExecutor = new AdapterExecutor({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize WebSocket client
  const wsClient = new WebSocketClient(config, adapterExecutor);

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
