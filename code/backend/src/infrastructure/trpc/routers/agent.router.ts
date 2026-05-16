import { z } from 'zod';
import { router, procedure } from '../trpc';
import type { AgentService } from '../../../application/services/agent/agent.service';
import type { AgentRuntimeService } from '../../../application/services/agent/agent-runtime.service';
import { mapErrorToTRPC } from '../../../common/errors';

// Zod schemas for input validation
const createAgentSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  scope: z.enum(['built-in', 'user', 'project', 'admin']).optional(),
  projectIds: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
});

const updateAgentSchema = z.object({
  // Basic info
  displayName: z.string().optional(),
  description: z.string().optional(),
  scope: z.enum(['built-in', 'user', 'project', 'admin']).optional(),
  projectIds: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),

  // Runtime config
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),

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
  agentRuntimeService: AgentRuntimeService;
}

export function createAgentRouter(deps: AgentRouterDeps) {
  return router({
    // List all agents
    list: procedure.query(async () => {
      try {
        const agents = await deps.agentService.getAllAgents();
        return {
          agents: agents.map(a => a.toJSON()),
          total: agents.length,
        };
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

    // Get agent by ID
    getById: procedure
      .input(z.object({ agentId: z.string() }))
      .query(async ({ input }) => {
        try {
          const detail = await deps.agentService.getAgentDetail(input.agentId);
          return detail;
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Create agent
    create: procedure
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
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Update agent (unified endpoint for all updates)
    update: procedure
      .input(
        z.object({
          agentId: z.string(),
          data: updateAgentSchema,
        })
      )
      .mutation(async ({ input }) => {
        try {
          const agent = await deps.agentService.updateAgent(
            input.agentId,
            input.data
          );
          return agent.toJSON();
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Start agent
    start: procedure
      .input(z.object({ agentId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          await deps.agentRuntimeService.startAgent(input.agentId);
          return { message: 'Agent start initiated' };
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Stop agent
    stop: procedure
      .input(z.object({ agentId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          await deps.agentRuntimeService.stopAgent(input.agentId);
          return { message: 'Agent stop initiated' };
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Get agent status
    getStatus: procedure
      .input(z.object({ agentId: z.string() }))
      .query(async ({ input }) => {
        try {
          const status = await deps.agentRuntimeService.getStatus(input.agentId);
          return status;
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Delete agent
    delete: procedure
      .input(z.object({ agentId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          await deps.agentService.deleteAgent(input.agentId);
          return { message: 'Agent deleted successfully' };
        } catch (error) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
}
