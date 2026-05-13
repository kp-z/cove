import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from 'dotenv';
import { apiReference } from '@scalar/express-api-reference';
import { openApiSpec } from './openapi.js';

config();

// Infrastructure Layer
import {
  InMemoryThreadRepository,
  InMemoryTaskRepository,
  InMemoryEventBus,
  MessagesController,
  ChannelsController,
  ThreadsController,
  TasksController,
  AgentsController,
  ConnectionManager,
  SubscriptionManager,
  WebSocketEventPublisher,
  WebSocketServer,
  MockAgentRuntime,
} from '../03-infrastructure/index.js';

import { FileSystemAgentRepository } from '../03-infrastructure/repositories/filesystem-agent.repository.js';
import { HybridChannelRepository } from '../03-infrastructure/repositories/hybrid-channel.repository.js';
import { HybridMessageRepository } from '../03-infrastructure/repositories/hybrid-message.repository.js';
import { CovePathResolver } from '../03-infrastructure/storage/cove-path-resolver.js';
import { StorageService } from '../03-infrastructure/storage/storage.service.js';
import { getPrismaClient } from '../03-infrastructure/database/prisma-client.js';

// Application Layer Services
import { MessageService } from '../02-application/services/message/message.service.js';
import { ChannelService } from '../02-application/services/channel/channel.service.js';
import { AgentService } from '../02-application/services/agent/agent.service.js';
import { AgentRuntimeService } from '../02-application/services/agent/agent-runtime.service.js';
import { ThreadService } from '../02-application/services/thread/thread.service.js';
import { TaskService } from '../02-application/services/task/task.service.js';

// Interfaces
import { ILogger, LogContext } from '../02-application/interfaces/index.js';

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
  const projectRoot = process.cwd();
  const storageService = new StorageService(projectRoot);

  // Repositories
  const messageRepository = new HybridMessageRepository(prisma, storageService, logger);
  const channelRepository = new HybridChannelRepository(prisma, storageService, logger);
  const agentBasePath = CovePathResolver.getAgentRoot();
  const agentRepository = new FileSystemAgentRepository(agentBasePath);
  const threadRepository = new InMemoryThreadRepository();
  const taskRepository = new InMemoryTaskRepository();

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

  // Controllers
  const messagesController = new MessagesController(messageService);
  const channelsController = new ChannelsController(channelService);
  const threadsController = new ThreadsController(threadService);
  const tasksController = new TasksController(taskService);
  const agentsController = new AgentsController(agentService, agentRuntimeService);

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
    messagesController,
    channelsController,
    threadsController,
    tasksController,
    agentsController,
  };
}

function configureExpress(deps: {
  messagesController: MessagesController;
  channelsController: ChannelsController;
  threadsController: ThreadsController;
  tasksController: TasksController;
  agentsController: AgentsController;
  logger: ILogger;
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

  // --- Message routes ---
  app.post('/api/channels/:channelId/messages', (req, res) => deps.messagesController.sendMessage(req as any, res as any));
  app.get('/api/channels/:channelId/messages', (req, res) => deps.messagesController.getMessages(req as any, res as any));
  app.get('/api/messages/:messageId', (req, res) => deps.messagesController.getMessage(req as any, res as any));
  app.put('/api/messages/:messageId', (req, res) => deps.messagesController.updateMessage(req as any, res as any));
  app.delete('/api/messages/:messageId', (req, res) => deps.messagesController.deleteMessage(req as any, res as any));
  app.post('/api/messages/:messageId/reactions', (req, res) => deps.messagesController.addReaction(req as any, res as any));
  app.delete('/api/messages/:messageId/reactions', (req, res) => deps.messagesController.removeReaction(req as any, res as any));

  // --- Thread routes ---
  app.post('/api/messages/:messageId/thread/messages', (req, res) => deps.threadsController.replyInThread(req as any, res as any));
  app.get('/api/messages/:messageId/thread/messages', (req, res) => deps.threadsController.getThreadMessages(req as any, res as any));
  app.get('/api/messages/:messageId/thread', (req, res) => deps.threadsController.getThreadMetadata(req as any, res as any));
  app.get('/api/channels/:channelId/threads', (req, res) => deps.threadsController.listChannelThreads(req as any, res as any));

  // --- Channel routes ---
  app.post('/api/channels', (req, res) => deps.channelsController.createChannel(req as any, res as any));
  app.get('/api/channels', (req, res) => deps.channelsController.getChannels(req as any, res as any));
  app.get('/api/channels/:channelId', (req, res) => deps.channelsController.getChannelById(req as any, res as any));
  app.put('/api/channels/:channelId', (req, res) => deps.channelsController.updateChannel(req as any, res as any));
  app.delete('/api/channels/:channelId', (req, res) => deps.channelsController.deleteChannel(req as any, res as any));
  app.post('/api/channels/:channelId/members', (req, res) => deps.channelsController.addMember(req as any, res as any));
  app.delete('/api/channels/:channelId/members/:memberId', (req, res) => deps.channelsController.removeMember(req as any, res as any));

  // --- Task routes ---
  app.post('/api/messages/:messageId/convert-to-task', (req, res) => deps.tasksController.convertMessageToTask(req as any, res as any));
  app.get('/api/channels/:channelId/tasks', (req, res) => deps.tasksController.getChannelTasks(req as any, res as any));
  app.post('/api/tasks/:taskId/claim', (req, res) => deps.tasksController.claimTask(req as any, res as any));
  app.post('/api/tasks/:taskId/unclaim', (req, res) => deps.tasksController.unclaimTask(req as any, res as any));
  app.put('/api/tasks/:taskId/status', (req, res) => deps.tasksController.updateTaskStatus(req as any, res as any));

  // --- Agent routes ---
  app.post('/api/agents', (req, res) => deps.agentsController.createAgent(req as any, res as any));
  app.get('/api/agents', (req, res) => deps.agentsController.getAllAgents(req as any, res as any));
  app.get('/api/agents/:agentId', (req, res) => deps.agentsController.getAgent(req as any, res as any));
  app.put('/api/agents/:agentId/runtime', (req, res) => deps.agentsController.updateRuntime(req as any, res as any));
  app.put('/api/agents/:agentId/persona', (req, res) => deps.agentsController.updatePersona(req as any, res as any));
  app.put('/api/agents/:agentId/skills', (req, res) => deps.agentsController.updateSkills(req as any, res as any));
  app.put('/api/agents/:agentId/tools', (req, res) => deps.agentsController.updateTools(req as any, res as any));
  app.put('/api/agents/:agentId/triggers', (req, res) => deps.agentsController.updateTriggers(req as any, res as any));
  app.post('/api/agents/:agentId/start', (req, res) => deps.agentsController.startAgent(req as any, res as any));
  app.post('/api/agents/:agentId/stop', (req, res) => deps.agentsController.stopAgent(req as any, res as any));
  app.get('/api/agents/:agentId/status', (req, res) => deps.agentsController.getStatus(req as any, res as any));
  app.delete('/api/agents/:agentId', (req, res) => deps.agentsController.deleteAgent(req as any, res as any));

  // OpenAPI Spec + Scalar API Reference
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  app.use('/docs', apiReference({ url: '/openapi.json', theme: 'saturn' }));

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
