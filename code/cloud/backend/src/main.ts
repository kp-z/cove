import { createServer } from 'http';
import { config } from 'dotenv';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer as WSServer } from 'ws';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

// Infrastructure Layer
import {
  InMemoryEventBus,
} from './infrastructure/index';

import { HybridAgentRepository } from './infrastructure/repositories/hybrid-agent.repository';
import { HybridTaskRepository } from './infrastructure/repositories/hybrid-task.repository';
import { HybridThreadRepository } from './infrastructure/repositories/hybrid-thread.repository';
import { ChannelRepository } from './infrastructure/repositories/channel.repository';
import { HybridMessageRepository } from './infrastructure/repositories/hybrid-message.repository';
import { HybridUserRepository } from './infrastructure/repositories/hybrid-user.repository';
import { HybridProjectRepository } from './infrastructure/repositories/hybrid-project.repository';
import { HybridWorkflowRepository } from './infrastructure/repositories/hybrid-workflow.repository';
import { RealmRepository } from './infrastructure/repositories/realm.repository';
import { HybridRealmMemberRepository } from './infrastructure/repositories/hybrid-realm-member.repository';
import { HybridDeviceRepository } from './infrastructure/repositories/hybrid-device.repository';
import { HybridAuditLogRepository } from './infrastructure/repositories/hybrid-audit-log.repository';
import { StorageService } from './infrastructure/storage/storage.service';
import { getPrismaClient } from './infrastructure/database/prisma-client';
import { DatabaseInitializer } from './infrastructure/database/database-initializer';
import { DefaultChannelsInitializer } from './infrastructure/database/default-channels-initializer';
import { DeviceConnectionManager } from './infrastructure/websocket/device-connection-manager';
import { PresetAvatarsInitializer } from './application/services/avatar/preset-avatars-initializer';

// Application Layer Services
import { MessageService } from './application/services/message/message.service';
import { MessageCrudService } from './application/services/message/message-crud.service';
import { MessageQueryService } from './application/services/message/message-query.service';
import { MessageReactionService } from './application/services/message/message-reaction.service';
import { ChannelService } from './application/services/channel/channel.service';
import { ChannelCrudService } from './application/services/channel/channel-crud.service';
import { ChannelQueryService } from './application/services/channel/channel-query.service';
import { ChannelMemberService } from './application/services/channel/channel-member.service';
import { ChannelLifecycleService } from './application/services/channel/channel-lifecycle.service';
import { ChannelMessagingService } from './application/services/channel/channel-messaging.service';
import { DefaultChannelsAutoJoinService } from './application/services/channel/default-channels-auto-join.service';
import { RealmMemberChannelAutoJoinService } from './application/services/channel/realm-member-channel-auto-join.service';
import { AgentService } from './application/services/agent/agent.service';
import { AgentCrudService } from './application/services/agent/agent-crud.service';
import { AgentQueryService } from './application/services/agent/agent-query.service';
import { AgentConfigService } from './application/services/agent/agent-config.service';
import { AgentTaskService } from './application/services/agent/agent-task.service';
import { AgentDiscoveryService } from './application/services/agent/agent-discovery.service';
import { AgentDMService } from './application/services/agent-dm/agent-dm.service';
import { AgentDMHandler } from './infrastructure/events/handlers/agent-dm.handler';
import { AgentAvatarSyncHandler } from './infrastructure/events/handlers/agent-avatar-sync.handler';
import { MessageAgentResponseHandler } from './infrastructure/events/handlers/message-agent-response.handler';
import { AdapterService } from './application/services/adapter/adapter.service';
import {
  AdapterBootstrapService,
  CCSwithProfileDetector,
  CCSwithProfileGenerator,
  AdapterValidator,
} from './application/services/adapter';
import { ThreadService } from './application/services/thread/thread.service';
import { TaskService } from './application/services/task/task.service';
import { TaskStatusService } from './application/services/task/task-status.service';
import { TaskAssignmentService } from './application/services/task/task-assignment.service';
import { UserService } from './application/services/user/user.service';
import { ProjectService } from './application/services/project/project.service';
import { WorkflowService } from './application/services/workflow/workflow.service';
import { WorkflowCrudService } from './application/services/workflow/workflow-crud.service';
import { WorkflowQueryService } from './application/services/workflow/workflow-query.service';
import { WorkflowLifecycleService } from './application/services/workflow/workflow-lifecycle.service';
import { RealmService } from './application/services/realm/realm.service';
import { RealmPermissionService } from './application/services/realm/realm-permission.service';
import { DeviceService } from './application/services/device/device.service';
import { DeviceAuthService } from './application/services/device/device-auth.service';
import { createMessageOrchestrator } from './domain/message-orchestrator/message-orchestrator.factory';
import { AuthService } from './application/services/auth/auth.service';
import { AuditService } from './application/services/audit/audit.service';
import { AvatarService } from './application/services/avatar/avatar.service';
import { StorageService as FileStorageService } from './application/services/storage/storage.service';
import { FileSystemService } from './application/services/filesystem/filesystem.service';
import { FileSystemAdapterConfigStore } from './infrastructure/persistence/file-system-adapter-config-store';
import { FileLockManager } from './application/services/lock/file-lock-manager.service';
import { AuditLogger } from './application/services/audit/audit-logger.service';
import { FileSystemAuditLogStore } from './application/services/audit/file-system-audit-log-store';
import { RealmMemberVerificationService } from './application/services/realm/realm-member-verification.service';
import { RealmContext } from './application/context/realm-context';
import { runWithContext } from './application/context/realm-context-store';

