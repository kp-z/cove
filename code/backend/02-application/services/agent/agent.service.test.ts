import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentService } from './agent.service';
import { AgentRepository } from '../../../03-infrastructure/database/repositories/agent.repository';

describe('AgentService', () => {
  let agentService: AgentService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByStatus: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as any;
    agentService = new AgentService(mockRepository);
  });

  it('should register a new agent', async () => {
    const agentData = {
      name: 'WorkerAgent',
      type: 'worker',
      capabilities: ['typescript', 'testing'],
    };

    mockRepository.create.mockResolvedValue({
      id: 'agent-123',
      ...agentData,
      status: 'idle',
      createdAt: new Date(),
    });

    const agent = await agentService.registerAgent(agentData);
    expect(agent.id).toBe('agent-123');
    expect(agent.status).toBe('idle');
  });

  it('should find available agents', async () => {
    mockRepository.findByStatus.mockResolvedValue([
      { id: 'agent-1', name: 'Agent1', status: 'idle' },
      { id: 'agent-2', name: 'Agent2', status: 'idle' },
    ]);

    const agents = await agentService.findAvailableAgents();
    expect(agents).toHaveLength(2);
    expect(mockRepository.findByStatus).toHaveBeenCalledWith('idle');
  });

  it('should update agent status', async () => {
    const agentId = 'agent-123';
    mockRepository.findById.mockResolvedValue({
      id: agentId,
      name: 'TestAgent',
      status: 'idle',
      createdAt: new Date(),
    });

    await agentService.updateStatus(agentId, 'busy');
    expect(mockRepository.update).toHaveBeenCalled();
  });
});
