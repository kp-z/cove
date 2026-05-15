import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { createAgentRouter } from './agent.router';
import { AgentService } from '../../../application/services/agent/agent.service';
import { AgentRuntimeService } from '../../../application/services/agent/agent-runtime.service';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { AgentNotFoundError, AgentAlreadyExistsError } from '../../../application/services/agent/agent.errors';

describe('agentRouter', () => {
  let mockAgentService: AgentService;
  let mockAgentRuntimeService: AgentRuntimeService;
  let router: ReturnType<typeof createAgentRouter>;
  let mockContext: any;

  beforeEach(() => {
    mockAgentService = {
      createAgent: vi.fn(),
      getAllAgents: vi.fn(),
      getAgentDetail: vi.fn(),
      updateRuntimeConfig: vi.fn(),
      updatePersona: vi.fn(),
      updateSkills: vi.fn(),
      updateTools: vi.fn(),
      updateTriggers: vi.fn(),
      deleteAgent: vi.fn(),
    } as unknown as AgentService;

    mockAgentRuntimeService = {
      startAgent: vi.fn(),
      stopAgent: vi.fn(),
      getStatus: vi.fn(),
    } as unknown as AgentRuntimeService;

    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      req: {} as IncomingMessage,
      res: {
        setHeader: vi.fn(),
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse,
    };

    router = createAgentRouter({
      agentService: mockAgentService,
      agentRuntimeService: mockAgentRuntimeService,
    });
  });

  describe('list', () => {
    it('should list all agents', async () => {
      const agents = [
        AgentEntity.create({
          agentId: 'agent-1',
          name: 'Agent 1',
          displayName: 'Agent One',
          status: 'idle',
          category: 'engineering',
          createdAt: new Date(),
        }),
        AgentEntity.create({
          agentId: 'agent-2',
          name: 'Agent 2',
          displayName: 'Agent Two',
          status: 'active',
          category: 'operations',
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockAgentService.getAllAgents).mockResolvedValue(agents);

      const caller = router.createCaller(mockContext);
      const result = await caller.list();

      expect(result.agents).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getById', () => {
    it('should get agent detail by id', async () => {
      const agentDetail = {
        agent: AgentEntity.create({
          agentId: 'agent-1',
          name: 'Test Agent',
          displayName: 'Test Agent',
          status: 'idle',
          category: 'engineering',
          createdAt: new Date(),
        }).toJSON(),
        runtime: { model: 'gpt-4', temperature: 0.7 },
        persona: { name: 'Assistant', role: 'helper' },
      };

      vi.mocked(mockAgentService.getAgentDetail).mockResolvedValue(agentDetail);

      const caller = router.createCaller(mockContext);
      const result = await caller.getById({ agentId: 'agent-1' });

      expect(result).toEqual(agentDetail);
      expect(mockAgentService.getAgentDetail).toHaveBeenCalledWith('agent-1');
    });

    it('should throw NOT_FOUND when agent not found', async () => {
      const error = new AgentNotFoundError('agent-1');
      error.name = 'AgentNotFoundError';
      vi.mocked(mockAgentService.getAgentDetail).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.getById({ agentId: 'nonexistent' })
      ).rejects.toThrow('Agent not found');
    });
  });

  describe('create', () => {
    it('should create agent successfully', async () => {
      const agent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'new-agent',
        displayName: 'New Agent',
        status: 'idle',
        category: 'engineering',
        createdAt: new Date(),
      });

      vi.mocked(mockAgentService.createAgent).mockResolvedValue(agent);

      const caller = router.createCaller(mockContext);
      const result = await caller.create({
        name: 'new-agent',
        displayName: 'New Agent',
        description: 'Test agent',
      });

      expect(result).toHaveProperty('agent_id', 'agent-1');
      expect(result).toHaveProperty('name', 'new-agent');
    });

    it('should throw CONFLICT when agent already exists', async () => {
      const error = new AgentAlreadyExistsError('agent-1');
      error.name = 'AgentInUseError';
      vi.mocked(mockAgentService.createAgent).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.create({
          name: 'existing-agent',
        })
      ).rejects.toThrow('Agent already exists');
    });
  });

  describe('updateRuntime', () => {
    it('should update runtime config successfully', async () => {
      const updatedConfig = { model: 'gpt-4', temperature: 0.8 };
      vi.mocked(mockAgentService.updateRuntimeConfig).mockResolvedValue(updatedConfig);

      const caller = router.createCaller(mockContext);
      const result = await caller.updateRuntime({
        agentId: 'agent-1',
        config: { model: 'gpt-4', temperature: 0.8 },
      });

      expect(result).toEqual(updatedConfig);
    });

    it('should throw NOT_FOUND when agent not found', async () => {
      const error = new AgentNotFoundError('agent-1');
      error.name = 'AgentNotFoundError';
      vi.mocked(mockAgentService.updateRuntimeConfig).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.updateRuntime({
          agentId: 'nonexistent',
          config: { model: 'gpt-4' },
        })
      ).rejects.toThrow('Agent not found');
    });
  });

  describe('updatePersona', () => {
    it('should update persona successfully', async () => {
      const updatedPersona = { name: 'Helper', role: 'assistant' };
      vi.mocked(mockAgentService.updatePersona).mockResolvedValue(updatedPersona);

      const caller = router.createCaller(mockContext);
      const result = await caller.updatePersona({
        agentId: 'agent-1',
        persona: { name: 'Helper', role: 'assistant' },
      });

      expect(result).toEqual(updatedPersona);
    });
  });

  describe('updateSkills', () => {
    it('should update skills successfully', async () => {
      const updatedSkills = { skillIds: ['skill-1', 'skill-2'] };
      vi.mocked(mockAgentService.updateSkills).mockResolvedValue(updatedSkills);

      const caller = router.createCaller(mockContext);
      const result = await caller.updateSkills({
        agentId: 'agent-1',
        skills: { skillIds: ['skill-1', 'skill-2'] },
      });

      expect(result).toEqual(updatedSkills);
    });
  });

  describe('updateTools', () => {
    it('should update tools successfully', async () => {
      const updatedTools = { toolIds: ['tool-1', 'tool-2'] };
      vi.mocked(mockAgentService.updateTools).mockResolvedValue(updatedTools);

      const caller = router.createCaller(mockContext);
      const result = await caller.updateTools({
        agentId: 'agent-1',
        tools: { toolIds: ['tool-1', 'tool-2'] },
      });

      expect(result).toEqual(updatedTools);
    });
  });

  describe('updateTriggers', () => {
    it('should update triggers successfully', async () => {
      const updatedTriggers = { onMention: true, onDirectMessage: false };
      vi.mocked(mockAgentService.updateTriggers).mockResolvedValue(updatedTriggers);

      const caller = router.createCaller(mockContext);
      const result = await caller.updateTriggers({
        agentId: 'agent-1',
        triggers: { onMention: true, onDirectMessage: false },
      });

      expect(result).toEqual(updatedTriggers);
    });
  });

  describe('start', () => {
    it('should start agent successfully', async () => {
      vi.mocked(mockAgentRuntimeService.startAgent).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.start({ agentId: 'agent-1' });

      expect(result).toEqual({ message: 'Agent start initiated' });
      expect(mockAgentRuntimeService.startAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should throw BAD_REQUEST when agent not ready', async () => {
      const error = new Error('Agent not ready');
      error.name = 'AgentNotReadyError';
      vi.mocked(mockAgentRuntimeService.startAgent).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.start({ agentId: 'agent-1' })
      ).rejects.toThrow('Agent not ready');
    });
  });

  describe('stop', () => {
    it('should stop agent successfully', async () => {
      vi.mocked(mockAgentRuntimeService.stopAgent).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.stop({ agentId: 'agent-1' });

      expect(result).toEqual({ message: 'Agent stop initiated' });
      expect(mockAgentRuntimeService.stopAgent).toHaveBeenCalledWith('agent-1');
    });
  });

  describe('getStatus', () => {
    it('should get agent status successfully', async () => {
      const status = { agentId: 'agent-1', status: 'active', uptime: 3600 };
      vi.mocked(mockAgentRuntimeService.getStatus).mockResolvedValue(status);

      const caller = router.createCaller(mockContext);
      const result = await caller.getStatus({ agentId: 'agent-1' });

      expect(result).toEqual(status);
    });
  });

  describe('delete', () => {
    it('should delete agent successfully', async () => {
      vi.mocked(mockAgentService.deleteAgent).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.delete({ agentId: 'agent-1' });

      expect(result).toEqual({ message: 'Agent deleted successfully' });
      expect(mockAgentService.deleteAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should throw NOT_FOUND when agent not found', async () => {
      const error = new AgentNotFoundError('agent-1');
      error.name = 'AgentNotFoundError';
      vi.mocked(mockAgentService.deleteAgent).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.delete({ agentId: 'nonexistent' })
      ).rejects.toThrow('Agent not found');
    });
  });
});
