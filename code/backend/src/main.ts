import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from 'dotenv';
import * as trpcExpress from '@trpc/server/adapters/express';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

// Infrastructure Layer
import {
  InMemoryThreadRepository,
  InMemoryTaskRepository,
  InMemoryEventBus,
  ConnectionManager,
  SubscriptionManager,
  WebSocketEventPublisher,
  WebSocketServer,
  MockAgentRuntime,
} from './infrastructure/index';

import { FileSystemAgentRepository } from './infrastructure/repositories/filesystem-agent.repository';
import { HybridChannelRepository } from './infrastructure/repositories/hybrid-channel.repository';
import { HybridMessageRepository } from './infrastructure/repositories/hybrid-message.repository';
import { HybridUserRepository } from './infrastructure/repositories/hybrid-user.repository';
import { HybridProjectRepository } from './infrastructure/repositories/hybrid-project.repository';
import { HybridWorkflowRepository } from './infrastructure/repositories/hybrid-workflow.repository';
import { CovePathResolver } from './infrastructure/storage/cove-path-resolver';
import { StorageService } from './infrastructure/storage/storage.service';
import { getPrismaClient } from './infrastructure/database/prisma-client';

// Application Layer Services
import { MessageService } from './application/services/message/message.service';
import { ChannelService } from './application/services/channel/channel.service';
import { AgentService } from './application/services/agent/agent.service';
import { AgentRuntimeService } from './application/services/agent/agent-runtime.service';
import { ThreadService } from './application/services/thread/thread.service';
import { TaskService } from './application/services/task/task.service';
import { UserService } from './application/services/user/user.service';
import { ProjectService } from './application/services/project/project.service';
import { WorkflowService } from './application/services/workflow/workflow.service';

// Interfaces
import { ILogger, LogContext } from './application/interfaces/index';

// tRPC
import { createAppRouter } from './infrastructure/trpc/routers';
import { createContext } from './infrastructure/trpc/context';

class ConsoleLogger implements ILogger {
  private level: string = 'info';

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

  child(context: LogContext): ILogger {
    return this;
  }

  setLevel(level: string): void {
    this.level = level;
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
  const agentBasePath = CovePathResolver.getAgentRoot();
  const agentRepository = new FileSystemAgentRepository(agentBasePath);
  const threadRepository = new InMemoryThreadRepository();
  const taskRepository = new InMemoryTaskRepository();
  const userRepository = new HybridUserRepository(prisma, storageService, logger);
  const projectRepository = new HybridProjectRepository(prisma, storageService, logger);
  const workflowRepository = new HybridWorkflowRepository(prisma, storageService, logger);

  // EventBus
  const eventBus = new InMemoryEventBus();

  // Agent Runtime
  const agentRuntime = new MockAgentRuntime();

  // WebSocket components
  const connectionManager = new ConnectionManager();
  const subscriptionManager = new SubscriptionManager();
  const eventPublisher = new WebSocketEventPublisher(connectionManager, subscriptionManager);

  // Services (order matters — channelService first, used by messageService)
  const channelService = new ChannelService(
    channelRepository,
    messageRepository,
    eventBus,
    logger,
    eventPublisher
  );

  const messageService = new MessageService(
    messageRepository,
    channelService,
    eventBus,
    logger,
    eventPublisher
  );

  const threadService = new ThreadService(
    threadRepository,
    messageRepository,
    eventBus,
    logger,
    eventPublisher
  );

  const taskService = new TaskService(
    taskRepository,
    agentRepository,
    eventBus,
    logger,
    messageRepository,
    eventPublisher
  );

  const agentService = new AgentService(
    agentRepository,
    taskRepository,
    messageRepository,
    channelRepository,
    agentRuntime,
    eventBus,
    logger,
    agentRepository  // as IAgentConfigStore (same instance implements both)
  );

  const agentRuntimeService = new AgentRuntimeService(
    agentRepository,
    agentRuntime,
    eventPublisher,
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

  const workflowService = new WorkflowService(
    workflowRepository,
    taskRepository,
    eventBus,
    logger
  );

  // Wire up: message.sent → agent auto-response (fire-and-forget)
  eventBus.subscribe('message.sent', (event) => {
    if (event.payload.senderType === 'agent') return;
    messageRepository.findById(event.payload.messageId as string).then(message => {
      if (message) agentService.handleIncomingMessage(message);
    }).catch(err => logger.error('Agent response trigger failed', err as Error));
  });

  logger.info('Dependencies initialized successfully');

  return {
    logger,
    connectionManager,
    subscriptionManager,
    eventBus,
    // Services for tRPC
    agentService,
    agentRuntimeService,
    channelService,
    messageService,
    taskService,
    threadService,
    userService,
    projectService,
    workflowService,
  };
}

function configureExpress(deps: {
  logger: ILogger;
  agentService: AgentService;
  agentRuntimeService: AgentRuntimeService;
  channelService: ChannelService;
  messageService: MessageService;
  taskService: TaskService;
  threadService: ThreadService;
  userService: UserService;
  projectService: ProjectService;
  workflowService: WorkflowService;
}) {
  const app = express();

  // Middleware
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    deps.logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  // tRPC HTTP Handler
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
  });
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: createContext({ logger: deps.logger }),
    })
  );

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return app;
}

async function startServer() {
  const PORT = process.env.PORT || 3001;

  try {
    const deps = initializeDependencies();

    const app = configureExpress(deps);

    const httpServer = createServer(app);

    const wsServer = new WebSocketServer(deps.connectionManager, deps.subscriptionManager);
    wsServer.start();
    deps.logger.info('WebSocket server initialized');

    httpServer.listen(PORT, () => {
      deps.logger.info(`Cove Backend Server started on http://localhost:${PORT}`);
      deps.logger.info(`WebSocket: ws://localhost:${PORT}`);
      deps.logger.info(`API Docs: http://localhost:${PORT}/docs`);
      deps.logger.info('');
      deps.logger.info('Endpoints:');
      deps.logger.info('  Messages: POST/GET /api/channels/:id/messages, GET/PUT/DELETE /api/messages/:id');
      deps.logger.info('  Threads:  POST/GET /api/messages/:id/thread/messages, GET /api/messages/:id/thread, GET /api/channels/:id/threads');
      deps.logger.info('  Channels: POST/GET /api/channels, GET/PUT/DELETE /api/channels/:id, POST/DELETE members');
      deps.logger.info('  Tasks:    POST /api/messages/:id/convert-to-task, GET /api/channels/:id/tasks, POST claim/unclaim, PUT status');
      deps.logger.info('  Agents:   CRUD + PUT runtime/persona/skills/tools/triggers + POST start/stop + GET status');
    });

    process.on('SIGTERM', () => {
      deps.logger.info('SIGTERM received, shutting down...');
      wsServer.stop();
      httpServer.close(() => process.exit(0));
    });

    process.on('SIGINT', () => {
      deps.logger.info('SIGINT received, shutting down...');
      wsServer.stop();
      httpServer.close(() => process.exit(0));
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
