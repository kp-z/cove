"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppRouter = createAppRouter;
const trpc_1 = require("../trpc");
const agent_router_1 = require("./agent.router");
const adapter_router_1 = require("./adapter.router");
const auth_router_1 = require("./auth.router");
const audit_router_1 = require("./audit.router");
const avatar_router_1 = require("./avatar.router");
const channel_router_1 = require("./channel.router");
const message_router_1 = require("./message.router");
const task_router_1 = require("./task.router");
const thread_router_1 = require("./thread.router");
const user_router_1 = require("./user.router");
const workflow_router_1 = require("./workflow.router");
const project_router_1 = require("./project.router");
const subscription_router_1 = require("./subscription.router");
const device_subscription_router_1 = require("./device-subscription.router");
const realm_router_1 = require("./realm.router");
const device_router_1 = require("./device.router");
const adapter_metadata_service_1 = require("../../../application/services/adapter/adapter-metadata.service");
function createAppRouter(deps) {
    // Initialize adapter metadata service
    const adapterMetadataService = new adapter_metadata_service_1.AdapterMetadataService();
    const appRouter = (0, trpc_1.router)({
        // Health check
        health: (0, trpc_1.router)({
            check: trpc_1.procedure.query(async () => {
                return { status: 'ok', timestamp: new Date().toISOString() };
            }),
        }),
        // Auth router
        auth: (0, auth_router_1.createAuthRouter)(deps.authService),
        // Audit router
        audit: (0, audit_router_1.createAuditRouter)(deps.auditService),
        // Avatar router
        avatar: (0, avatar_router_1.createAvatarRouter)(deps.avatarService),
        // Agent router
        agent: (0, agent_router_1.createAgentRouter)({
            agentService: deps.agentService,
            agentRuntimeService: deps.agentRuntimeService,
            adapterService: deps.adapterService,
        }),
        // Adapter router
        adapter: (0, adapter_router_1.createAdapterRouter)({
            adapterService: deps.adapterService,
            adapterMetadataService,
        }),
        // Channel router
        channel: (0, channel_router_1.channelRouter)(deps.channelService),
        // Message router
        message: (0, message_router_1.messageRouter)(deps.messageService),
        // Task router
        task: (0, task_router_1.taskRouter)(deps.taskService),
        // Thread router
        thread: (0, thread_router_1.threadRouter)(deps.threadService),
        // User router
        user: (0, user_router_1.userRouter)(deps.userService),
        // Workflow router
        workflow: (0, workflow_router_1.workflowRouter)(deps.workflowService),
        // Project router
        project: (0, project_router_1.projectRouter)(deps.projectService),
        // Realm router
        realm: (0, realm_router_1.realmRouter)(deps.realmService),
        // Device router
        device: (0, device_router_1.deviceRouter)(deps.deviceService),
        // Subscription router
        subscription: (0, subscription_router_1.createSubscriptionRouter)({
            eventBus: deps.eventBus,
        }),
        // Device subscription router (WebSocket communication with Local Devices)
        deviceSubscription: (0, device_subscription_router_1.createDeviceSubscriptionRouter)({
            eventBus: deps.eventBus,
            deviceConnectionManager: deps.deviceConnectionManager,
            logger: deps.logger,
        }),
    });
    return appRouter;
}