// Interfaces
import { ILogger, LogContext, LogLevel } from './application/interfaces/index';

// tRPC
import { createAppRouter } from './infrastructure/trpc/routers';
import { createContext } from './infrastructure/trpc/context';

/**
 * 日志级别权重（数值越大越严重），用于级别过滤
 */
const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

/**
 * 解析有效日志级别
 *
 * 优先级：LOG_LEVEL 环境变量 > 开发环境默认 debug > 生产默认 info。
 * 取值非法时回退到 info。
 */
function resolveLogLevel(): LogLevel {
  const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
  if (fromEnv && fromEnv in LOG_LEVEL_WEIGHT) {
    return fromEnv as LogLevel;
  }
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
}

/** HH:MM:SS.mmm — 比完整 ISO 时间戳更易阅读 */
function shortTs(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

const ANSI = {
  reset: '\x1b[0m',
  dim:   '\x1b[2m',
  cyan:  '\x1b[36m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  red:   '\x1b[31m',
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: ANSI.cyan,
  info:  ANSI.green,
  warn:  ANSI.yellow,
  error: ANSI.red,
  fatal: ANSI.red,
};

class ConsoleLogger implements ILogger {
  private threshold: number;
  private readonly prefix: string;

  constructor(level: LogLevel = resolveLogLevel(), prefix = '') {
    this.threshold = LOG_LEVEL_WEIGHT[level];
    this.prefix = prefix;
  }

  /** 当前级别是否应输出 */
  private enabled(level: LogLevel): boolean {
    return LOG_LEVEL_WEIGHT[level] >= this.threshold;
  }

  /** 序列化上下文为单行 JSON（非空时附加到消息末尾） */
  private fmtCtx(context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) return '';
    return ' ' + JSON.stringify(context);
  }

  private emit(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.enabled(level)) return;

    const ts    = `${ANSI.dim}${shortTs()}${ANSI.reset}`;
    const color = LEVEL_COLOR[level];
    const lvl   = `${color}${level.toUpperCase().padEnd(5)}${ANSI.reset}`;
    const msg   = `${this.prefix}${message}${this.fmtCtx(context)}`;

    let line = `${ts} ${lvl} ${msg}`;

    if (error) {
      const errMsg = `${ANSI.red}${error.name}: ${error.message}${ANSI.reset}`;
      const stack  = process.env.LOG_LEVEL === 'debug' && error.stack
        ? `\n${ANSI.dim}${error.stack}${ANSI.reset}`
        : '';
      line += ` — ${errMsg}${stack}`;
    }

    if (level === 'error' || level === 'fatal') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.emit('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.emit('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.emit('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.emit('error', message, context, error);
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.emit('fatal', message, context, error);
  }

  /** 返回带 [name] 前缀的子 logger，继承当前 threshold */
  scope(name: string): ILogger {
    const child = new ConsoleLogger('debug', `[${name}] `);
    child.threshold = this.threshold;
    return child;
  }

  /** child() — 向后兼容；在上下文对象里附加 key=value 前缀 */
  child(context?: LogContext): ILogger {
    if (!context || Object.keys(context).length === 0) return this;
    const extra = Object.entries(context)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(' ');
    const child = new ConsoleLogger('debug', `${this.prefix}[${extra}] `);
    child.threshold = this.threshold;
    return child;
  }

  setLevel(level: LogLevel): void {
    this.threshold = LOG_LEVEL_WEIGHT[level];
  }
}

function initializeDependencies() {
  const logger = new ConsoleLogger();
  logger.debug('Initializing dependencies...');

  // Database + Storage
  const prisma = getPrismaClient();
  logger.debug('Prisma client initialized');

  // Use global .cove directory in user's home directory
  const coveRoot = process.env.COVE_ROOT || path.join(os.homedir(), '.cove');
  const storageService = new StorageService(coveRoot);

  // Repositories
  const messageRepository = new HybridMessageRepository(prisma, storageService, logger);
  const channelRepository = new ChannelRepository(prisma, logger);
  const agentRepository = new HybridAgentRepository(prisma, storageService, logger, coveRoot);
  const threadRepository = new HybridThreadRepository(prisma, storageService, logger);
  const taskRepository = new HybridTaskRepository(prisma, storageService, logger);
  const userRepository = new HybridUserRepository(prisma, storageService, logger);
  const projectRepository = new HybridProjectRepository(prisma, storageService, logger);
  const workflowRepository = new HybridWorkflowRepository(prisma, storageService, logger);
  const serverRepository = new RealmRepository(prisma, logger);
  const serverMemberRepository = new HybridRealmMemberRepository(prisma, storageService, logger, 'default');
  const deviceRepository = new HybridDeviceRepository(prisma, storageService, logger);
  const auditLogRepository = new HybridAuditLogRepository(prisma);

  // EventBus
  const eventBus = new InMemoryEventBus();

  // Audit Service
  const auditService = new AuditService(auditLogRepository);

  // Adapter Configuration Store and Service
  const coveDir = path.join(coveRoot);
  const lockManager = new FileLockManager();
  const auditLogStore = new FileSystemAuditLogStore(coveDir);
  const auditLogger = new AuditLogger(auditLogStore);
  const adapterConfigStore = new FileSystemAdapterConfigStore(coveDir, lockManager, auditLogger);
  const adapterService = new AdapterService(adapterConfigStore);

  // Adapter Bootstrap Service (for auto-detecting and creating adapters)
  const ccSwitchDetector = new CCSwithProfileDetector();
  const ccSwitchGenerator = new CCSwithProfileGenerator(ccSwitchDetector);
  const adapterValidator = new AdapterValidator(adapterService);
  const adapterBootstrapService = new AdapterBootstrapService(
    [ccSwitchDetector],
    [ccSwitchGenerator],
    adapterValidator,
    adapterService,
    logger
  );

  // Storage and Avatar Services
  const fileStorageService = new FileStorageService(
    {
      storageRoot: coveRoot,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },
    logger
  );
  const avatarService = new AvatarService(fileStorageService, logger);

  // FileSystem Service
  // Use storage directory as base for filesystem operations
  const fileSystemService = new FileSystemService(logger, [path.join(coveRoot, 'storage')]);

  // Services (order matters — channelMessagingService first, used by channelService)
  const channelMessagingService = new ChannelMessagingService(
    channelRepository,
    messageRepository,
    eventBus,
    logger
  );

  // Channel sub-services
  const channelCrudService = new ChannelCrudService(
    channelRepository,
    eventBus,
    logger
  );

  const defaultChannelsInitializer = new DefaultChannelsInitializer({
    prisma,
    logger,
  });

  const channelQueryService = new ChannelQueryService(
    channelRepository,
    messageRepository
  );

  const channelMemberService = new ChannelMemberService(
    channelRepository,
    eventBus,
    logger
  );

  const channelLifecycleService = new ChannelLifecycleService(
    channelRepository,
    eventBus,
    logger
  );

  const channelService = new ChannelService(
    channelCrudService,
    channelQueryService,
    channelMemberService,
    channelLifecycleService,
    channelMessagingService
  );

  // User service (needed by MessageCrudService)
  const userService = new UserService(
    userRepository,
    eventBus,
    logger,
    auditService
  );

  // Message sub-services
  const messageCrudService = new MessageCrudService(
    messageRepository,
    channelService,
    eventBus,
    logger,
    userService
  );

  const messageQueryService = new MessageQueryService(
    messageRepository,
    channelService
  );

  const messageReactionService = new MessageReactionService(
    messageRepository,
    eventBus,
    logger
  );

  const messageService = new MessageService(
    messageCrudService,
    messageQueryService,
    messageReactionService
  );

  const threadService = new ThreadService(
    threadRepository,
    messageRepository,
    logger
  );

  const taskStatusService = new TaskStatusService(
    taskRepository,
    eventBus,
    logger
  );

  const taskAssignmentService = new TaskAssignmentService(
    taskRepository,
    agentRepository,
    eventBus,
    logger
  );

  const taskService = new TaskService(
    taskRepository,
    taskStatusService,
    taskAssignmentService,
    eventBus,
    logger,
    messageRepository
  );

  // AgentResponseService removed - replaced by MessageAgentResponseHandler
  // LLM processing now handled by Local Device via MessageOrchestrator

  // Agent sub-services
  const agentCrudService = new AgentCrudService(
    agentRepository,
    eventBus,
    logger
  );

  const agentQueryService = new AgentQueryService(
    agentRepository,
    agentRepository
  );

  const agentConfigService = new AgentConfigService(
    agentRepository,
    logger,
    agentRepository
  );

  const agentTaskService = new AgentTaskService(
    agentRepository,
    taskRepository,
    eventBus,
    logger
  );

  // AgentDM Service - 处理 Agent 与 DM Channel 的关联
  const agentDMService = new AgentDMService(
    agentQueryService,
    channelCrudService,
    channelQueryService,
    logger
  );

  const agentService = new AgentService(
    agentCrudService,
    agentQueryService,
    agentConfigService,
    agentTaskService
  );

  // Agent 元数据同步服务（接收 Local Device 推送的 upsert）
  const agentDiscoveryService = new AgentDiscoveryService(prisma);

  const projectService = new ProjectService(
    projectRepository,
    agentRepository,
    channelRepository,
    eventBus,
    logger
  );

  // Workflow sub-services
  const workflowCrudService = new WorkflowCrudService(
    workflowRepository,
    taskRepository,
    eventBus,
    logger
  );

  const workflowQueryService = new WorkflowQueryService(
    workflowRepository
  );

  const workflowLifecycleService = new WorkflowLifecycleService(
    workflowRepository,
    eventBus,
    logger
  );

  const workflowService = new WorkflowService(
    workflowCrudService,
    workflowQueryService,
    workflowLifecycleService
  );

  const deviceService = new DeviceService(
    deviceRepository,
    eventBus,
    logger
  );

  const deviceAuthService = new DeviceAuthService(
    deviceRepository
  );

  // Create RealmPermissionService
  const realmPermissionService = new RealmPermissionService(
    serverMemberRepository,
    logger
  );

  const realmService = new RealmService(
    serverRepository,
    serverMemberRepository,
    realmPermissionService,
    eventBus,
    logger,
    undefined, // agentRepository (optional)
    adapterBootstrapService, // adapterBootstrapService (optional)
    deviceService, // deviceService (optional)
    deviceAuthService, // deviceAuthService (optional)
    defaultChannelsInitializer, // defaultChannelsInitializer (optional)
    channelRepository // channelRepository (optional)
  );

  const authService = new AuthService(
    userRepository,
    logger,
    auditService,
    serverRepository,
    serverMemberRepository,
    undefined, // jwtSecret（使用默认环境变量/开发默认值）
    undefined, // jwtExpiresIn
    undefined, // jwtRememberMeExpiresIn
    eventBus // 用于注册/自动入 Realm 后发布 user.created，驱动默认频道自动加入
  );

  const realmMemberVerification = new RealmMemberVerificationService(
    serverMemberRepository,
    logger
  );

  // Initialize Device Connection Manager (needed by messageOrchestrator)
  const deviceConnectionManager = new DeviceConnectionManager(logger);

  // Initialize MessageOrchestrator for routing messages to Local Device
  const messageOrchestrator = createMessageOrchestrator(
    prisma,
    deviceConnectionManager,
    messageRepository,
    {
      maxAttempts: 3,
      pollInterval: 1000
    }
  );

  /**
   * Event Lifecycle:
   * - message.created: Message entity created and persisted (human or agent)
   * - message.sent: Message delivery completed (used by agent responses)
   *
   * Subscribe to message.created to trigger agent auto-response via Local Device.
   * Skip agent messages to prevent infinite loops.
   */
  const messageAgentResponseHandler = new MessageAgentResponseHandler(
    agentRepository,
    channelRepository,
    messageRepository,
    messageOrchestrator,
    eventBus,
    logger
  );

  eventBus.subscribe('message.created', (event) => {
    messageAgentResponseHandler.handle(event).catch(err =>
      logger.error('Message agent response handler failed', err as Error)
    );
  });

  /**
   * Agent DM Auto-Creation
   *
   * Subscribe to agent.created event to automatically create DM channel
   * for the agent creator.
   */
  const agentDMHandler = new AgentDMHandler(agentDMService, logger);
  eventBus.subscribe('agent.created', (event) => {
    agentDMHandler.handle(event).catch(err =>
      logger.error('Agent DM handler failed', err as Error)
    );
  });

  /**
   * Agent Avatar Sync
   *
   * Subscribe to agent.updated event to automatically sync avatar
   * to all associated DM channels.
   */
  const agentAvatarSyncHandler = new AgentAvatarSyncHandler(
    agentRepository,
    channelQueryService,
    channelRepository,
    logger
  );
  eventBus.subscribe('agent.updated', (event) => {
    agentAvatarSyncHandler.handle(event).catch(err =>
      logger.error('Agent avatar sync handler failed', err as Error)
    );
  });

  // Initialize and start auto-join services
  const defaultChannelsAutoJoinService = new DefaultChannelsAutoJoinService(
    eventBus,
    channelRepository,
    logger
  );
  defaultChannelsAutoJoinService.start();

  const realmMemberChannelAutoJoinService = new RealmMemberChannelAutoJoinService(
    eventBus,
    channelRepository,
    logger
  );
  realmMemberChannelAutoJoinService.start();

  logger.debug('Auto-join services started');

  logger.info('⚙️  Dependencies initialized');

  // Listen to device connection events and publish to EventBus
  deviceConnectionManager.on('device.connected', ({ deviceId }) => {
    logger.info('Device connected event', { deviceId });
    eventBus.publish({
      eventId: crypto.randomUUID(),
      eventType: 'device.connected',
      aggregateId: deviceId,
      aggregateType: 'device',
      occurredAt: new Date(),
      payload: { deviceId },
    });
  });

  deviceConnectionManager.on('device.disconnected', ({ deviceId }) => {
    logger.info('Device disconnected event', { deviceId });
    eventBus.publish({
      eventId: crypto.randomUUID(),
      eventType: 'device.disconnected',
      aggregateId: deviceId,
      aggregateType: 'device',
      occurredAt: new Date(),
      payload: { deviceId },
    });
  });

  // Subscribe to device disconnection events and update database
  eventBus.subscribe('device.disconnected', async (event) => {
    const { deviceId } = event.payload;
    try {
      // Get device with realmId to set proper context
      const deviceRecord = await prisma.device.findUnique({
        where: { id: deviceId }
      });

      if (!deviceRecord) {
        logger.warn('Device not found in database', { deviceId });
        return;
      }

      const context = RealmContext.create(deviceRecord.realmId, 'system');
      await runWithContext(context, async () => {
        const device = await deviceService.getDeviceById(deviceId);
        if (device) {
          await deviceService.updateDevice(deviceId, { status: 'offline' });
          logger.info('Device status updated to offline', { deviceId });
        }
      });
    } catch (error) {
      logger.error('Failed to update device status on disconnect', error as Error, { deviceId });
    }
  });

  // Subscribe to device connection events and update database
  eventBus.subscribe('device.connected', async (event) => {
    const { deviceId } = event.payload;
    try {
      // Get device with realmId to set proper context
      const deviceRecord = await prisma.device.findUnique({
        where: { id: deviceId }
      });

      if (!deviceRecord) {
        logger.warn('Device not found in database', { deviceId });
        return;
      }

      const context = RealmContext.create(deviceRecord.realmId, 'system');
      await runWithContext(context, async () => {
        const device = await deviceService.getDeviceById(deviceId);
        if (device) {
          await deviceService.updateDevice(deviceId, { status: 'online' });
          logger.info('Device status updated to online', { deviceId });
        }
      });
    } catch (error) {
      logger.error('Failed to update device status on connect', error as Error, { deviceId });
    }
  });

  // Note: messageOrchestrator.start() will be called in startServer()

  return {
    logger,
    eventBus,
    deviceConnectionManager,
    messageOrchestrator,
    defaultChannelsAutoJoinService,
    realmMemberChannelAutoJoinService,
    // Services for tRPC
    agentService,
    agentDiscoveryService,
    agentDMService,
    adapterService,
    authService,
    realmMemberVerification,
    realmPermissionService,
    auditService,
    avatarService,
    channelService,
    messageService,
    taskService,
    threadService,
    userService,
    projectService,
    workflowService,
    realmService,
    deviceService,
    deviceAuthService,
    fileSystemService,
  };
}

function createStandaloneServer(deps: {
  logger: ILogger;
  eventBus: InMemoryEventBus;
  deviceConnectionManager: DeviceConnectionManager;
  messageOrchestrator: any;
  defaultChannelsAutoJoinService: any;
  realmMemberChannelAutoJoinService: any;
  agentService: AgentService;
  agentDiscoveryService: AgentDiscoveryService;
  agentDMService: any;
  adapterService: AdapterService;
  authService: AuthService;
  realmMemberVerification: RealmMemberVerificationService;
  realmPermissionService: RealmPermissionService;
  auditService: AuditService;
  avatarService: AvatarService;
  channelService: ChannelService;
  messageService: MessageService;
  taskService: TaskService;
  threadService: ThreadService;
  userService: UserService;
  projectService: ProjectService;
  workflowService: WorkflowService;
  realmService: RealmService;
  deviceService: DeviceService;
  deviceAuthService: DeviceAuthService;
  fileSystemService: FileSystemService;
}) {
  // Create app router
  const appRouter = createAppRouter({
    agentService: deps.agentService,
    agentDiscoveryService: deps.agentDiscoveryService,
    agentDMService: deps.agentDMService,
    adapterService: deps.adapterService,
    authService: deps.authService,
    auditService: deps.auditService,
    avatarService: deps.avatarService,
    channelService: deps.channelService,
    messageService: deps.messageService,
    taskService: deps.taskService,
    threadService: deps.threadService,
    userService: deps.userService,
    projectService: deps.projectService,
    workflowService: deps.workflowService,
    realmService: deps.realmService,
    deviceService: deps.deviceService,
    deviceAuthService: deps.deviceAuthService,
    fileSystemService: deps.fileSystemService,
    eventBus: deps.eventBus,
    deviceConnectionManager: deps.deviceConnectionManager,
    logger: deps.logger,
  });

  // Create tRPC HTTP handler
  const trpcHandler = createHTTPHandler({
    router: appRouter,
    createContext: createContext({
      logger: deps.logger,
      authService: deps.authService,
      deviceAuthService: deps.deviceAuthService,
      realmMemberVerification: deps.realmMemberVerification,
      permissionService: deps.realmPermissionService,
    }),
  });

  // Create HTTP server with custom request handler
  const httpServer = createServer(async (req, res) => {
    // Extract origin from request (outside try block so it's available in catch)
    const origin = req.headers.origin || 'http://localhost:5174';

    try {
      // Log all requests（降为 debug，避免每个 HTTP 请求刷屏）
      deps.logger.debug(`${req.method} ${req.url}`);

      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-realm-id, x-trpc-source',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        });
        res.end();
        return;
      }

      // Set CORS headers for all responses
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-realm-id, x-trpc-source');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Handle API documentation endpoint
      if (req.url?.startsWith('/docs') && req.method === 'GET') {
        if (process.env.NODE_ENV === 'production') {
          res.writeHead(404, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          });
          res.end(JSON.stringify({
            error: 'Not Found',
            message: 'Documentation is only available in development mode',
          }));
          return;
        }

        const { renderTrpcPanel } = await import('trpc-ui');
        const PORT = process.env.PORT || 3002;

        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        });
        res.end(
          renderTrpcPanel(appRouter, {
            url: `http://localhost:${PORT}/trpc`,
          })
        );
        return;
      }

      // Handle health check endpoint
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        });
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        }));
        return;
      }

      // Handle static file requests for storage
      if ((req.url?.startsWith('/storage') || req.url?.startsWith('/public')) && (req.method === 'GET' || req.method === 'HEAD')) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');

        try {
          // Remove query string if present
          const urlPath = req.url?.split('?')[0] || '/';

          // Construct file path:
          // - /storage/... -> ~/.cove/storage/...
          // - /public/... -> <backend>/public/...
          const filePath = urlPath.startsWith('/public')
            ? path.join(process.cwd(), urlPath)
            : path.join(os.homedir(), '.cove', urlPath);

          // Check if file exists
          await fs.access(filePath);

          // Determine content type based on file extension
          const ext = path.extname(filePath).toLowerCase();
          const contentTypeMap: Record<string, string> = {
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
          };
          const contentType = contentTypeMap[ext] || 'application/octet-stream';

          if (req.method === 'HEAD') {
            res.writeHead(200, {
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Credentials': 'true',
              'Cache-Control': 'public, max-age=31536000',
            });
            res.end();
            return;
          }

          // Read file for GET request
          const fileBuffer = await fs.readFile(filePath);

          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          });
          res.end(fileBuffer);
          return;
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            res.writeHead(404, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Credentials': 'true',
            });
            res.end(JSON.stringify({ error: 'File not found' }));
          } else {
            deps.logger.error('Error serving static file', error);
            res.writeHead(500, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Credentials': 'true',
            });
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
          return;
        }
      }

      // Handle tRPC requests
      if (req.url?.startsWith('/trpc')) {
        // Remove /trpc prefix for the handler
        const originalUrl = req.url;
        req.url = req.url.substring(5); // Remove '/trpc'
        trpcHandler(req, res);
        req.url = originalUrl; // Restore original URL
        return;
      }

      // 404 handler for unknown routes
      res.writeHead(404, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      });
      res.end(JSON.stringify({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
      }));

    } catch (error) {
      // Global error handler
      deps.logger.error('Unhandled server error', error as Error);

      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        });
        res.end(JSON.stringify({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }
  });

  return { httpServer, appRouter };
}

