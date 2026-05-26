import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdapterExecutor } from './adapter-executor';
import { ExecutionRequest } from './types';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

describe('AdapterExecutor', () => {
  let executor: AdapterExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with Anthropic API key', () => {
      executor = new AdapterExecutor({
        anthropicApiKey: 'test-anthropic-key',
      });

      expect(executor).toBeDefined();
    });

    it('should initialize with OpenAI API key', () => {
      executor = new AdapterExecutor({
        openaiApiKey: 'test-openai-key',
      });

      expect(executor).toBeDefined();
    });

    it('should initialize with both API keys', () => {
      executor = new AdapterExecutor({
        anthropicApiKey: 'test-anthropic-key',
        openaiApiKey: 'test-openai-key',
      });

      expect(executor).toBeDefined();
    });
  });

  describe('execute - Anthropic', () => {
    beforeEach(() => {
      executor = new AdapterExecutor({
        anthropicApiKey: 'test-anthropic-key',
      });
    });

    it('should execute Anthropic request successfully', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hello from Claude!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      (Anthropic as any).mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      executor = new AdapterExecutor({
        anthropicApiKey: 'test-anthropic-key',
      });

      const request: ExecutionRequest = {
        taskId: 'task-1',
        realmId: 'realm-1',
        agentId: 'agent-1',
        input: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      const result = await executor.execute(request);

      expect(result.output).toBe('Hello from Claude!');
      expect(result.usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
      });
      expect(result.executionTime).toBeGreaterThan(0);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 1.0,
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    it('should throw error if Anthropic API key not configured', async () => {
      executor = new AdapterExecutor({});

      const request: ExecutionRequest = {
        taskId: 'task-1',
        realmId: 'realm-1',
        agentId: 'agent-1',
        input: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      await expect(executor.execute(request)).rejects.toThrow(
        'Anthropic API key not configured'
      );
    });

    it('should handle system messages correctly', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      (Anthropic as any).mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      executor = new AdapterExecutor({
        anthropicApiKey: 'test-anthropic-key',
      });

      const request: ExecutionRequest = {
        taskId: 'task-1',
        realmId: 'realm-1',
        agentId: 'agent-1',
        input: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          messages: [
            { role: 'system', content: 'You are helpful' },
            { role: 'user', content: 'Hello' },
          ],
        },
      };

      await executor.execute(request);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 1.0,
        messages: [
          { role: 'user', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
      });
    });
  });

  describe('execute - OpenAI', () => {
    beforeEach(() => {
      executor = new AdapterExecutor({
        openaiApiKey: 'test-openai-key',
      });
    });

    it('should execute OpenAI request successfully', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Hello from GPT!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      (OpenAI as any).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      executor = new AdapterExecutor({
        openaiApiKey: 'test-openai-key',
      });

      const request: ExecutionRequest = {
        taskId: 'task-1',
        realmId: 'realm-1',
        agentId: 'agent-1',
        input: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      const result = await executor.execute(request);

      expect(result.output).toBe('Hello from GPT!');
      expect(result.usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
      });
      expect(result.executionTime).toBeGreaterThan(0);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 4096,
        temperature: 1.0,
      });
    });

    it('should throw error if OpenAI API key not configured', async () => {
      executor = new AdapterExecutor({});

      const request: ExecutionRequest = {
        taskId: 'task-1',
        realmId: 'realm-1',
        agentId: 'agent-1',
        input: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      await expect(executor.execute(request)).rejects.toThrow(
        'OpenAI API key not configured'
      );
    });

    it('should throw error if OpenAI returns empty response', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 10, completion_tokens: 0 },
      });

      (OpenAI as any).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      executor = new AdapterExecutor({
        openaiApiKey: 'test-openai-key',
      });

      const request: ExecutionRequest = {
        taskId: 'task-1',
        realmId: 'realm-1',
        agentId: 'agent-1',
        input: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      await expect(executor.execute(request)).rejects.toThrow(
        'Empty response from OpenAI'
      );
    });
  });

  describe('execute - Error handling', () => {
    it('should throw error for unsupported provider', async () => {
      executor = new AdapterExecutor({
        anthropicApiKey: 'test-key',
      });

      const request: ExecutionRequest = {
        taskId: 'task-1',
        realmId: 'realm-1',
        agentId: 'agent-1',
        input: {
          provider: 'unsupported' as any,
          model: 'model',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      await expect(executor.execute(request)).rejects.toThrow(
        'Unsupported provider: unsupported'
      );
    });
  });

  describe('cancelTask', () => {
    it('should cancel running task', async () => {
      executor = new AdapterExecutor({
        anthropicApiKey: 'test-key',
      });

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                content: [{ type: 'text', text: 'Response' }],
                usage: { input_tokens: 10, output_tokens: 5 },
              });
            }, 1000);
          })
      );

      (Anthropic as any).mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      executor = new AdapterExecutor({
        anthropicApiKey: 'test-anthropic-key',
      });

      const request: ExecutionRequest = {
        taskId: 'task-1',
        realmId: 'realm-1',
        agentId: 'agent-1',
        input: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      const executePromise = executor.execute(request);

      expect(executor.getActiveTaskCount()).toBe(1);

      executor.cancelTask('task-1');

      expect(executor.getActiveTaskCount()).toBe(0);

      await executePromise;
    });
  });

  describe('getActiveTaskCount', () => {
    it('should return 0 when no tasks running', () => {
      executor = new AdapterExecutor({
        anthropicApiKey: 'test-key',
      });

      expect(executor.getActiveTaskCount()).toBe(0);
    });
  });
});
