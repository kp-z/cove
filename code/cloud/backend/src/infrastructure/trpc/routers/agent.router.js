"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentRouter = createAgentRouter;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
// Zod schemas for input validation
const createAgentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    displayName: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    scope: zod_1.z.enum(['built-in', 'user', 'project', 'admin']).optional(),
    projectIds: zod_1.z.array(zod_1.z.string()).optional(),
    capabilities: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    createdBy: zod_1.z.string().optional(),
});
const updateAgentSchema = zod_1.z.object({
    // Basic info
    displayName: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    scope: zod_1.z.enum(['built-in', 'user', 'project', 'admin']).optional(),
    projectIds: zod_1.z.array(zod_1.z.string()).optional(),
    capabilities: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    // Runtime config
    model: zod_1.z.string().optional(),
    temperature: zod_1.z.number().optional(),
    maxTokens: zod_1.z.number().optional(),
    systemPrompt: zod_1.z.string().optional(),
    // Persona
    personaName: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    tone: zod_1.z.string().optional(),
    instructions: zod_1.z.string().optional(),
    // Skills & Tools
    skillIds: zod_1.z.array(zod_1.z.string()).optional(),
    toolIds: zod_1.z.array(zod_1.z.string()).optional(),
    // Triggers
    onMention: zod_1.z.boolean().optional(),
    onDirectMessage: zod_1.z.boolean().optional(),
    onSchedule: zod_1.z.string().optional(),
    customRules: zod_1.z.array(zod_1.z.string()).optional(),
});
function createAgentRouter(deps) {
    return (0, trpc_1.router)({
        // List all agents
        list: trpc_1.procedure.query(async () => {
            try {
                const agents = await deps.agentService.getAllAgents();
                return {
                    agents: agents.map(a => a.toJSON()),
                    total: agents.length,
                };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Get agent by ID
        getById: trpc_1.procedure
            .input(zod_1.z.object({ agentId: zod_1.z.string() }))
            .query(async ({ input }) => {
            try {
                const detail = await deps.agentService.getAgentDetail(input.agentId);
                return detail;
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Create agent
        create: trpc_1.procedure
            .input(createAgentSchema)
            .mutation(async ({ input }) => {
            try {
                const dto = {
                    name: input.name,
                    displayName: input.displayName ?? input.name,
                    description: input.description,
                    scope: input.scope,
                    projectIds: input.projectIds,
                    capabilities: input.capabilities,
                    tags: input.tags,
                    createdBy: input.createdBy ?? 'system',
                };
                const agent = await deps.agentService.createAgent(dto);
                return agent.toJSON();
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Update agent (unified endpoint for all updates)
        update: trpc_1.procedure
            .input(zod_1.z.object({
            agentId: zod_1.z.string(),
            data: updateAgentSchema,
        }))
            .mutation(async ({ input }) => {
            try {
                const agent = await deps.agentService.updateAgent(input.agentId, input.data);
                return agent.toJSON();
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Start agent
        start: trpc_1.procedure
            .input(zod_1.z.object({ agentId: zod_1.z.string() }))
            .mutation(async ({ input }) => {
            try {
                await deps.agentRuntimeService.startAgent(input.agentId);
                return { message: 'Agent start initiated' };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Stop agent
        stop: trpc_1.procedure
            .input(zod_1.z.object({ agentId: zod_1.z.string() }))
            .mutation(async ({ input }) => {
            try {
                await deps.agentRuntimeService.stopAgent(input.agentId);
                return { message: 'Agent stop initiated' };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Get agent status
        getStatus: trpc_1.procedure
            .input(zod_1.z.object({ agentId: zod_1.z.string() }))
            .query(async ({ input }) => {
            try {
                const status = await deps.agentRuntimeService.getStatus(input.agentId);
                return status;
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Delete agent
        delete: trpc_1.procedure
            .input(zod_1.z.object({ agentId: zod_1.z.string() }))
            .mutation(async ({ input }) => {
            try {
                await deps.agentService.deleteAgent(input.agentId);
                return { message: 'Agent deleted successfully' };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Switch agent's adapter configuration
        switchAdapter: trpc_1.procedure
            .input(zod_1.z.object({
            agentId: zod_1.z.string(),
            adapterId: zod_1.z.string(),
        }))
            .mutation(async ({ input, ctx }) => {
            try {
                if (!deps.adapterService) {
                    throw new Error('AdapterService not available');
                }
                const actorId = ctx.userId || 'system';
                // Verify adapter exists
                await deps.adapterService.getById(input.adapterId, actorId);
                // Update agent's runtime config to use the new adapter
                await deps.agentService.updateRuntimeConfig(input.agentId, {
                    adapter_id: input.adapterId,
                });
                const agent = await deps.agentService.getAgentById(input.agentId);
                return {
                    message: 'Adapter switched successfully',
                    agent: agent.toJSON(),
                };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Update agent's adapter configuration
        updateAdapter: trpc_1.procedure
            .input(zod_1.z.object({
            agentId: zod_1.z.string(),
            adapterUpdates: zod_1.z.object({
                name: zod_1.z.string().optional(),
                description: zod_1.z.string().optional(),
                config: zod_1.z.any().optional(),
            }),
        }))
            .mutation(async ({ input, ctx }) => {
            try {
                if (!deps.adapterService) {
                    throw new Error('AdapterService not available');
                }
                const actorId = ctx.userId || 'system';
                // Get agent's current adapter
                const agent = await deps.agentService.getAgentById(input.agentId);
                const runtimeConfig = agent.runtimeConfig;
                if (!runtimeConfig?.adapter_id) {
                    throw new Error('Agent does not have an adapter configured');
                }
                // Update the adapter configuration
                const updatedAdapter = await deps.adapterService.update(runtimeConfig.adapter_id, input.adapterUpdates, actorId);
                return {
                    message: 'Adapter updated successfully',
                    adapter: updatedAdapter,
                };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Fork (duplicate) an adapter for this agent
        forkAdapter: trpc_1.procedure
            .input(zod_1.z.object({
            agentId: zod_1.z.string(),
            sourceAdapterId: zod_1.z.string(),
            newAdapterName: zod_1.z.string().optional(),
        }))
            .mutation(async ({ input, ctx }) => {
            try {
                if (!deps.adapterService) {
                    throw new Error('AdapterService not available');
                }
                const actorId = ctx.userId || 'system';
                // Get the source adapter
                const sourceAdapter = await deps.adapterService.getById(input.sourceAdapterId, actorId);
                if (!sourceAdapter) {
                    throw new Error('Source adapter not found');
                }
                // Create a new private adapter with the same configuration
                const agent = await deps.agentService.getAgentById(input.agentId);
                const newAdapterName = input.newAdapterName || `${agent.name}-adapter-fork`;
                const newAdapter = await deps.adapterService.create({
                    name: newAdapterName,
                    description: `Forked from ${sourceAdapter.name}`,
                    scope: 'private',
                    owner_id: agent.agentId,
                    type: sourceAdapter.type,
                    config: sourceAdapter.config,
                }, actorId);
                // Update agent to use the new adapter
                await deps.agentService.updateRuntimeConfig(input.agentId, {
                    adapter_id: newAdapter.id,
                });
                const updatedAgent = await deps.agentService.getAgentById(input.agentId);
                return {
                    message: 'Adapter forked successfully',
                    adapter: newAdapter,
                    agent: updatedAgent.toJSON(),
                };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Get agent's current adapter configuration
        getAdapter: trpc_1.procedure
            .input(zod_1.z.object({ agentId: zod_1.z.string() }))
            .query(async ({ input, ctx }) => {
            try {
                if (!deps.adapterService) {
                    throw new Error('AdapterService not available');
                }
                const actorId = ctx.userId || 'system';
                const agent = await deps.agentService.getAgentById(input.agentId);
                const runtimeConfig = agent.runtimeConfig;
                if (!runtimeConfig?.adapter_id) {
                    return {
                        hasAdapter: false,
                        message: 'Agent uses legacy inline configuration',
                    };
                }
                const adapter = await deps.adapterService.getById(runtimeConfig.adapter_id, actorId);
                return {
                    hasAdapter: true,
                    adapter,
                };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
    });
}
