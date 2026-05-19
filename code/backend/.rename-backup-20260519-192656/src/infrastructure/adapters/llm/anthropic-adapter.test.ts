import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicAdapter } from './anthropic-adapter';
import { GenerateParams } from './llm-adapter.interface';
import Anthropic from '@anthropic-ai/sdk';

vi.mock('@anthropic-ai/sdk');

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreate = vi.fn();
    
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    } as any));

    adapter = new AnthropicAdapter('test-api-key');
  });

  describe('constructor', () => {
    it('should initialize with default model and maxTokens', () => {
      expect(adapter).toBeDefined();
    });

    it('should initialize with custom model and maxTokens', () => {
      const customAdapter = new AnthropicAdapter('test-key', 'claude-opus-4', 8192);
      expect(customAdapter).toBeDefined();
    });

    it('should initialize with custom baseURL', () => {
      const customAdapter = new AnthropicAdapter('test-key', undefined, undefined, 'https://custom.api.com');
      expect(customAdapter).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'Hello, how can I help you?' },
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
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: 'You are a helpful assistant',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      });
    });

    it('should use custom maxTokens from params', async () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'Response' },
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
        content: [
          { type: 'text', text: 'Multi-turn response' },
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
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'First response' },
            { role: 'user', content: 'Second message' },
          ],
        })
      );
    });

    it('should return empty string when no text block found', async () => {
      const mockResponse = {
        content: [
          { type: 'image', source: {} },
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

    it('should return empty string when content array is empty', async () => {
      const mockResponse = {
        content: [],
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
