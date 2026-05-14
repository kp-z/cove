import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentRuntimeService, AgentNotReadyError } from './agent-runtime.service';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { AgentNotFoundError } from './agent.errors';
import {
  IAgentRepository,
  IEventBus,
  ILogger,
  IRuntimeAdapter,
} from '../../interfaces';

describe('AgentRuntimeService', () => {
  let service: AgentRuntimeService;
  let mockAgentRepository: IAgentRepository;
  let mockRuntimeAdapter: IRuntimeAdapter;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockAgentRepository = {
      findById: vi.fn(),
    } as unknown as IAgentRepository;

    mockRuntimeAdapter = {
      startAgent: vi.fn(),
      stopAgent: vi.fn(),
      getRuntimeStatus: vi.fn(),
    } as unknown as IRuntimeAdapter;

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    service = new AgentRuntimeService(
      mockAgentRepository,
      mockRuntimeAdapter,
      mockEventBus,
      mockLogger
    );
  });

  describe('startAgent', () => {
    it('should start agent successfully', async () => {
      const agent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'Test Agent',
        type: 'assistant',
        category: 'engineering',
        model: 'gpt-4',
        systemPrompt: 'Test',
        status: 'active',
        runtimeConfig: { timeout: 30000 },
        createdAt: new Date(),
      });

      vi.spyOn(agent, 'canBeStarted').mockReturnValue(true);
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(agent);

      await service.startAgent('agent-1');

      expect(mockRuntimeAdapter.startAgent).toHaveBeenCalledWith('agent-1', { timeout: 30000 });
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'agent_status_changed',
          payload: expect.objectContaining({
            agentId: 'agent-1',
            status: 'running',
          }),
        })
      );
    });

    it('should throw AgentNotFoundError when agent not found', async () => {
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(null);

      await expect(service.startAgent('nonexistent')).rejects.toThrow(
        AgentNotFoundError
      );
    });

    it('should throw AgentNotReadyError when agent cannot be started', async () => {
      const agent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'Test Agent',
        type: 'assistant',
        category: 'engineering',
        model: 'gpt-4',
        systemPrompt: 'Test',
        status: 'active',
        createdAt: new Date(),
      });

      vi.spyOn(agent, 'canBeStarted').mockReturnValue(false);
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(agent);

      await expect(service.startAgent('agent-1')).rejects.toThrow(
        AgentNotReadyError
      );
    });
  });

  describe('stopAgent', () => {
    it('should stop agent successfully', async () => {
      const agent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'Test Agent',
        type: 'assistant',
        category: 'engineering',
        model: 'gpt-4',
        systemPrompt: 'Test',
        status: 'active',
        createdAt: new Date(),
      });

      vi.mocked(mockAgentRepository.findById).mockResolvedValue(agent);

      await service.stopAgent('agent-1');

      expect(mockRuntimeAdapter.stopAgent).toHaveBeenCalledWith('agent-1');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'agent_status_changed',
          payload: expect.objectContaining({
            agentId: 'agent-1',
            status: 'stopped',
          }),
        })
      );
    });

    it('should throw AgentNotFoundError when agent not found', async () => {
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(null);

      await expect(service.stopAgent('nonexistent')).rejects.toThrow(
        AgentNotFoundError
      );
    });
  });

  describe('getStatus', () => {
    it('should return agent runtime status', async () => {
      vi.mocked(mockRuntimeAdapter.getRuntimeStatus).mockResolvedValue('running');

      const result = await service.getStatus('agent-1');

      expect(result).toEqual({ status: 'running' });
      expect(mockRuntimeAdapter.getRuntimeStatus).toHaveBeenCalledWith('agent-1');
    });
  });
});
