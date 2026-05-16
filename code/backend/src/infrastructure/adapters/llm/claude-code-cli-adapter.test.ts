import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GenerateParams } from './llm-adapter.interface';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process before importing the adapter
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Import after mocking
import { ClaudeCodeCLIAdapter } from './claude-code-cli-adapter';
import { spawn } from 'child_process';

describe('ClaudeCodeCLIAdapter', () => {
  let adapter: ClaudeCodeCLIAdapter;
  const mockSpawn = vi.mocked(spawn);

  beforeEach(() => {
    adapter = new ClaudeCodeCLIAdapter('claude', 'opus', 4096, '/tmp', 5000);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockChildProcess = (stdout: string, stderr = '', exitCode = 0) => {
    const mockChild = new EventEmitter() as ChildProcess & EventEmitter;
    mockChild.stdout = new EventEmitter() as any;
    mockChild.stderr = new EventEmitter() as any;
    mockChild.kill = vi.fn();

    // Simulate async execution
    setTimeout(() => {
      if (stdout) {
        mockChild.stdout!.emit('data', Buffer.from(stdout));
      }
      if (stderr) {
        mockChild.stderr!.emit('data', Buffer.from(stderr));
      }
      mockChild.emit('close', exitCode);
    }, 10);

    return mockChild;
  };

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultAdapter = new ClaudeCodeCLIAdapter();
      expect(defaultAdapter).toBeDefined();
    });

    it('should initialize with custom values', () => {
      const customAdapter = new ClaudeCodeCLIAdapter(
        '/usr/local/bin/claude',
        'sonnet',
        8192,
        '/custom/dir',
        60000
      );
      expect(customAdapter).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockOutput = JSON.stringify({
        type: 'result',
        result: 'Hello! How can I help you?',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
        total_cost_usd: 0.01,
      });

      mockSpawn.mockReturnValue(createMockChildProcess(mockOutput));

      const params: GenerateParams = {
        systemPrompt: 'You are a helpful assistant',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('Hello! How can I help you?');
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining([
          '-p',
          '--output-format=json',
          '--bare',
          '--model', 'opus',
          '--no-session-persistence',
          '--system-prompt', 'You are a helpful assistant',
          'User: Hello',
        ]),
        expect.objectContaining({
          cwd: '/tmp',
          env: process.env,
        })
      );
    });

    it('should handle multiple messages', async () => {
      const mockOutput = JSON.stringify({
        type: 'result',
        result: 'Response to conversation',
        stop_reason: 'end_turn',
      });

      mockSpawn.mockReturnValue(createMockChildProcess(mockOutput));

      const params: GenerateParams = {
        systemPrompt: 'You are helpful',
        messages: [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'First response' },
          { role: 'user', content: 'Second message' },
        ],
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('Response to conversation');
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining([
          'User: First message\n\nAssistant: First response\n\nUser: Second message',
        ]),
        expect.any(Object)
      );
    });

    it('should work without system prompt', async () => {
      const mockOutput = JSON.stringify({
        type: 'result',
        result: 'Response without system prompt',
        stop_reason: 'end_turn',
      });

      mockSpawn.mockReturnValue(createMockChildProcess(mockOutput));

      const params: GenerateParams = {
        systemPrompt: '',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('Response without system prompt');
      const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).not.toContain('--system-prompt');
    });

    it('should handle CLI execution error', async () => {
      const mockChild = new EventEmitter() as ChildProcess & EventEmitter;
      mockChild.stdout = new EventEmitter() as any;
      mockChild.stderr = new EventEmitter() as any;
      mockChild.kill = vi.fn();

      setTimeout(() => {
        mockChild.emit('error', new Error('Command not found'));
      }, 10);

      mockSpawn.mockReturnValue(mockChild);

      const params: GenerateParams = {
        systemPrompt: 'Test',
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(adapter.generateResponse(params)).rejects.toThrow(
        'Claude CLI execution failed: Failed to spawn CLI: Command not found'
      );
    });

    it('should handle non-zero exit code', async () => {
      mockSpawn.mockReturnValue(
        createMockChildProcess('', 'Error: Invalid arguments', 1)
      );

      const params: GenerateParams = {
        systemPrompt: 'Test',
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(adapter.generateResponse(params)).rejects.toThrow(
        /CLI exited with code 1/
      );
    });

    it('should handle timeout', async () => {
      const mockChild = new EventEmitter() as ChildProcess & EventEmitter;
      mockChild.stdout = new EventEmitter() as any;
      mockChild.stderr = new EventEmitter() as any;
      mockChild.kill = vi.fn();

      // Never emit close event to simulate hanging process
      mockSpawn.mockReturnValue(mockChild);

      const params: GenerateParams = {
        systemPrompt: 'Test',
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(adapter.generateResponse(params)).rejects.toThrow(
        /CLI execution timeout after 5000ms/
      );

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle invalid JSON output', async () => {
      mockSpawn.mockReturnValue(createMockChildProcess('Invalid JSON'));

      const params: GenerateParams = {
        systemPrompt: 'Test',
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(adapter.generateResponse(params)).rejects.toThrow(
        /Failed to parse CLI output as JSON/
      );
    });

    it('should handle unexpected output type', async () => {
      const mockOutput = JSON.stringify({
        type: 'error',
        message: 'Something went wrong',
      });

      mockSpawn.mockReturnValue(createMockChildProcess(mockOutput));

      const params: GenerateParams = {
        systemPrompt: 'Test',
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(adapter.generateResponse(params)).rejects.toThrow(
        /Unexpected output type: error/
      );
    });

    it('should handle missing result in output', async () => {
      const mockOutput = JSON.stringify({
        type: 'result',
        stop_reason: 'end_turn',
      });

      mockSpawn.mockReturnValue(createMockChildProcess(mockOutput));

      const params: GenerateParams = {
        systemPrompt: 'Test',
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(adapter.generateResponse(params)).rejects.toThrow(
        /No result in CLI output/
      );
    });
  });
});
