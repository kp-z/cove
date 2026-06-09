import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import type { AgentService } from '../../../application/services/agent/agent.service';
import { mapErrorToTRPC } from '../../../common/errors';
import { RealmContext } from '../../../application/context/realm-context';
import { runWithContext } from '../../../application/context/realm-context-store';

// Zod schemas for input validation
const createAgentSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  scope: z.enum(['built-in', 'user', 'project', 'admin']).optional(),
  projectIds: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  repositoryPath: z.string().optional(),
  createdBy: z.string().optional(),
  runtimeConfig: z.object({
    adapter_id: z.string().optional(),
    overrides: z.any().optional(),
  }).optional(),
  persona: z.any().optional(),
});

const updateAgentSchema = z.object({
  // Basic info
  displayName: z.string().optional(),
  description: z.string().optional(),
  scope: z.enum(['built-in', 'user', 'project', 'admin']).optional(),
  projectIds: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  repositoryPath: z.string().optional(),

  // Runtime config (legacy individual fields)
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),

  // Runtime config (new adapter-based config)
  runtimeConfig: z.object({
    adapter_id: z.string().optional(),
    overrides: z.any().optional(),
  }).optional(),

  // Persona
  personaName: z.string().optional(),
  role: z.string().optional(),
  tone: z.string().optional(),
  instructions: z.string().optional(),

  // Skills & Tools
  skillIds: z.array(z.string()).optional(),
  toolIds: z.array(z.string()).optional(),

  // Triggers
  onMention: z.boolean().optional(),
  onDirectMessage: z.boolean().optional(),
  onSchedule: z.string().optional(),
  customRules: z.array(z.string()).optional(),
});

interface AgentRouterDeps {
  agentService: AgentService;
  adapterService?: any; // AdapterService for adapter operations
}

export function createAgentRouter(deps: AgentRouterDeps) {
  return router({
    // List all agents
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        const context = RealmContext.create(ctx.realmId!, ctx.userId!);
        return await runWithContext(context, async () => {
          const agents = await deps.agentService.getAllAgents();
          return {
            agents: agents.map(a => a.toJSON()),
            total: agents.length,
          };
        });
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

    // Get agent by ID
    getById: protectedProcedure
      .input(z.object({ agentId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId!, ctx.userId!);
          return await runWithContext(context, async () => {
            const detail = await deps.agentService.getAgentDetail(input.agentId);
            return detail;
          });
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Create agent
    create: protectedProcedure
      .input(createAgentSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId!, ctx.userId!);
          return await runWithContext(context, async () => {
            // Set default avatar if not provided
            let persona = input.persona;
            if (persona && !persona.avatar) {
              persona = {
                ...persona,
                avatar: {
                  url: `https://api.dicebear.com/9.x/bottts/svg?seed=${input.name}`,
                  type: 'dicebear'
                }
              };
            }

            const dto = {
              name: input.name,
              displayName: input.displayName ?? input.name,
              description: input.description,
              scope: input.scope,
              projectIds: input.projectIds,
              capabilities: input.capabilities,
              tags: input.tags,
              repositoryPath: input.repositoryPath,
              createdBy: input.createdBy ?? 'system',
              runtimeConfig: input.runtimeConfig,
              persona: persona,
            };
            const agent = await deps.agentService.createAgent(dto);
            return agent.toJSON();
          });
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Update agent (unified endpoint for all updates)
    update: protectedProcedure
      .input(
        z.object({
          agentId: z.string(),
          data: updateAgentSchema,
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId!, ctx.userId!);
          return await runWithContext(context, async () => {
            const agent = await deps.agentService.updateAgent(
              input.agentId,
              input.data
            );
            return agent.toJSON();
          });
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 说明：Agent 的 start/stop/getStatus 已移除。
    // Agent 运行时（真实执行）位于 Local Device，云端不再维护内存态运行状态。

    // Delete agent
    delete: protectedProcedure
      .input(z.object({ agentId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId!, ctx.userId!);
          return await runWithContext(context, async () => {
            await deps.agentService.deleteAgent(input.agentId);
            return { message: 'Agent deleted successfully' };
          });
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Switch agent's adapter configuration
    switchAdapter: protectedProcedure
      .input(
        z.object({
          agentId: z.string(),
          adapterId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId!, ctx.userId!);
          return await runWithContext(context, async () => {
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
          });
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Update agent's adapter configuration
    updateAdapter: protectedProcedure
      .input(
        z.object({
          agentId: z.string(),
          adapterUpdates: z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            config: z.any().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId!, ctx.userId!);
          return await runWithContext(context, async () => {
            if (!deps.adapterService) {
              throw new Error('AdapterService not available');
            }

            const actorId = ctx.userId || 'system';

            // Get agent's current adapter
            const agent = await deps.agentService.getAgentById(input.agentId);
            const runtimeConfig = agent.runtimeConfig as any;

            if (!runtimeConfig?.adapter_id) {
              throw new Error('Agent does not have an adapter configured');
            }

            // Update the adapter configuration
            const updatedAdapter = await deps.adapterService.update(
              runtimeConfig.adapter_id,
              input.adapterUpdates,
              actorId
            );

            return {
              message: 'Adapter updated successfully',
              adapter: updatedAdapter,
            };
          });
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Fork (duplicate) an adapter for this agent
    forkAdapter: protectedProcedure
      .input(
        z.object({
          agentId: z.string(),
          sourceAdapterId: z.string(),
          newAdapterName: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId!, ctx.userId!);
          return await runWithContext(context, async () => {
            if (!deps.adapterService) {
              throw new Error('AdapterService not available');
            }

            const actorId = ctx.userId || 'system';

            // Get the source adapter
            const sourceAdapter = await deps.adapterService.getById(
              input.sourceAdapterId,
              actorId
            );

            if (!sourceAdapter) {
              throw new Error('Source adapter not found');
            }

            // Create a new private adapter with the same configuration
            const agent = await deps.agentService.getAgentById(input.agentId);
            const newAdapterName =
              input.newAdapterName || `${agent.name}-adapter-fork`;

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
          });
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Get agent's current adapter configuration
    getAdapter: protectedProcedure
      .input(z.object({ agentId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId!, ctx.userId!);
          return await runWithContext(context, async () => {
            if (!deps.adapterService) {
              throw new Error('AdapterService not available');
            }

            const actorId = ctx.userId || 'system';

            const agent = await deps.agentService.getAgentById(input.agentId);
            const runtimeConfig = agent.runtimeConfig as any;

            if (!runtimeConfig?.adapter_id) {
              return {
                hasAdapter: false,
                message: 'Agent uses legacy inline configuration',
              };
            }

            const adapter = await deps.adapterService.getById(
              runtimeConfig.adapter_id,
              actorId
            );

            return {
              hasAdapter: true,
              adapter,
            };
          });
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
}
