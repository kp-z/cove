import { describe, it, expect } from 'vitest';
import { ClaudeCodeCLIAdapter } from './claude-code-cli-adapter';
import { GenerateParams } from './llm-adapter.interface';

/**
 * Integration tests for Claude Code CLI Adapter
 *
 * These tests require the Claude CLI to be installed and available in PATH.
 * Skip these tests in CI/CD environments where CLI is not available.
 *
 * To run: npm test -- claude-code-cli-adapter.integration.test.ts
 */

const CLI_AVAILABLE = process.env.CLAUDE_CLI_AVAILABLE === 'true';

describe.skipIf(!CLI_AVAILABLE)('ClaudeCodeCLIAdapter Integration Tests', () => {
  describe('Basic functionality', () => {
    it('should generate a simple response', async () => {
      const adapter = new ClaudeCodeCLIAdapter({
        model: 'haiku', // Use fastest model for tests
        timeout: 30000,
      });

      const params: GenerateParams = {
        systemPrompt: 'You are a helpful assistant. Keep responses brief.',
        messages: [
          { role: 'user', content: 'Say "Hello, World!" and nothing else.' },
        ],
      };

      const response = await adapter.generateResponse(params);

      expect(response).toBeDefined();
      expect(response).toContain('Hello');
      expect(response.length).toBeGreaterThan(0);
    }, 60000); // 60 second timeout

    it('should handle conversation history', async () => {
      const adapter = new ClaudeCodeCLIAdapter({
        model: 'haiku',
        timeout: 30000,
      });

      const params: GenerateParams = {
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'My name is Alice.' },
          { role: 'assistant', content: 'Nice to meet you, Alice!' },
          { role: 'user', content: 'What is my name?' },
        ],
      };

      const response = await adapter.generateResponse(params);

      expect(response).toBeDefined();
      expect(response.toLowerCase()).toContain('alice');
    }, 60000);
  });

  describe('Configuration options', () => {
    it('should respect temperature setting', async () => {
      const adapter = new ClaudeCodeCLIAdapter({
        model: 'haiku',
        temperature: 0.1, // Very low temperature for deterministic output
        timeout: 30000,
      });

      const params: GenerateParams = {
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'Count from 1 to 5.' },
        ],
      };

      const response = await adapter.generateResponse(params);

      expect(response).toBeDefined();
      expect(response).toMatch(/1.*2.*3.*4.*5/s);
    }, 60000);

    it('should respect max_tokens setting', async () => {
      const adapter = new ClaudeCodeCLIAdapter({
        model: 'haiku',
        maxTokens: 50, // Very small limit
        timeout: 30000,
      });

      const params: GenerateParams = {
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'Write a long essay about artificial intelligence.' },
        ],
      };

      const response = await adapter.generateResponse(params);

      expect(response).toBeDefined();
      // Response should be truncated due to token limit
      expect(response.length).toBeLessThan(500);
    }, 60000);
  });

  describe('Extended thinking', () => {
    it('should work with thinking enabled', async () => {
      const adapter = new ClaudeCodeCLIAdapter({
        model: 'opus', // Opus supports extended thinking
        thinkingEnabled: true,
        timeout: 60000,
      });

      const params: GenerateParams = {
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'What is 2 + 2?' },
        ],
      };

      const response = await adapter.generateResponse(params);

      expect(response).toBeDefined();
      expect(response).toContain('4');
    }, 90000);
  });

  describe('Error handling', () => {
    it('should handle invalid model gracefully', async () => {
      const adapter = new ClaudeCodeCLIAdapter({
        model: 'invalid-model-name',
        timeout: 10000,
      });

      const params: GenerateParams = {
        systemPrompt: 'Test',
        messages: [
          { role: 'user', content: 'Test' },
        ],
      };

      await expect(adapter.generateResponse(params)).rejects.toThrow();
    }, 30000);

    it('should handle timeout correctly', async () => {
      const adapter = new ClaudeCodeCLIAdapter({
        model: 'opus',
        timeout: 100, // Very short timeout
      });

      const params: GenerateParams = {
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'Write a very long essay.' },
        ],
      };

      await expect(adapter.generateResponse(params)).rejects.toThrow(/timeout/i);
    }, 30000);
  });

  describe('Working directory', () => {
    it('should execute in specified working directory', async () => {
      const adapter = new ClaudeCodeCLIAdapter({
        model: 'haiku',
        workingDir: '/tmp',
        timeout: 30000,
      });

      const params: GenerateParams = {
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'Say hello.' },
        ],
      };

      const response = await adapter.generateResponse(params);

      expect(response).toBeDefined();
      expect(response.toLowerCase()).toContain('hello');
    }, 60000);
  });
});

/**
 * Setup instructions for running integration tests:
 *
 * 1. Install Claude CLI:
 *    npm install -g @anthropic-ai/claude-cli
 *
 * 2. Configure API key:
 *    export ANTHROPIC_API_KEY=your-api-key
 *
 * 3. Enable integration tests:
 *    export CLAUDE_CLI_AVAILABLE=true
 *
 * 4. Run tests:
 *    npm test -- claude-code-cli-adapter.integration.test.ts
 */
