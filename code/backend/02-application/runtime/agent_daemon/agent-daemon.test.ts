import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentDaemon } from './agent-daemon';
import { AgentService } from '../../services/agent/agent.service';

describe('AgentDaemon', () => {
  let agentDaemon: AgentDaemon;
  let mockAgentService: jest.Mocked<AgentService>;

  beforeEach(() => {
    mockAgentService = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updateHeartbeat: jest.fn(),
    } as any;
    agentDaemon = new AgentDaemon(mockAgentService);
  });

  afterEach(async () => {
    await agentDaemon.stop();
  });

  it('should start agent daemon', async () => {
    const agentId = 'agent-123';
    mockAgentService.findById.mockResolvedValue({
      id: agentId,
      name: 'TestAgent',
      status: 'idle',
    });

    await agentDaemon.start(agentId);
    expect(agentDaemon.isRunning()).toBe(true);
    expect(mockAgentService.updateStatus).toHaveBeenCalledWith(agentId, 'active');
  });

  it('should stop agent daemon', async () => {
    const agentId = 'agent-123';
    mockAgentService.findById.mockResolvedValue({
      id: agentId,
      name: 'TestAgent',
      status: 'idle',
    });

    await agentDaemon.start(agentId);
    await agentDaemon.stop();

    expect(agentDaemon.isRunning()).toBe(false);
    expect(mockAgentService.updateStatus).toHaveBeenCalledWith(agentId, 'stopped');
  });

  it('should send heartbeat periodically', async () => {
    const agentId = 'agent-123';
    mockAgentService.findById.mockResolvedValue({
      id: agentId,
      name: 'TestAgent',
      status: 'idle',
    });

    await agentDaemon.start(agentId);

    // 等待心跳发送
    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(mockAgentService.updateHeartbeat).toHaveBeenCalled();
  });

  it('should handle agent crash gracefully', async () => {
    const agentId = 'agent-123';
    mockAgentService.findById.mockResolvedValue({
      id: agentId,
      name: 'TestAgent',
      status: 'idle',
    });

    await agentDaemon.start(agentId);

    // 模拟崩溃
    agentDaemon.simulateCrash();

    expect(mockAgentService.updateStatus).toHaveBeenCalledWith(agentId, 'crashed');
  });
});
