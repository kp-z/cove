import { z } from 'zod';
import { router, procedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import type { AgentService } from '../../../application/services/agent/agent.service';
import type { AgentRuntimeService } from '../../../application/services/agent/agent-runtime.service';

// Zod schemas for input validation
const createAgentSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
});

const updateRuntimeSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
});

const updatePersonaSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  tone: z.string().optional(),
  instructions: z.string().optional(),
});

const updateSkillsSchema = z.object({
  skillIds: z.array(z.string()),
});

const updateToolsSchema = z.object({
  toolIds: z.array(z.string()),
});

const updateTriggersSchema = z.object({
  onMention: z.boolean().optional(),
  onDirectMessage: z.boolean().optional(),
  onSchedule: z.string().optional(),
  customRules: z.array(z.string()).optional(),
});

interface AgentRouterDeps {
  agentService: AgentService;
  agentRuntimeService: AgentRuntimeService;
}

// Error handler
function handleServiceError(error: any): never {
  if (error.name === 'AgentNotFoundError') {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: error.message,
    });
  }
  if (error.name === 'AgentNotAvailableError' || error.name === 'AgentNotReadyError') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    });
  }
  if (error.name === 'AgentInUseError' || error.message?.includes('already')) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: error.message,
    });
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error.message || 'An unexpected error occurred',
  });
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
        handleServiceError(error);
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
          handleServiceError(error);
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
            capabilities: input.capabilities,
            tags: input.tags,
            createdBy: input.createdBy ?? 'system',
          };
          const agent = await deps.agentService.createAgent(dto);
          return agent.toJSON();
        } catch (error) {
          handleServiceError(error);
        }
      }),

    // Update runtime config
    updateRuntime: procedure
      .input(
        z.object({
          agentId: z.string(),
          config: updateRuntimeSchema,
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await deps.agentService.updateRuntimeConfig(
            input.agentId,
            input.config
          );
          const data =
            result && typeof result === 'object' && 'toJSON' in result
              ? (result as any).toJSON()
              : result;
          return data;
        } catch (error) {
          handleServiceError(error);
        }
      }),

    // Update persona
    updatePersona: procedure
      .input(
        z.object({
          agentId: z.string(),
          persona: updatePersonaSchema,
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await deps.agentService.updatePersona(
            input.agentId,
            input.persona
          );
          const data =
            result && typeof result === 'object' && 'toJSON' in result
              ? (result as any).toJSON()
              : result;
          return data;
        } catch (error) {
          handleServiceError(error);
        }
      }),

    // Update skills
    updateSkills: procedure
      .input(
        z.object({
          agentId: z.string(),
          skills: updateSkillsSchema,
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await deps.agentService.updateSkills(
            input.agentId,
            input.skills
          );
          const data =
            result && typeof result === 'object' && 'toJSON' in result
              ? (result as any).toJSON()
              : result;
          return data;
        } catch (error) {
          handleServiceError(error);
        }
      }),

    // Update tools
    updateTools: procedure
      .input(
        z.object({
          agentId: z.string(),
          tools: updateToolsSchema,
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await deps.agentService.updateTools(
            input.agentId,
            input.tools
          );
          const data =
            result && typeof result === 'object' && 'toJSON' in result
              ? (result as any).toJSON()
              : result;
          return data;
        } catch (error) {
          handleServiceError(error);
        }
      }),

    // Update triggers
    updateTriggers: procedure
      .input(
        z.object({
          agentId: z.string(),
          triggers: updateTriggersSchema,
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await deps.agentService.updateTriggers(
            input.agentId,
            input.triggers
          );
          const data =
            result && typeof result === 'object' && 'toJSON' in result
              ? (result as any).toJSON()
              : result;
          return data;
        } catch (error) {
          handleServiceError(error);
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
          handleServiceError(error);
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
          handleServiceError(error);
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
          handleServiceError(error);
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
          handleServiceError(error);
        }
      }),
  });
}