async function startServer() {
  const PORT = process.env.PORT || 3002;

  try {
    // Use global .cove directory in user's home directory
    const coveRoot = process.env.COVE_ROOT || path.join(os.homedir(), '.cove');

    // Initialize database before starting server
    const databasePath = path.join(coveRoot, 'database/cove.db');
    const migrationsPath = path.join(__dirname, '../prisma/migrations');

    // Set DATABASE_URL for Prisma Client
    process.env.DATABASE_URL = `file:${databasePath}`;

    const logger = new ConsoleLogger();

    // Get Prisma client for initialization
    const prisma = getPrismaClient();
    // Use the same coveRoot as StorageService for consistency
    const storageRoot = coveRoot;

    const dbInitializer = new DatabaseInitializer({
      databasePath,
      migrationsPath,
      logger,
      autoMigrate: process.env.AUTO_MIGRATE !== 'false', // Enable by default, disable with AUTO_MIGRATE=false
      prisma, // Pass Prisma client for built-in agents initialization
      storageRoot, // Pass storage root for agent files
    });

    await dbInitializer.initialize();

    // Initialize preset avatars
    const presetAvatarsInitializer = new PresetAvatarsInitializer({
      storageRoot: coveRoot,
      logger,
    });
    await presetAvatarsInitializer.initialize();

    // 说明：Agent 目录扫描与元数据同步已下沉到 Local Device。
    // Backend 不再于启动时扫描文件系统，改为通过 tRPC agentSync.sync 被动接收 Local 推送。

    const deps = initializeDependencies();

    // Create initial admin account if none exists
    await deps.authService.ensureInitialAdmin();

    const { httpServer, appRouter } = createStandaloneServer(deps);

    // Configure tRPC WebSocket handler
    const wss = new WSServer({ server: httpServer });

    applyWSSHandler({
      wss,
      router: appRouter,
      createContext: ({ req, res }) => {
        // Extract user info from WebSocket connection
        const url = new URL(req.url || '', `ws://localhost:${PORT}`);

        // Support both frontend (userId) and Local Agent (deviceId) connections
        const userId = url.searchParams.get('userId') || url.searchParams.get('token');
        const deviceId = url.searchParams.get('deviceId');
        const apiKey = url.searchParams.get('apiKey');
        const realmId = url.searchParams.get('realmId');
        const userType = url.searchParams.get('userType') as 'human' | 'agent' | undefined;

        // Determine if this is a Local Agent connection
        const isAgent = !!deviceId;
        const effectiveUserId = deviceId || userId;
        const effectiveUserType = isAgent ? 'agent' : (userType || 'human');

        deps.logger.info('WebSocket connection established', {
          userId: effectiveUserId,
          userType: effectiveUserType,
          ...(deviceId && { deviceId }),
          ...(realmId && { realmId })
        });

        return {
          userId: effectiveUserId || undefined,
          userType: effectiveUserType,
          deviceId: deviceId || undefined,
          apiKey: apiKey || undefined,
          realmId: realmId || undefined,
          logger: deps.logger,
          realmMemberVerification: deps.realmMemberVerification,
          permissionService: deps.realmPermissionService,
          req,
          res,
        };
      },
    });

    deps.logger.debug('tRPC WebSocket handler configured');

    // 启动消息编排器
    await deps.messageOrchestrator.start();
    deps.logger.debug('MessageOrchestrator started');

    // 启动设备离线检测
    deps.deviceService.startOfflineDetection();
    deps.logger.debug('DeviceService offline detection started');

    httpServer.listen(PORT, () => {
      deps.logger.info(`🚀 Cove Backend ready — http://localhost:${PORT}`);
      deps.logger.info(`   tRPC HTTP  : http://localhost:${PORT}/trpc`);
      deps.logger.info(`   WebSocket  : ws://localhost:${PORT}`);
      deps.logger.info(`   Health     : http://localhost:${PORT}/health`);
      deps.logger.info(`   API Docs   : http://localhost:${PORT}/docs`);
    });

    // Graceful shutdown handler
    let isShuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) {
        deps.logger.debug(`${signal} received again, already shutting down...`);
        return; // Ignore duplicate signals
      }

      isShuttingDown = true;
      deps.logger.info(`${signal} received, starting graceful shutdown...`);

      // Set a timeout to force exit if graceful shutdown takes too long
      const forceExitTimeout = setTimeout(() => {
        deps.logger.error('Graceful shutdown timed out, forcing exit...');
        process.exit(1);
      }, 5000); // 5 second timeout

      try {
        // 1. Stop background services first
        deps.logger.info('Stopping background services...');

        await Promise.all([
          deps.messageOrchestrator.stop().catch((err: Error) =>
            deps.logger.error('Failed to stop messageOrchestrator', err)
          ),
          deps.defaultChannelsAutoJoinService.stop(),
          deps.realmMemberChannelAutoJoinService.stop(),
        ]);

        // Stop DeviceService offline detection
        deps.deviceService.stopOfflineDetection();

        deps.logger.info('Background services stopped');

        // 2. Stop accepting new connections
        deps.logger.info('Closing HTTP server...');
        await new Promise<void>((resolve) => {
          httpServer.close(() => {
            deps.logger.info('HTTP server closed');
            resolve();
          });
        });

        // 3. Close WebSocket connections
        deps.logger.info('Closing WebSocket server...');
        await new Promise<void>((resolve) => {
          wss.close(() => {
            deps.logger.info('WebSocket server closed');
            resolve();
          });
        });

        // 4. Disconnect Prisma (best effort - don't block shutdown)
        deps.logger.info('Disconnecting Prisma...');

        // Fire and forget - don't block on Prisma disconnect
        getPrismaClient().$disconnect()
          .then(() => deps.logger.info('Prisma disconnected'))
          .catch((err: Error) => deps.logger.error('Prisma disconnect error', err));

        // 5. Clear the force exit timeout
        clearTimeout(forceExitTimeout);

        deps.logger.info('Graceful shutdown completed');

        // Force immediate exit - bypass event loop drain
        setImmediate(() => process.exit(0));
      } catch (error) {
        deps.logger.error('Error during graceful shutdown', error as Error);
        clearTimeout(forceExitTimeout);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
