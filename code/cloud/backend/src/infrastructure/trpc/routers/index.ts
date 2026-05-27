import { router, procedure } from '../trpc';
import { createAgentRouter } from './agent.router';
import { createAdapterRouter } from './adapter.router';
import { createAuthRouter } from './auth.router';
import { createAuditRouter } from './audit.router';
import { createAvatarRouter } from './avatar.router';
import { channelRouter } from './channel.router';
import { messageRouter } from './message.router';
import { taskRouter } from './task.router';
import { threadRouter } from './thread.router';
import { userRouter } from './user.router';
import { workflowRouter } from './workflow.router';
import { projectRouter } from './project.router';
import { createSubscriptionRouter } from './subscription.router';
import { createDeviceSubscriptionRouter } from './device-subscription.router';
import { realmRouter } from './realm.router';
import { deviceRouter } from './device.router';
import { createFileSystemRouter } from './filesystem.router';
import type { AgentService } from '../../../application/services/agent/agent.service';
import type { AgentRuntimeService } from '../../../application/services/agent/agent-runtime.service';
import type { AdapterService } from '../../../application/services/adapter/adapter.service';
import { AdapterMetadataService } from '../../../application/services/adapter/adapter-metadata.service';
import type { AuthService } from '../../../application/services/auth/auth.service';
import type { AuditService } from '../../../application/services/audit/audit.service';
import type { AvatarService } from '../../../application/services/avatar/avatar.service';
import type { ChannelService } from '../../../application/services/channel/channel.service';
import type { MessageService } from '../../../application/services/message/message.service';
import type { TaskService } from '../../../application/services/task/task.service';
import type { ThreadService } from '../../../application/services/thread/thread.service';
import type { UserService } from '../../../application/services/user/user.service';
import type { WorkflowService } from '../../../application/services/workflow/workflow.service';
import type { ProjectService } from '../../../application/services/project/project.service';
import type { RealmService } from '../../../application/services/realm/realm.service';
import type { DeviceService } from '../../../application/services/device/device.service';
import type { DeviceAuthService } from '../../../application/services/device/device-auth.service';
import type { FileSystemService } from '../../../application/services/filesystem/filesystem.service';
import type { IEventBus } from '../../../application/interfaces/event-bus.interface';
import type { DeviceConnectionManager } from '../../websocket/device-connection-manager';
import type { ILogger } from '../../../application/interfaces/logger.interface';

export interface RouterDependencies {
  agentService: AgentService;
  agentRuntimeService: AgentRuntimeService;
  adapterService: AdapterService;
  authService: AuthService;
  auditService: AuditService;
  avatarService: AvatarService;
  channelService: ChannelService;
  messageService: MessageService;
  taskService: TaskService;
  threadService: ThreadService;
  userService: UserService;
  workflowService: WorkflowService;
  projectService: ProjectService;
  realmService: RealmService;
  deviceService: DeviceService;
  deviceAuthService: DeviceAuthService;
  fileSystemService: FileSystemService;
  eventBus: IEventBus;
  deviceConnectionManager: DeviceConnectionManager;
  logger: ILogger;
}

export function createAppRouter(deps: RouterDependencies): ReturnType<typeof router> {
  // Initialize adapter metadata service
  const adapterMetadataService = new AdapterMetadataService();

  const appRouter = router({
    // Health check
    health: router({
      check: procedure.query(async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
      }),
    }),

    // Auth router
    auth: createAuthRouter(deps.authService),

    // Audit router
    audit: createAuditRouter(deps.auditService),

    // Avatar router
    avatar: createAvatarRouter(deps.avatarService, deps.userService, deps.agentService),

    // Agent router
    agent: createAgentRouter({
      agentService: deps.agentService,
      agentRuntimeService: deps.agentRuntimeService,
      adapterService: deps.adapterService,
    }),

    // Adapter router
    adapter: createAdapterRouter({
      adapterService: deps.adapterService,
      adapterMetadataService,
    }),

    // Channel router
    channel: channelRouter(deps.channelService),

    // Message router
    message: messageRouter(deps.messageService),

    // Task router
    task: taskRouter(deps.taskService),

    // Thread router
    thread: threadRouter(deps.threadService),

    // User router
    user: userRouter(deps.userService),

    // Workflow router
    workflow: workflowRouter(deps.workflowService),

    // Project router
    project: projectRouter(deps.projectService),

    // Realm router
    realm: realmRouter(deps.realmService),

    // Device router
    device: deviceRouter(deps.deviceService, deps.deviceAuthService),

    // FileSystem router
    filesystem: createFileSystemRouter(deps.fileSystemService),

    // Subscription router
    subscription: createSubscriptionRouter({
      eventBus: deps.eventBus,
    }),

    // Device subscription router (WebSocket communication with Local Devices)
    deviceSubscription: createDeviceSubscriptionRouter({
      eventBus: deps.eventBus,
      deviceConnectionManager: deps.deviceConnectionManager,
      logger: deps.logger,
    }),
  });

  return appRouter;
}

export type AppRouter = ReturnType<typeof createAppRouter>;
