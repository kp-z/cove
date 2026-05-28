/**
 * Device Client
 *
 * 主控制器：编排所有组件的生命周期，管理 Device 的启动、运行和停止
 */

import { PrismaClient } from '@prisma/client';
import type { Config } from './config';
import type { ILogger } from './infrastructure/logger';
import { ConsoleLogger } from './infrastructure/logger';
import { TrpcBackendGateway } from './infrastructure/gateway/trpc-backend-gateway';
import { TrpcWebSocketClient } from './infrastructure/gateway/trpc-websocket-client';
import { SqliteMessageQueue } from './infrastructure/storage/sqlite-message-queue';
import { SqliteTaskStore } from './infrastructure/storage/sqlite-task-store';
import { SqliteConfigCache } from './infrastructure/storage/sqlite-config-cache';
import { MessageOrchestrator } from './domain/agent-runtime/message-orchestrator';
import { DeviceProcessor } from './domain/agent-runtime/device-processor';
import { BackendProcessor } from './domain/agent-runtime/backend-processor';
import { ConfigurationService } from './domain/configuration/configuration-service';
import { DeviceLifecycleManager } from './domain/device-lifecycle/device-lifecycle-manager';
import { AdapterManager } from './infrastructure/adapters/adapter-manager';
import { AnthropicAdapter } from './infrastructure/adapters/llm/anthropic-adapter';
import { OpenAIAdapter } from './infrastructure/adapters/llm/openai-adapter';

export interface DeviceClientConfig extends Config {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  anthropicApiKey?: string;
  openaiApiKey?: string;
}

export class DeviceClient {
  private logger: ILogger;
  private prisma: PrismaClient | null = null;
  private wsClient: TrpcWebSocketClient | null = null;
  private messageOrchestrator: MessageOrchestrator | null = null;
  private configService: ConfigurationService | null = null;
  private lifecycleManager: DeviceLifecycleManager | null = null;
  private running = false;
  private shuttingDown = false;

  constructor(private config: DeviceClientConfig) {
    this.logger = new ConsoleLogger(config.logLevel || 'info');
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Device client already running');
      return;
    }

    this.logger.info('Starting Device Client', {
      deviceId: this.config.device.id,
      serverUrl: this.config.server.url,
    });

