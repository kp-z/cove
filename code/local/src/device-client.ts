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

export interface DeviceClientConfig extends Config {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  anthropicApiKey?: string;
  openaiApiKey?: string;
}

export class DeviceClient {
  private readonly logger: ILogger;
  private prisma: PrismaClient | null = null;
  private wsClient: TrpcWebSocketClient | null = null;
  private messageOrchestrator: MessageOrchestrator | null = null;
  private configService: ConfigurationService | null = null;
  private lifecycleManager: DeviceLifecycleManager | null = null;
  private running = false;
  private shuttingDown = false;

  constructor(private config: DeviceClientConfig, logger?: ILogger) {
    // 允许外部传入 root logger（例如 main.ts 创建的 ConsoleLogger）
    this.logger = logger ?? new ConsoleLogger(config.logLevel || 'info');
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('⚠️  Device client already running');
      return;
    }

    this.logger.info('🚀 Starting Cove Local Device Agent...', {
      device: this.config.device.id,
      realm: this.config.device.realmId,
    });

    try {
      // 步骤 1 — 初始化数据库
      const dbUrl = process.env.DATABASE_URL || `file:${this.config.local.dataDir}/device.db`;
      this.prisma = new PrismaClient({
        datasources: { db: { url: dbUrl } },
      });
      await this.prisma.$connect();
      this.logger.info('🗄️  Database ready');

      // 步骤 2 — 创建 Backend Gateway（HTTP tRPC）
      const httpUrl = this.config.server.url
        .replace(/^ws:/, 'http:')
        .replace(/^wss:/, 'https:')
        .replace(/\/trpc$/, '');

      const gatewayLogger = this.logger.scope('Gateway');
      const backendGateway = new TrpcBackendGateway(
        httpUrl,
        this.config.device.realmId,
        this.config.device.id,
        gatewayLogger
      );
      this.logger.debug(`⚙️  Backend: ${httpUrl}`);

      // 步骤 3 — 创建存储层
      const messageQueue = new SqliteMessageQueue(this.prisma);
      const taskStore    = new SqliteTaskStore(this.prisma);
      const configCache  = new SqliteConfigCache(this.prisma);

      // 步骤 4 — 注册 Adapters
      const adapterManager = new AdapterManager();

      await adapterManager.loadAdapter({
        name: 'claude-cli-adapter',
        type: 'custom',
        version: '1.0.0',
        enabled: true,
        config: { cliPath: 'claude', model: 'opus', thinkingEnabled: true },
      });
      const registeredAdapters = ['claude-cli-adapter'];

      if (this.config.anthropicApiKey) {
        await adapterManager.loadAdapter({
          name: 'anthropic-adapter',
          type: 'anthropic',
          version: '1.0.0',
          enabled: true,
          config: { apiKey: this.config.anthropicApiKey, model: 'claude-3-5-sonnet-20241022' },
        });
        registeredAdapters.push('anthropic-adapter');
      }

      if (this.config.openaiApiKey) {
        await adapterManager.loadAdapter({
          name: 'openai-adapter',
          type: 'openai',
          version: '1.0.0',
          enabled: true,
          config: { apiKey: this.config.openaiApiKey, model: 'gpt-4o' },
        });
        registeredAdapters.push('openai-adapter');
      }

      this.logger.info(`⚙️  Adapters: ${registeredAdapters.join(', ')} ✓`);

      // 步骤 5 — 创建消息处理器
      const processorLogger = this.logger.scope('Processor');
      const deviceProcessor = new DeviceProcessor(backendGateway, adapterManager, {
        defaultAdapter: 'claude-cli-adapter',
        logger: processorLogger,
      });

      // 步骤 6 — 创建消息编排器
      this.messageOrchestrator = new MessageOrchestrator(
        deviceProcessor,
        messageQueue,
        taskStore,
        { maxAttempts: 3, pollInterval: 1000 }
      );

      // 步骤 7 — 配置服务
      this.configService = new ConfigurationService(backendGateway, configCache);

      // 步骤 8 — 创建生命周期管理器（含子 scoped loggers）
      const lifecycleLogger = this.logger.scope('Lifecycle');
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
            reportInterval: 60000,
          },
          logger: lifecycleLogger,
        },
        backendGateway,
        taskStore
      );

      // 步骤 9 — 连接 Backend（WebSocket）
      await this.connectToBackend();

      // 步骤 10 — 同步配置
      const syncResult = await this.configService.syncConfig(this.config.device.realmId);
      if (!syncResult.success) {
        this.logger.warn('⚠️  Configuration sync failed, continuing');
      } else {
        this.logger.debug('⚙️  Configuration synced', { version: syncResult.version });
      }

      // 步骤 10.5 — 扫描本地 Agent 目录并同步元数据到 Backend
      await this.syncLocalAgents(backendGateway);

      // 步骤 11 — 启动生命周期管理器
      await this.lifecycleManager.start();

      // 步骤 12 — 启动消息处理循环
      await this.messageOrchestrator.start();

      this.running = true;
      this.logger.info(`✅ Device Agent running — device: ${this.config.device.id}, realm: ${this.config.device.realmId}`);
    } catch (error) {
      this.logger.error('❌ Failed to start Device Client', error as Error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 扫描本地 Agent 目录并将元数据同步到 Backend（best-effort）
   */
  private async syncLocalAgents(backendGateway: BackendGateway): Promise<void> {
    try {
      const coveRoot  = process.env.COVE_ROOT || path.join(os.homedir(), '.cove');
      const agentsDir = path.join(coveRoot, 'storage', 'agents');

      const scanner = new AgentScanner(agentsDir, this.logger);
      const agents  = await scanner.scan();

      if (agents.length === 0) {
        this.logger.debug('🤖 No local agents to sync');
        return;
      }

      const result = await backendGateway.syncAgentMetadata({
        deviceId: this.config.device.id,
        realmId:  this.config.device.realmId,
        agents,
      });

      this.logger.info(`🤖 Agents: ${result.synced} synced to backend`);
    } catch (error) {
      this.logger.warn('⚠️  Agent metadata sync failed, continuing');
    }
  }

  async stop(): Promise<void> {
    if (this.shuttingDown) {
      this.logger.warn('⚠️  Already shutting down');
      return;
    }

    if (!this.running) {
      this.logger.warn('⚠️  Device client not running');
      return;
    }

    this.shuttingDown = true;
    this.logger.info('🛑 Stopping Device Client...');

    try {
      if (this.messageOrchestrator) {
        await this.messageOrchestrator.stop();
      }

      await this.waitForTasksToComplete(30000);

      if (this.lifecycleManager) {
        await this.lifecycleManager.stop();
      }

      if (this.wsClient) {
        await this.wsClient.disconnect();
      }

      await this.cleanup();

      this.running = false;
      this.logger.info('✅ Device Client stopped');
    } catch (error) {
      this.logger.error('❌ Error during shutdown', error as Error);
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
      deviceId:  this.config.device.id,
      apiKey:    this.config.device.apiKey,
      realmId:   this.config.device.realmId,
      onMessage: (message) => this.handleMessage(message),
      onConnected: () => {
        this.logger.info(`✅ Connected to backend (device: ${this.config.device.id})`);
      },
      onDisconnected: () => {
        this.logger.warn('⚠️  Disconnected from backend');
      },
      onError: (error) => {
        this.logger.error('❌ WebSocket error', error);
      },
      logger: this.logger,
    });

    await this.wsClient.connect();
  }

  private async handleMessage(message: any): Promise<void> {
    this.logger.debug('📨 Message received from backend', {
      type:       message.type,
      hasPayload: !!message.payload,
    });

    if (!this.messageOrchestrator) {
      this.logger.error('❌ Message orchestrator not initialized');
      return;
    }

    try {
      if (message.type === 'message.process' && message.payload) {
        const { messageId, channelId, content, metadata } = message.payload;
        this.logger.info('📨 Message received', {
          msgId: messageId,
          channel: channelId,
          agentId: metadata?.agentId,
          agentMessageId: metadata?.agentMessageId,
        });

        // 契约1/契约3：透传 metadata（含 agentMessageId/agentId），
        // 否则 Local 侧流式回报与落库会丢失服务端权威 id 与 agent 身份。
        const taskId = await this.messageOrchestrator.enqueue({
          messageId,
          channelId,
          content,
          priority: 0,
          metadata,
        });

        this.logger.debug('Message enqueued', { taskId, messageId });
      } else if (message.type === 'task' && message.data) {
        const taskId = await this.messageOrchestrator.enqueue({
          messageId: message.data.messageId || crypto.randomUUID(),
          channelId: message.data.channelId,
          content:   message.data.content,
          priority:  message.data.priority || 0,
        });
        this.logger.debug('Legacy task enqueued', { taskId });
      } else if (message.type === 'config' && message.data) {
        this.logger.debug('⚙️  Config update received');
        if (this.configService) {
          await this.configService.syncConfig(this.config.device.realmId);
        }
      } else {
        this.logger.warn('⚠️  Unknown message type', {
          type: message.type,
          hasData: !!message.data,
        });
      }
    } catch (error) {
      this.logger.error('❌ Failed to handle message', error as Error, {
        messageType: message.type,
      });
    }
  }

  private async waitForTasksToComplete(timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      // TODO: implement proper task counting in MessageOrchestrator
      await new Promise(resolve => setTimeout(resolve, 1000));
      break;
    }
  }

  private async cleanup(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }
}
