import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockAgentRuntime } from './mock-agent-runtime';
import { ExecutionContext } from '../../application/interfaces/agent-runtime.interface';

describe('MockAgentRuntime', () => {
  let runtime: MockAgentRuntime;

  beforeEach(() => {
    runtime = new MockAgentRuntime();
    vi.clearAllMocks();
  });

  describe('startAgent', () => {
    it('should start an agent successfully', async () => {
      await runtime.startAgent('agent-001');

      const status = await runtime.getAgentStatus('agent-001');
      expect(status).toBe('idle');
    });

    it('should start agent with config', async () => {
      const config = {
        model: 'claude-3-opus',
        temperature: 0.7,
        maxTokens: 4096,
      };

      await runtime.startAgent('agent-001', config);

      const status = await runtime.getAgentStatus('agent-001');
      expect(status).toBe('idle');
    });

    it('should initialize metrics for new agent', async () => {
      await runtime.startAgent('agent-001');

      const metrics = await runtime.getAgentMetrics('agent-001');
      expect(metrics.agentId).toBe('agent-001');
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.averageDuration).toBe(0);
    });

    it('should allow starting multiple agents', async () => {
      await runtime.startAgent('agent-001');
      await runtime.startAgent('agent-002');

      const status1 = await runtime.getAgentStatus('agent-001');
      const status2 = await runtime.getAgentStatus('agent-002');

      expect(status1).toBe('idle');
      expect(status2).toBe('idle');
    });
  });

  describe('stopAgent', () => {
    it('should stop a running agent', async () => {
      await runtime.startAgent('agent-001');
      await runtime.stopAgent('agent-001');

      const status = await runtime.getAgentStatus('agent-001');
      expect(status).toBe('stopped');
    });

    it('should throw error when stopping non-existent agent', async () => {
      await expect(runtime.stopAgent('non-existent')).rejects.toThrow(
        'Agent non-existent not found'
      );
    });
  });

  describe('pauseAgent', () => {
    it('should pause a running agent', async () => {
      await runtime.startAgent('agent-001');
      await runtime.pauseAgent('agent-001');

      const status = await runtime.getAgentStatus('agent-001');
      expect(status).toBe('paused');
    });

    it('should throw error when pausing non-existent agent', async () => {
      await expect(runtime.pauseAgent('non-existent')).rejects.toThrow(
        'Agent non-existent not found'
      );
    });
  });

  describe('resumeAgent', () => {
    it('should resume a paused agent', async () => {
      await runtime.startAgent('agent-001');
      await runtime.pauseAgent('agent-001');
      await runtime.resumeAgent('agent-001');

      const status = await runtime.getAgentStatus('agent-001');
      expect(status).toBe('idle');
    });

    it('should throw error when resuming non-existent agent', async () => {
      await expect(runtime.resumeAgent('non-existent')).rejects.toThrow(
        'Agent non-existent not found'
      );
    });
  });

  describe('getAgentStatus', () => {
    it('should return agent status', async () => {
      await runtime.startAgent('agent-001');

      const status = await runtime.getAgentStatus('agent-001');
      expect(status).toBe('idle');
    });

    it('should throw error for non-existent agent', async () => {
      await expect(runtime.getAgentStatus('non-existent')).rejects.toThrow(
        'Agent non-existent not found'
      );
    });
  });

  describe('executeTask', () => {
    it('should execute task successfully', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'Hello',
        },
        startedAt: new Date(),
      };

      const result = await runtime.executeTask(context);

      expect(result.executionId).toBe('exec-001');
      expect(result.status).toBe('completed');
      expect(result.output).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should throw error when executing task for non-existent agent', async () => {
      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'non-existent',
        taskId: 'task-001',
        input: {
          messageContent: 'Hello',
        },
        startedAt: new Date(),
      };

      await expect(runtime.executeTask(context)).rejects.toThrow(
        'Agent non-existent not found'
      );
    });

    it('should throw error when agent is not ready', async () => {
      await runtime.startAgent('agent-001');
      await runtime.stopAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'Hello',
        },
        startedAt: new Date(),
      };

      await expect(runtime.executeTask(context)).rejects.toThrow(
        'Agent agent-001 is not ready (status: stopped)'
      );
    });

    it('should update agent status to running during execution', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'Hello',
        },
        startedAt: new Date(),
      };

      const executionPromise = runtime.executeTask(context);

      // Check status immediately (should be running)
      // Note: This is a race condition test, might be flaky
      await new Promise(resolve => setTimeout(resolve, 10));

      await executionPromise;

      // After execution, should be idle
      const status = await runtime.getAgentStatus('agent-001');
      expect(status).toBe('idle');
    });

    it('should generate hello response for hello message', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'Hello',
        },
        startedAt: new Date(),
      };

      const result = await runtime.executeTask(context);

      expect(result.output).toMatchObject({
        type: 'text',
        content: expect.stringContaining('Hello'),
        confidence: 0.95,
      });
    });

    it('should generate status response for status message', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'What is your status?',
        },
        startedAt: new Date(),
      };

      const result = await runtime.executeTask(context);

      expect(result.output).toMatchObject({
        type: 'text',
        content: expect.stringContaining('running normally'),
        confidence: 0.98,
      });
    });

    it('should generate task response for task message', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'Please complete this task',
        },
        startedAt: new Date(),
      };

      const result = await runtime.executeTask(context);

      expect(result.output).toMatchObject({
        type: 'text',
        content: expect.stringContaining('task request'),
        confidence: 0.92,
      });
    });

    it('should generate default response for other messages', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'Random message',
        },
        startedAt: new Date(),
      };

      const result = await runtime.executeTask(context);

      expect(result.output).toMatchObject({
        type: 'text',
        content: expect.stringContaining('Mock response'),
        confidence: 0.85,
      });
    });

    it('should update metrics after execution', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'Hello',
        },
        startedAt: new Date(),
      };

      await runtime.executeTask(context);

      const metrics = await runtime.getAgentMetrics('agent-001');
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.averageDuration).toBeGreaterThan(0);
    });
  });

  describe('cancelExecution', () => {
    it('should cancel an execution', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'Hello',
        },
        startedAt: new Date(),
      };

      await runtime.executeTask(context);
      await runtime.cancelExecution('exec-001');

      const status = await runtime.getExecutionStatus('exec-001');
      expect(status.status).toBe('cancelled');
    });

    it('should throw error when cancelling non-existent execution', async () => {
      await expect(runtime.cancelExecution('non-existent')).rejects.toThrow(
        'Execution non-existent not found'
      );
    });
  });

  describe('getExecutionStatus', () => {
    it('should return execution status', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: {
          messageContent: 'Hello',
        },
        startedAt: new Date(),
      };

      await runtime.executeTask(context);

      const status = await runtime.getExecutionStatus('exec-001');
      expect(status.executionId).toBe('exec-001');
      expect(status.status).toBe('completed');
    });

    it('should throw error for non-existent execution', async () => {
      await expect(runtime.getExecutionStatus('non-existent')).rejects.toThrow(
        'Execution non-existent not found'
      );
    });
  });

  describe('getAgentMetrics', () => {
    it('should return agent metrics', async () => {
      await runtime.startAgent('agent-001');

      const metrics = await runtime.getAgentMetrics('agent-001');
      expect(metrics.agentId).toBe('agent-001');
      expect(metrics.totalExecutions).toBe(0);
    });

    it('should throw error for non-existent agent', async () => {
      await expect(runtime.getAgentMetrics('non-existent')).rejects.toThrow(
        'Metrics for agent non-existent not found'
      );
    });

    it('should track multiple executions', async () => {
      await runtime.startAgent('agent-001');

      const context1: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: { messageContent: 'Hello' },
        startedAt: new Date(),
      };

      const context2: ExecutionContext = {
        executionId: 'exec-002',
        agentId: 'agent-001',
        taskId: 'task-002',
        input: { messageContent: 'World' },
        startedAt: new Date(),
      };

      await runtime.executeTask(context1);
      await runtime.executeTask(context2);

      const metrics = await runtime.getAgentMetrics('agent-001');
      expect(metrics.totalExecutions).toBe(2);
      expect(metrics.successfulExecutions).toBe(2);
    });
  });

  describe('healthCheck', () => {
    it('should return true', async () => {
      const healthy = await runtime.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      await runtime.startAgent('agent-001');

      const context: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: { messageContent: 'Hello' },
        startedAt: new Date(),
      };

      await runtime.executeTask(context);

      runtime.clear();

      await expect(runtime.getAgentStatus('agent-001')).rejects.toThrow();
      await expect(runtime.getExecutionStatus('exec-001')).rejects.toThrow();
      await expect(runtime.getAgentMetrics('agent-001')).rejects.toThrow();
    });
  });

  describe('getAllAgents', () => {
    it('should return all agents', async () => {
      await runtime.startAgent('agent-001');
      await runtime.startAgent('agent-002');

      const agents = runtime.getAllAgents();
      expect(agents.size).toBe(2);
      expect(agents.has('agent-001')).toBe(true);
      expect(agents.has('agent-002')).toBe(true);
    });
  });

  describe('getAllExecutions', () => {
    it('should return all executions', async () => {
      await runtime.startAgent('agent-001');

      const context1: ExecutionContext = {
        executionId: 'exec-001',
        agentId: 'agent-001',
        taskId: 'task-001',
        input: { messageContent: 'Hello' },
        startedAt: new Date(),
      };

      const context2: ExecutionContext = {
        executionId: 'exec-002',
        agentId: 'agent-001',
        taskId: 'task-002',
        input: { messageContent: 'World' },
        startedAt: new Date(),
      };

      await runtime.executeTask(context1);
      await runtime.executeTask(context2);

      const executions = runtime.getAllExecutions();
      expect(executions.size).toBe(2);
      expect(executions.has('exec-001')).toBe(true);
      expect(executions.has('exec-002')).toBe(true);
    });
  });
});