    try {
      // 1. Initialize Prisma Client
      this.logger.info('Initializing database');
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${this.config.local.dataDir}/device.db`,
          },
        },
      });
      await this.prisma.$connect();

      // 2. Create Backend Gateway
      this.logger.info('Creating backend gateway');
      const backendGateway = new TrpcBackendGateway(this.config.server.url);

      // 3. Create Storage Layer
      this.logger.info('Creating storage layer');
      const messageQueue = new SqliteMessageQueue(this.prisma);
      const taskStore = new SqliteTaskStore(this.prisma);
      const configCache = new SqliteConfigCache(this.prisma);

      // 4. Create Adapter Manager
      this.logger.info('Creating adapter manager');
      const adapterManager = new AdapterManager();

      // Register LLM adapters
      if (this.config.anthropicApiKey) {
        await adapterManager.loadAdapter({
          name: 'anthropic-adapter',
          type: 'anthropic',
          version: '1.0.0',
          enabled: true,
          config: {
            apiKey: this.config.anthropicApiKey,
            model: 'claude-3-5-sonnet-20241022',
          },
        });
        this.logger.info('Registered Anthropic adapter');
      }

      if (this.config.openaiApiKey) {
        await adapterManager.loadAdapter({
          name: 'openai-adapter',
          type: 'openai',
          version: '1.0.0',
          enabled: true,
          config: {
            apiKey: this.config.openaiApiKey,
            model: 'gpt-4o',
          },
        });
        this.logger.info('Registered OpenAI adapter');
      }

      // 5. Create Processors
      this.logger.info('Creating message processors');
      const deviceProcessor = new DeviceProcessor(backendGateway, adapterManager, {
        defaultAdapter: this.config.anthropicApiKey ? 'anthropic-adapter' : 'openai-adapter',
      });
      const backendProcessor = new BackendProcessor(backendGateway);

      // 6. Create Message Orchestrator
      this.logger.info('Creating message orchestrator');
      this.messageOrchestrator = new MessageOrchestrator(
        backendGateway,
        backendProcessor,
        deviceProcessor,
        messageQueue,
        taskStore,
        {
          maxAttempts: 3,
          pollInterval: 1000,
        }
      );

      // 7. Create Configuration Service
      this.logger.info('Creating configuration service');
      this.configService = new ConfigurationService(backendGateway, configCache);

      // 8. Create Device Lifecycle Manager
      this.logger.info('Creating lifecycle manager');
      this.lifecycleManager = new DeviceLifecycleManager(
        {
          deviceId: this.config.device.id,
          connection: {
            url: this.config.server.url,
            heartbeatInterval: this.config.local.heartbeatInterval,
            reconnectInterval: this.config.local.reconnectDelay,
            maxReconnectAttempts: 10,
          },
          health: {
            reportInterval: 60000, // 1 minute
          },
        },
        backendGateway,
        taskStore
      );

      // 9. Connect to Backend via WebSocket
      this.logger.info('Connecting to backend');
      await this.connectToBackend();

      // 10. Sync Configuration
      this.logger.info('Syncing configuration');
      const syncResult = await this.configService.syncConfig(this.config.device.realmId);
      if (!syncResult.success) {
        this.logger.warn('Configuration sync failed, continuing anyway');
      } else {
        this.logger.info('Configuration synced', {
          version: syncResult.version,
          checksum: syncResult.checksum,
        });
      }

      // 11. Start Lifecycle Manager
      this.logger.info('Starting lifecycle manager');
      await this.lifecycleManager.start();

      // 12. Start Message Processing Loop
      this.logger.info('Starting message processing loop');
      await this.messageOrchestrator.start();

      this.running = true;
      this.logger.info('Device Client started successfully', {
        deviceId: this.config.device.id,
      });
    } catch (error) {
      this.logger.error('Failed to start Device Client', error as Error);
      await this.cleanup();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.shuttingDown) {
      this.logger.warn('Already shutting down');
      return;
    }

    if (!this.running) {
      this.logger.warn('Device client not running');
      return;
    }

    this.shuttingDown = true;
    this.logger.info('Stopping Device Client');

    try {
      // 1. Stop accepting new messages
      if (this.messageOrchestrator) {
        this.logger.info('Stopping message orchestrator');
        await this.messageOrchestrator.stop();
      }

      // 2. Wait for current tasks to complete (with timeout)
      this.logger.info('Waiting for current tasks to complete');
      await this.waitForTasksToComplete(30000); // 30 seconds timeout

      // 3. Stop lifecycle manager
      if (this.lifecycleManager) {
        this.logger.info('Stopping lifecycle manager');
        await this.lifecycleManager.stop();
      }

      // 4. Disconnect WebSocket
      if (this.wsClient) {
        this.logger.info('Disconnecting from backend');
        await this.wsClient.disconnect();
      }

      // 5. Close database connection
      await this.cleanup();

      this.running = false;
      this.logger.info('Device Client stopped successfully');
    } catch (error) {
      this.logger.error('Error during shutdown', error as Error);
      throw error;
    } finally {
      this.shuttingDown = false;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private async connectToBackend(): Promise<void> {
    this.wsClient = new TrpcWebSocketClient({
      serverUrl: this.config.server.url,
      deviceId: this.config.device.id,
      apiKey: this.config.device.apiKey,
      realmId: this.config.device.realmId,
      onMessage: (message) => this.handleMessage(message),
      onConnected: () => {
        this.logger.info('Connected to backend');
      },
      onDisconnected: () => {
        this.logger.warn('Disconnected from backend');
      },
      onError: (error) => {
        this.logger.error('WebSocket error', error);
      },
      logger: this.logger,
    });

    await this.wsClient.connect();
  }

  private async handleMessage(message: any): Promise<void> {
    this.logger.debug('Received message from backend', {
      type: message.type,
      timestamp: message.timestamp,
    });

    if (!this.messageOrchestrator) {
      this.logger.error('Message orchestrator not initialized');
      return;
    }

    try {
      // Enqueue message for processing
      if (message.type === 'task' && message.data) {
        const taskId = await this.messageOrchestrator.enqueue({
          messageId: message.data.messageId || crypto.randomUUID(),
          channelId: message.data.channelId,
          content: message.data.content,
          priority: message.data.priority || 0,
        });

        this.logger.info('Message enqueued', { taskId });
      } else if (message.type === 'config' && message.data) {
        // Handle configuration update
        this.logger.info('Configuration update received');
        if (this.configService) {
          await this.configService.syncConfig(this.config.device.realmId);
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle message', error as Error, {
        messageType: message.type,
      });
    }
  }

  private async waitForTasksToComplete(timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      // Check if there are any active tasks
      // TODO: Implement proper task counting in MessageOrchestrator
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For now, just wait a bit
      break;
    }
  }

  private async cleanup(): Promise<void> {
    if (this.prisma) {
      this.logger.info('Closing database connection');
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }
}
