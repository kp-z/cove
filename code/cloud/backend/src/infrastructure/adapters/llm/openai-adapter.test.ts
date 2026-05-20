import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIAdapter } from './openai-adapter';
import { GenerateParams } from './llm-adapter.interface';
import OpenAI from 'openai';

vi.mock('openai');

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreate = vi.fn();
    
    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    } as any));

    adapter = new OpenAIAdapter('test-api-key');
  });

  describe('constructor', () => {
    it('should initialize with default model and maxTokens', () => {
      expect(adapter).toBeDefined();
    });

    it('should initialize with custom model and maxTokens', () => {
      const customAdapter = new OpenAIAdapter('test-key', 'gpt-4-turbo', 8192);
      expect(customAdapter).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello, how can I help you?',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const params: GenerateParams = {
        systemPrompt: 'You are a helpful assistant',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('Hello, how can I help you?');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
        ],
      });
    });

    it('should use custom maxTokens from params', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Test' }],
        maxTokens: 2048,
      };

      await adapter.generateResponse(params);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2048,
        })
      );
    });

    it('should handle multiple messages', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Multi-turn response',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'First response' },
          { role: 'user', content: 'Second message' },
        ],
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('Multi-turn response');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System' },
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'First response' },
            { role: 'user', content: 'Second message' },
          ],
        })
      );
    });

    it('should return empty string when no choices', async () => {
      const mockResponse = {
        choices: [],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('');
    });

    it('should return empty string when message content is null', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('');
    });

    it('should return empty string when message is undefined', async () => {
      const mockResponse = {
        choices: [
          {
            message: undefined,
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('');
    });

    it('should propagate API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(adapter.generateResponse(params)).rejects.toThrow('API Error');
    });
  });
});
