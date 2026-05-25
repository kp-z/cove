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

  describe('streaming mode', () => {
    let mockStream: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockStream = vi.fn();

      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: {
          create: mockCreate,
          stream: mockStream,
        },
      } as any));

      adapter = new AnthropicAdapter('test-api-key');
    });

    it('should use streaming mode when streaming callbacks provided', async () => {
      const mockStreamInstance = {
        on: vi.fn().mockReturnThis(),
        finalMessage: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Streaming response' }],
        }),
      };

      mockStream.mockResolvedValue(mockStreamInstance);

      const streamingCallbacks = {
        onThinking: vi.fn(),
        onUsage: vi.fn(),
        onStatusChange: vi.fn(),
      };

      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Test' }],
        streaming: streamingCallbacks,
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('Streaming response');
      expect(mockStream).toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(streamingCallbacks.onStatusChange).toHaveBeenCalledWith('thinking');
      expect(streamingCallbacks.onStatusChange).toHaveBeenCalledWith('completed');
    });

    it('should call onThinking callback on text events', async () => {
      let textHandler: ((text: string) => void) | undefined;
      const mockStreamInstance = {
        on: vi.fn((event, handler) => {
          if (event === 'text') {
            textHandler = handler;
          }
          return mockStreamInstance;
        }),
        finalMessage: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Final response' }],
        }),
      };

      mockStream.mockResolvedValue(mockStreamInstance);

      const onThinking = vi.fn();
      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Test' }],
        streaming: { onThinking },
      };

      // Start the generation
      const resultPromise = adapter.generateResponse(params);

      // Wait a bit for the stream to be set up
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate text events
      if (textHandler) {
        await textHandler('Hello ');
        await textHandler('world');
      }

      await resultPromise;

      expect(onThinking).toHaveBeenCalledWith('Hello ');
      expect(onThinking).toHaveBeenCalledWith('world');
    });

    it('should call onUsage callback with usage data', async () => {
      let messageHandler: ((message: any) => void) | undefined;
      const mockStreamInstance = {
        on: vi.fn((event, handler) => {
          if (event === 'message') {
            messageHandler = handler;
          }
          return mockStreamInstance;
        }),
        finalMessage: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
        }),
      };

      mockStream.mockResolvedValue(mockStreamInstance);

      const onUsage = vi.fn();
      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Test' }],
        streaming: { onUsage },
      };

      // Start the generation
      const resultPromise = adapter.generateResponse(params);

      // Wait a bit for the stream to be set up
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate message event with usage
      if (messageHandler) {
        await messageHandler({
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_creation_input_tokens: 10,
            cache_read_input_tokens: 20,
          },
        });
      }

      await resultPromise;

      expect(onUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          cache: expect.objectContaining({
            creation_tokens: 10,
            read_tokens: 20,
          }),
        })
      );
    });

    it('should use non-streaming mode when no streaming callbacks provided', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Non-streaming response' }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const params: GenerateParams = {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const result = await adapter.generateResponse(params);

      expect(result).toBe('Non-streaming response');
      expect(mockCreate).toHaveBeenCalled();
      expect(mockStream).not.toHaveBeenCalled();
    });
  });
});
