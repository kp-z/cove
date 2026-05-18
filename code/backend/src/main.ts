import { createServer } from 'http';
import { config } from 'dotenv';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer as WSServer } from 'ws';
import path from 'path';
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
import { HybridChannelRepository } from './infrastructure/repositories/hybrid-channel.repository';
import { HybridMessageRepository } from './infrastructure/repositories/hybrid-message.repository';
import { HybridUserRepository } from './infrastructure/repositories/hybrid-user.repository';
import { HybridProjectRepository } from './infrastructure/repositories/hybrid-project.repository';
import { HybridWorkflowRepository } from './infrastructure/repositories/hybrid-workflow.repository';
import { StorageService } from './infrastructure/storage/storage.service';
import { getPrismaClient } from './infrastructure/database/prisma-client';
import { DatabaseInitializer } from './infrastructure/database/database-initializer';

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
import { AgentService } from './application/services/agent/agent.service';
import { AgentCrudService } from './application/services/agent/agent-crud.service';
import { AgentQueryService } from './application/services/agent/agent-query.service';
import { AgentConfigService } from './application/services/agent/agent-config.service';
import { AgentTaskService } from './application/services/agent/agent-task.service';
import { AgentResponseService } from './application/services/agent/agent-response.service';
import { AgentRuntimeService } from './application/services/agent/agent-runtime.service';
import { AdapterService } from './application/services/adapter/adapter.service';
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
import { FileSystemAdapterConfigStore } from './infrastructure/persistence/file-system-adapter-config-store';
import { FileLockManager } from './application/services/lock/file-lock-manager.service';
import { AuditLogger } from './application/services/audit/audit-logger.service';
import { FileSystemAuditLogStore } from './application/services/audit/file-system-audit-log-store';

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
  // Project root: from backend/src/ to project root (../../../)
  // backend/src/ -> backend/ -> code/ -> cove/
  const projectRoot = process.env.COVE_PROJECT_ROOT || path.resolve(__dirname, '../../../');
  const storageService = new StorageService(projectRoot);

  // Repositories
  const messageRepository = new HybridMessageRepository(prisma, storageService, logger);
  const channelRepository = new HybridChannelRepository(prisma, storageService, logger);
  const agentRepository = new HybridAgentRepository(prisma, storageService, logger, projectRoot);
  const threadRepository = new HybridThreadRepository(prisma, storageService, logger);
  const taskRepository = new HybridTaskRepository(prisma, storageService, logger);
  const userRepository = new HybridUserRepository(prisma, storageService, logger);
  const projectRepository = new HybridProjectRepository(prisma, storageService, logger);
  const workflowRepository = new HybridWorkflowRepository(prisma, storageService, logger);

  // EventBus
  const eventBus = new InMemoryEventBus();

  // Agent Runtime
  const agentRuntime = new MockAgentRuntime();

  // Adapter Configuration Store and Service
  const coveDir = path.join(projectRoot, '.cove');
  const lockManager = new FileLockManager();
  const auditLogStore = new FileSystemAuditLogStore(coveDir);
  const auditLogger = new AuditLogger(auditLogStore);
  const adapterConfigStore = new FileSystemAdapterConfigStore(coveDir, lockManager, auditLogger);
  const adapterService = new AdapterService(adapterConfigStore);

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

  // Message sub-services
  const messageCrudService = new MessageCrudService(
    messageRepository,
    channelService,
    eventBus,
    logger
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
    agentRepository
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

  const userService = new UserService(
    userRepository,
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

  /**
   * Event Lifecycle:
   * - message.created: Message entity created and persisted (human or agent)
   * - message.sent: Message delivery completed (used by agent responses)
   *
   * Subscribe to message.created to trigger agent auto-response.
   * Skip agent messages to prevent infinite loops.
   */
  eventBus.subscribe('message.created', (event) => {
    if (event.payload.senderType === 'agent') return;
    messageRepository.findById(event.payload.messageId as string).then(message => {
      if (message) agentService.handleIncomingMessage(message);
    }).catch(err => logger.error('Agent response trigger failed', err as Error));
  });

  logger.info('Dependencies initialized successfully');

  return {
    logger,
    eventBus,
    // Services for tRPC
    agentService,
    agentRuntimeService,
    adapterService,
    channelService,
    messageService,
    taskService,
    threadService,
    userService,
    projectService,
    workflowService,
  };
}

function createStandaloneServer(deps: {
  logger: ILogger;
  eventBus: InMemoryEventBus;
  agentService: AgentService;
  agentRuntimeService: AgentRuntimeService;
  adapterService: AdapterService;
  channelService: ChannelService;
  messageService: MessageService;
  taskService: TaskService;
  threadService: ThreadService;
  userService: UserService;
  projectService: ProjectService;
  workflowService: WorkflowService;
}) {
  // Create app router
  const appRouter = createAppRouter({
    agentService: deps.agentService,
    agentRuntimeService: deps.agentRuntimeService,
    channelService: deps.channelService,
    messageService: deps.messageService,
    taskService: deps.taskService,
    threadService: deps.threadService,
    userService: deps.userService,
    projectService: deps.projectService,
    workflowService: deps.workflowService,
    eventBus: deps.eventBus,
  });

  // Create tRPC HTTP handler
  const trpcHandler = createHTTPHandler({
    router: appRouter,
    createContext: createContext({ logger: deps.logger }),
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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-trpc-source',
          'Access-Control-Max-Age': '86400',
        });
        res.end();
        return;
      }

      // Set CORS headers for all responses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-trpc-source');

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
        const PORT = process.env.PORT || 3001;

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
  const PORT = process.env.PORT || 3001;

  try {
    // Initialize database before starting server
    const projectRoot = process.env.COVE_PROJECT_ROOT || path.resolve(__dirname, '../../../');
    const databasePath = path.join(projectRoot, '.cove/database/cove.db');
    const migrationsPath = path.join(__dirname, '../prisma/migrations');

    const logger = new ConsoleLogger();
    const dbInitializer = new DatabaseInitializer({
      databasePath,
      migrationsPath,
      logger,
      autoMigrate: process.env.AUTO_MIGRATE !== 'false', // Enable by default, disable with AUTO_MIGRATE=false
    });

    await dbInitializer.initialize();

    const deps = initializeDependencies();

    const { httpServer, appRouter } = createStandaloneServer(deps);

    // Configure tRPC WebSocket handler
    const wss = new WSServer({ server: httpServer });

    applyWSSHandler({
      wss,
      router: appRouter,
      createContext: ({ req, res }) => {
        // Extract user info from WebSocket connection
        const url = new URL(req.url || '', `ws://localhost:${PORT}`);
        const userId = url.searchParams.get('userId') || url.searchParams.get('token');
        const userType = url.searchParams.get('userType') as 'human' | 'agent' | undefined;

        deps.logger.info('WebSocket connection established', { userId, userType });

        return {
          userId: userId || undefined,
          userType: userType || 'human',
          logger: deps.logger,
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
