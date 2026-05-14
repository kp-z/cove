import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from 'dotenv';
import * as trpcExpress from '@trpc/server/adapters/express';
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

// Application Layer Services
import { MessageService } from './application/services/message/message.service';
import { ChannelService } from './application/services/channel/channel.service';
import { ChannelMessagingService } from './application/services/channel/channel-messaging.service';
import { AgentService } from './application/services/agent/agent.service';
import { AgentResponseService } from './application/services/agent/agent-response.service';
import { AgentRuntimeService } from './application/services/agent/agent-runtime.service';
import { ThreadService } from './application/services/thread/thread.service';
import { TaskService } from './application/services/task/task.service';
import { TaskStatusService } from './application/services/task/task-status.service';
import { TaskAssignmentService } from './application/services/task/task-assignment.service';
import { UserService } from './application/services/user/user.service';
import { ProjectService } from './application/services/project/project.service';
import { WorkflowService } from './application/services/workflow/workflow.service';

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

  // Services (order matters — channelMessagingService first, used by channelService)
  const channelMessagingService = new ChannelMessagingService(
    channelRepository,
    messageRepository,
    eventBus,
    logger
  );

  const channelService = new ChannelService(
    channelRepository,
    messageRepository,
    channelMessagingService,
    eventBus,
    logger
  );

  const messageService = new MessageService(
    messageRepository,
    channelService,
    eventBus,
    logger
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
    agentRepository  // as IAgentConfigStore (same instance implements both)
  );

  const agentService = new AgentService(
    agentRepository,
    taskRepository,
    agentResponseService,
    eventBus,
    logger,
    agentRepository  // as IAgentConfigStore (same instance implements both)
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
  eventBus: InMemoryEventBus;
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

  app.use((req: Request, _res: Response, next: NextFunction) => {
    deps.logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
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
    eventBus: deps.eventBus,
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
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return { app, appRouter };
}

async function startServer() {
  const PORT = process.env.PORT || 3001;

  try {
    const deps = initializeDependencies();

    const { app, appRouter } = configureExpress(deps);

    const httpServer = createServer(app);

    // 配置 tRPC WebSocket 处理器
    const wss = new WSServer({ server: httpServer });

    applyWSSHandler({
      wss,
      router: appRouter,
      createContext: ({ req }) => {
        // 从 WebSocket 连接中提取用户信息
        const url = new URL(req.url || '', `ws://localhost:${PORT}`);
        const userId = url.searchParams.get('userId') || url.searchParams.get('token');
        const userType = url.searchParams.get('userType') as 'human' | 'agent' | undefined;

        deps.logger.info('WebSocket connection established', { userId, userType });

        return {
          userId: userId || undefined,
          userType: userType || 'human',
          logger: deps.logger,
        };
      },
    });

    deps.logger.info('tRPC WebSocket handler configured');

    httpServer.listen(PORT, () => {
      deps.logger.info(`Cove Backend Server started on http://localhost:${PORT}`);
      deps.logger.info(`WebSocket: ws://localhost:${PORT}`);
      deps.logger.info(`API Docs: http://localhost:${PORT}/docs`);
      deps.logger.info('');
      deps.logger.info('Endpoints:');
      deps.logger.info('  tRPC HTTP: http://localhost:${PORT}/trpc');
      deps.logger.info('  tRPC WebSocket: ws://localhost:${PORT}');
      deps.logger.info('  Health: http://localhost:${PORT}/health');
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
