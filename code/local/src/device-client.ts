/**
 * Device Client
 *
 * 主控制器：编排所有组件的生命周期，管理 Device 的启动、运行和停止
 */

import * as os from 'os';
import * as path from 'path';
import { PrismaClient } from '../generated/client';
import type { Config } from './config';
import type { ILogger } from './infrastructure/logger';
import { AgentScanner } from './domain/agent-sync/agent-scanner';
import type { BackendGateway } from './infrastructure/gateway/backend-gateway.interface';
import { ConsoleLogger } from './infrastructure/logger';
import { TrpcBackendGateway } from './infrastructure/gateway/trpc-backend-gateway';
import { TrpcWebSocketClient } from './infrastructure/gateway/trpc-websocket-client';
import { SqliteMessageQueue } from './infrastructure/storage/sqlite-message-queue';
import { SqliteTaskStore } from './infrastructure/storage/sqlite-task-store';
import { SqliteConfigCache } from './infrastructure/storage/sqlite-config-cache';
import { MessageOrchestrator } from './domain/agent-runtime/message-orchestrator';
import { DeviceProcessor } from './domain/agent-runtime/device-processor';
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

      // Use DATABASE_URL from env if set, otherwise use config path
      const dbUrl = process.env.DATABASE_URL || `file:${this.config.local.dataDir}/device.db`;
      this.logger.info('Database configuration', { dbUrl });

      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl,
          },
        },
      });
      await this.prisma.$connect();
      this.logger.info('Database connected successfully');

      // 2. Create Backend Gateway
      this.logger.info('Creating backend gateway');

      // Convert WebSocket URL to HTTP URL for tRPC client
      const httpUrl = this.config.server.url.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:').replace(/\/trpc$/, '');
      this.logger.info('Backend gateway URLs', {
        original: this.config.server.url,
        http: httpUrl
      });

      const backendGateway = new TrpcBackendGateway(
        httpUrl,
        this.config.device.realmId,
        this.config.device.id
      );

      // 3. Create Storage Layer
      this.logger.info('Creating storage layer');
      const messageQueue = new SqliteMessageQueue(this.prisma);
      const taskStore = new SqliteTaskStore(this.prisma);
      const configCache = new SqliteConfigCache(this.prisma);

      // 4. Create Adapter Manager
      this.logger.info('Creating adapter manager');
      const adapterManager = new AdapterManager();

      // Register Claude CLI adapter (always available if claude CLI is installed)
      await adapterManager.loadAdapter({
        name: 'claude-cli-adapter',
        type: 'custom',
        version: '1.0.0',
        enabled: true,
        config: {
          cliPath: 'claude',
          model: 'opus',
          thinkingEnabled: true,
        },
      });
      this.logger.info('Registered Claude CLI adapter');

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

      // 5. Create Processor（仅本地 Device 处理器）
      this.logger.info('Creating message processor');
      const deviceProcessor = new DeviceProcessor(backendGateway, adapterManager, {
        defaultAdapter: 'claude-cli-adapter', // 默认使用 Claude CLI
      });

      // 6. Create Message Orchestrator（单一 Device 执行模式）
      this.logger.info('Creating message orchestrator');
      this.messageOrchestrator = new MessageOrchestrator(
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
            reconnectBaseDelay: this.config.local.reconnectDelay,
            reconnectMaxAttempts: 10,
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

      // 10.5 扫描本地 Agent 目录并将元数据同步到 Backend
      //  - 文件位于 Local，扫描/解析由 Local 负责；Backend 仅被动接收 upsert
      await this.syncLocalAgents(backendGateway);

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

  /**
   * 扫描本地 Agent 目录并将元数据同步到 Backend
   *
   * 目录解析与 Backend 保持一致：优先 COVE_ROOT，否则 ~/.cove。
   * 同步失败仅告警，不阻断设备启动（best-effort）。
   */
  private async syncLocalAgents(backendGateway: BackendGateway): Promise<void> {
    try {
      const coveRoot = process.env.COVE_ROOT || path.join(os.homedir(), '.cove');
      const agentsDir = path.join(coveRoot, 'storage', 'agents');

      const scanner = new AgentScanner(agentsDir, this.logger);
      const agents = await scanner.scan();

      if (agents.length === 0) {
        this.logger.info('No local agents to sync');
        return;
      }

      const result = await backendGateway.syncAgentMetadata({
        deviceId: this.config.device.id,
        realmId: this.config.device.realmId,
        agents,
      });

      this.logger.info('Agent metadata synced to backend', {
        synced: result.synced,
        received: result.received,
      });
    } catch (error) {
      this.logger.warn('Agent metadata sync failed, continuing');
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
    this.logger.info('[DeviceClient] Received message from backend', {
      type: message.type,
      timestamp: message.timestamp,
      hasPayload: !!message.payload
    });

    if (!this.messageOrchestrator) {
      this.logger.error('Message orchestrator not initialized');
      return;
    }

    try {
      // Handle message.process (from backend's DeviceProcessor)
      if (message.type === 'message.process' && message.payload) {
        this.logger.info('[DeviceClient] Processing message.process', {
          messageId: message.payload.messageId,
          channelId: message.payload.channelId
        });

        const taskId = await this.messageOrchestrator.enqueue({
          messageId: message.payload.messageId,
          channelId: message.payload.channelId,
          content: message.payload.content,
          priority: 0,
        });

        this.logger.info('Message enqueued for processing', { taskId, messageId: message.payload.messageId });
      }
      // Handle legacy 'task' message format
      else if (message.type === 'task' && message.data) {
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
      } else {
        this.logger.warn('[DeviceClient] Unknown message type', {
          type: message.type,
          hasData: !!message.data,
          hasPayload: !!message.payload
        });
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
