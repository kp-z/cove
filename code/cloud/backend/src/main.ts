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
  MockAgentRuntime,
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
import { AgentResponseService } from './application/services/agent/agent-response.service';
import { AgentRuntimeService } from './application/services/agent/agent-runtime.service';
import { AgentDiscoveryService } from './application/services/agent/agent-discovery.service';
import { AgentDMService } from './application/services/agent-dm/agent-dm.service';
import { AgentDMHandler } from './infrastructure/events/handlers/agent-dm.handler';
import { AgentAvatarSyncHandler } from './infrastructure/events/handlers/agent-avatar-sync.handler';
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

// Interfaces
import { ILogger, LogContext, LogLevel } from './application/interfaces/index';

// tRPC
import { createAppRouter } from './infrastructure/trpc/routers';
import { createContext } from './infrastructure/trpc/context';

class ConsoleLogger implements ILogger {
  debug(message: string, context?: LogContext): void {
    console.log(`[DEBUG] ${message}`, context || '');
  }

  info(message: string, context?: LogContext): void {
    console.log(`[INFO] ${message}`, context || '');
  }

  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');
  }

  error(message: string, error?: Error, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, error, context || '');
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    console.error(`[FATAL] ${message}`, error, context || '');
  }

  child(): ILogger {
    return this;
  }

  setLevel(_level: LogLevel): void {
    // Console logger doesn't support dynamic level changes
  }
}

function initializeDependencies() {
  const logger = new ConsoleLogger();
  logger.info('Initializing dependencies...');

  // Database + Storage
  const prisma = getPrismaClient();
  logger.info('Prisma client initialized', { hasPrisma: !!prisma });

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

  // Agent Runtime
  const agentRuntime = new MockAgentRuntime();

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

  const agentResponseService = new AgentResponseService(
    agentRepository,
    messageRepository,
    channelRepository,
    eventBus,
    logger,
    agentRepository, // configStore (IAgentConfigStore)
    adapterService   // adapterService (AdapterService) - CRITICAL for adapter support
  );

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
    agentTaskService,
    agentResponseService
  );

  const agentRuntimeService = new AgentRuntimeService(
    agentRepository,
    agentRuntime,
    eventBus,
    logger
  );

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
    serverMemberRepository
  );

  const realmMemberVerification = new RealmMemberVerificationService(
    serverMemberRepository,
    logger
  );

  /**
   * Event Lifecycle:
   * - message.created: Message entity created and persisted (human or agent)
   * - message.sent: Message delivery completed (used by agent responses)
   *
   * Subscribe to message.created to trigger agent auto-response via Local Device.
   * Skip agent messages to prevent infinite loops.
   */
  eventBus.subscribe('message.created', async (event) => {
    if (event.payload.senderType === 'agent') return;

    const realmId = (event.payload as any).realmId;
    const channelId = (event.payload as any).channelId;
    const messageId = event.payload.messageId as string;

    if (!realmId || !channelId) {
      logger.warn('message.created event missing realmId or channelId', { messageId });
      return;
    }

    try {
      // 1. Get the full message content from database
      const message = await messageRepository.findById(messageId, realmId);
      if (!message) {
        logger.warn('Message not found in database', { messageId });
        return;
      }

      // 2. Check if agent should respond
      const channel = await channelRepository.findById(channelId, realmId);
      if (!channel || channel.agentPool.length === 0) return;

      // Check if this is a DM channel with an agent
      const isDM = channel.type === 'dm';
      if (!isDM) return; // Only auto-respond in DM channels for now

      // 3. Get Agent information
      const agentId = channel.agentPool[0];
      const agent = await agentRepository.findById(agentId, realmId);
      if (!agent) {
        logger.warn('Agent not found', { agentId });
        return;
      }

      const agentName = agent.displayName || agent.name || 'Agent';

      // 4. 【立即发布接收确认事件】
      await eventBus.publish({
        eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        eventType: 'agent.response.accepted',
        aggregateId: messageId,
        aggregateType: 'Message',
        occurredAt: new Date(),
        payload: {
          messageId,
          channelId,
          agentId,
          agentName,
          estimatedDuration: 10, // 预估 10 秒
        },
      });

      logger.info('Agent response accepted', { messageId, agentId, agentName });

      // 5. 异步入队处理（不阻塞）
      messageOrchestrator.enqueue({
        messageId,
        channelId: `${realmId}:${channelId}`,
        content: message.content,
        priority: 0
      }).catch(err => {
        logger.error('Failed to enqueue message', err as Error, { messageId });
      });

    } catch (err) {
      logger.error('Failed to handle message.created', err as Error, { messageId });
    }
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

  logger.info('Auto-join services started successfully');

  logger.info('Dependencies initialized successfully');

  // Initialize Device Connection Manager
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

  return {
    logger,
    eventBus,
    deviceConnectionManager,
    messageOrchestrator,
    // Services for tRPC
    agentService,
    agentRuntimeService,
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
  agentService: AgentService;
  agentRuntimeService: AgentRuntimeService;
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
    agentRuntimeService: deps.agentRuntimeService,
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
    try {
      // Log all requests
      deps.logger.info(`${req.method} ${req.url}`);

      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-realm-id, x-trpc-source',
          'Access-Control-Max-Age': '86400',
        });
        res.end();
        return;
      }

      // Set CORS headers for all responses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-realm-id, x-trpc-source');

      // Handle API documentation endpoint
      if (req.url?.startsWith('/docs') && req.method === 'GET') {
        if (process.env.NODE_ENV === 'production') {
          res.writeHead(404, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        }));
        return;
      }

      // Handle static file requests for storage
      if (req.url?.startsWith('/storage') && (req.method === 'GET' || req.method === 'HEAD')) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');

        try {
          // Remove query string if present
          const urlPath = req.url?.split('?')[0] || '/';
          // Construct file path: /storage/... -> ~/.cove/storage/...
          const filePath = path.join(os.homedir(), '.cove', urlPath);

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
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=31536000',
            });
            res.end();
            return;
          }

          // Read file for GET request
          const fileBuffer = await fs.readFile(filePath);

          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          });
          res.end(fileBuffer);
          return;
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            res.writeHead(404, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ error: 'File not found' }));
          } else {
            deps.logger.error('Error serving static file', error);
            res.writeHead(500, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
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
        'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
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

    // Discover and sync agents from filesystem
    logger.info('Starting agent discovery and sync...');
    const agentDiscoveryService = new AgentDiscoveryService(prisma);
    await agentDiscoveryService.discoverAndSyncAgents();
    logger.info('Agent discovery and sync completed');

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

    deps.logger.info('tRPC WebSocket handler configured');

    httpServer.listen(PORT, () => {
      deps.logger.info(`Cove Backend Server started on http://localhost:${PORT}`);
      deps.logger.info(`WebSocket: ws://localhost:${PORT}`);
      deps.logger.info('');
      deps.logger.info('Endpoints:');
      deps.logger.info(`  tRPC HTTP: http://localhost:${PORT}/trpc`);
      deps.logger.info(`  tRPC WebSocket: ws://localhost:${PORT}`);
      deps.logger.info(`  Health: http://localhost:${PORT}/health`);
      deps.logger.info(`  API Docs: http://localhost:${PORT}/docs`);
    });

    process.on('SIGTERM', () => {
      deps.logger.info('SIGTERM received, shutting down...');
      wss.close();
      httpServer.close(() => process.exit(0));
    });

    process.on('SIGINT', () => {
      deps.logger.info('SIGINT received, shutting down...');
      wss.close();
      httpServer.close(() => process.exit(0));
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
