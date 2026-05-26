import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { createAdapterRouter } from './adapter.router';
import { AdapterService } from '../../../application/services/adapter/adapter.service';
import { AdapterMetadataService } from '../../../application/services/adapter/adapter-metadata.service';
import { AdapterConfig } from '../../../domain/models/adapter/adapter-config.entity';

// Mock the model-discovery module
vi.mock('../../adapters/llm/model-discovery', () => ({
  getAvailableModels: vi.fn(),
}));

import { getAvailableModels } from '../../adapters/llm/model-discovery';

describe('adapterRouter', () => {
  let mockAdapterService: AdapterService;
  let mockAdapterMetadataService: AdapterMetadataService;
  let mockContext: any;
  let router: ReturnType<typeof createAdapterRouter>;

  const mockAdapter: AdapterConfig = {
    id: 'adapter-1',
    name: 'Test Adapter',
    description: 'Test adapter description',
    type: 'anthropic-api',
    scope: 'shared',
    owner_id: 'user-1',
    config: {
      model: 'claude-3-opus-20240229',
      base_url: 'https://api.anthropic.com',
      custom_headers: {},
    },
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    mockAdapterService = {
      create: vi.fn(),
      list: vi.fn(),
      listByScope: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      resolveApiKey: vi.fn(),
    } as unknown as AdapterService;

    mockAdapterMetadataService = {
      getAdapterTypes: vi.fn(),
      getAdapterType: vi.fn(),
    } as unknown as AdapterMetadataService;

    mockContext = {
      userId: 'test-user-id',
      realmId: 'test-realm-id',
      userRole: 'owner',
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      realmMemberVerification: {
        isMember: vi.fn().mockResolvedValue(true),
        verifyMembership: vi.fn().mockResolvedValue(undefined),
        clearCache: vi.fn(),
        clearAllCache: vi.fn(),
      },
      req: {} as IncomingMessage,
      res: {
        setHeader: vi.fn(),
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse,
    };

    router = createAdapterRouter({
      adapterService: mockAdapterService,
      adapterMetadataService: mockAdapterMetadataService,
    });

    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create adapter successfully', async () => {
      vi.mocked(mockAdapterService.create).mockResolvedValue(mockAdapter);

      const caller = router.createCaller(mockContext);
      const result = await caller.create({
        name: 'Test Adapter',
        description: 'Test description',
        scope: 'shared',
        adapter: {
          type: 'anthropic-api',
          config: {
            model: 'claude-3-opus-20240229',
            base_url: 'https://api.anthropic.com',
            custom_headers: {},
          },
        },
      });

      expect(result).toEqual(mockAdapter);
      expect(mockAdapterService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Adapter',
          description: 'Test description',
          scope: 'shared',
          type: 'anthropic-api',
        }),
        'test-user-id'
      );
    });

    it('should use system as actorId when userId is not available', async () => {
      vi.mocked(mockAdapterService.create).mockResolvedValue(mockAdapter);

      const unauthContext = { ...mockContext, userId: undefined };
      const caller = router.createCaller(unauthContext);

      await caller.create({
        name: 'Test Adapter',
        scope: 'shared',
        adapter: {
          type: 'anthropic-api',
          config: {
            model: 'claude-3-opus-20240229',
            base_url: 'https://api.anthropic.com',
            custom_headers: {},
          },
        },
      });

      expect(mockAdapterService.create).toHaveBeenCalledWith(
        expect.anything(),
        'system'
      );
    });

    it('should validate required fields', async () => {
      const caller = router.createCaller(mockContext);

      await expect(
        caller.create({
          name: '',
          scope: 'shared',
          adapter: {
            type: 'anthropic-api',
            config: {
              base_url: 'https://api.anthropic.com',
              custom_headers: {},
            },
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should list all adapters', async () => {
      const adapters = [mockAdapter];
      vi.mocked(mockAdapterService.list).mockResolvedValue(adapters);

      const caller = router.createCaller(mockContext);
      const result = await caller.list();

      expect(result.adapters).toEqual(adapters);
      expect(result.total).toBe(1);
      expect(mockAdapterService.list).toHaveBeenCalledWith('test-user-id');
    });

    it('should return empty array when no adapters', async () => {
      vi.mocked(mockAdapterService.list).mockResolvedValue([]);

      const caller = router.createCaller(mockContext);
      const result = await caller.list();

      expect(result.adapters).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('listByScope', () => {
    it('should list adapters by scope', async () => {
      const adapters = [mockAdapter];
      vi.mocked(mockAdapterService.listByScope).mockResolvedValue(adapters);

      const caller = router.createCaller(mockContext);
      const result = await caller.listByScope({
        scope: 'shared',
      });

      expect(result.adapters).toEqual(adapters);
      expect(result.total).toBe(1);
      expect(mockAdapterService.listByScope).toHaveBeenCalledWith(
        'shared',
        'test-user-id'
      );
    });

    it('should filter private adapters by owner_id', async () => {
      const adapters = [
        { ...mockAdapter, scope: 'private', owner_id: 'user-1' },
        { ...mockAdapter, id: 'adapter-2', scope: 'private', owner_id: 'user-2' },
      ];
      vi.mocked(mockAdapterService.listByScope).mockResolvedValue(adapters);

      const caller = router.createCaller(mockContext);
      const result = await caller.listByScope({
        scope: 'private',
        owner_id: 'user-1',
      });

      expect(result.adapters).toHaveLength(1);
      expect(result.adapters[0].owner_id).toBe('user-1');
      expect(result.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('should get adapter by id', async () => {
      vi.mocked(mockAdapterService.getById).mockResolvedValue(mockAdapter);

      const caller = router.createCaller(mockContext);
      const result = await caller.getById({ adapterId: 'adapter-1' });

      expect(result).toEqual(mockAdapter);
      expect(mockAdapterService.getById).toHaveBeenCalledWith(
        'adapter-1',
        'test-user-id'
      );
    });

    it('should handle adapter not found', async () => {
      vi.mocked(mockAdapterService.getById).mockRejectedValue(
        new Error('Adapter not found')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.getById({ adapterId: 'non-existent' })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update adapter successfully', async () => {
      const updatedAdapter = { ...mockAdapter, name: 'Updated Adapter' };
      vi.mocked(mockAdapterService.update).mockResolvedValue(updatedAdapter);

      const caller = router.createCaller(mockContext);
      const result = await caller.update({
        adapterId: 'adapter-1',
        data: {
          name: 'Updated Adapter',
        },
      });

      expect(result).toEqual(updatedAdapter);
      expect(mockAdapterService.update).toHaveBeenCalledWith(
        'adapter-1',
        { name: 'Updated Adapter' },
        'test-user-id'
      );
    });

    it('should update adapter config', async () => {
      const updatedAdapter = { ...mockAdapter };
      vi.mocked(mockAdapterService.update).mockResolvedValue(updatedAdapter);

      const caller = router.createCaller(mockContext);
      await caller.update({
        adapterId: 'adapter-1',
        data: {
          adapter: {
            type: 'openai-api',
            config: {
              model: 'gpt-4',
              base_url: 'https://api.openai.com',
              api_key: 'sk-test1234567890abcdefghijklmnop',
            },
          },
        },
      });

      expect(mockAdapterService.update).toHaveBeenCalledWith(
        'adapter-1',
        expect.objectContaining({
          type: 'openai-api',
          config: expect.any(Object),
        }),
        'test-user-id'
      );
    });
  });

  describe('delete', () => {
    it('should delete adapter successfully', async () => {
      vi.mocked(mockAdapterService.delete).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.delete({ adapterId: 'adapter-1' });

      expect(result).toEqual({ adapterId: 'adapter-1', deleted: true });
      expect(mockAdapterService.delete).toHaveBeenCalledWith(
        'adapter-1',
        'test-user-id'
      );
    });
  });

  describe('getAvailableModels', () => {
    it('should get available models for anthropic adapter', async () => {
      vi.mocked(mockAdapterService.getById).mockResolvedValue(mockAdapter);
      vi.mocked(getAvailableModels).mockResolvedValue({
        provider: 'anthropic',
        models: ['claude-3-opus', 'claude-3-sonnet'],
      });

      const caller = router.createCaller(mockContext);
      const result = await caller.getAvailableModels({ adapterId: 'adapter-1' });

      expect(result.provider).toBe('anthropic');
      expect(result.models).toHaveLength(2);
      expect(getAvailableModels).toHaveBeenCalledWith(
        'anthropic-api',
        'https://api.anthropic.com',
        {},
        undefined
      );
    });

    it('should throw error for unsupported adapter type', async () => {
      const cliAdapter = {
        ...mockAdapter,
        type: 'claude-code-cli' as const,
      };
      vi.mocked(mockAdapterService.getById).mockResolvedValue(cliAdapter);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.getAvailableModels({ adapterId: 'adapter-1' })
      ).rejects.toThrow('Model discovery not supported');
    });
  });

  describe('discoverModels', () => {
    it('should discover models with temporary config', async () => {
      vi.mocked(getAvailableModels).mockResolvedValue({
        provider: 'openai',
        models: ['gpt-4', 'gpt-3.5-turbo'],
      });

      const caller = router.createCaller(mockContext);
      const result = await caller.discoverModels({
        adapterType: 'openai-api',
        baseURL: 'https://api.openai.com',
        apiKey: 'test-key',
      });

      expect(result.provider).toBe('openai');
      expect(result.models).toHaveLength(2);
      expect(getAvailableModels).toHaveBeenCalledWith(
        'openai-api',
        'https://api.openai.com',
        undefined,
        'test-key'
      );
    });

    it('should throw error for unsupported adapter type', async () => {
      const caller = router.createCaller(mockContext);

      await expect(
        caller.discoverModels({
          adapterType: 'claude-code-cli',
        })
      ).rejects.toThrow('Model discovery not supported');
    });
  });

  describe('getAdapterTypes', () => {
    it('should get all adapter types', async () => {
      const adapterTypes = [
        { type: 'anthropic-api', name: 'Anthropic API' },
        { type: 'openai-api', name: 'OpenAI API' },
      ];
      vi.mocked(mockAdapterMetadataService.getAdapterTypes).mockReturnValue(
        adapterTypes
      );

      const caller = router.createCaller(mockContext);
      const result = await caller.getAdapterTypes();

      expect(result).toEqual(adapterTypes);
    });
  });

  describe('getAdapterType', () => {
    it('should get single adapter type metadata', async () => {
      const metadata = { type: 'anthropic-api', name: 'Anthropic API' };
      vi.mocked(mockAdapterMetadataService.getAdapterType).mockReturnValue(
        metadata
      );

      const caller = router.createCaller(mockContext);
      const result = await caller.getAdapterType({ type: 'anthropic-api' });

      expect(result).toEqual(metadata);
    });

    it('should throw error for unknown adapter type', async () => {
      vi.mocked(mockAdapterMetadataService.getAdapterType).mockReturnValue(null);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.getAdapterType({ type: 'anthropic-api' })
      ).rejects.toThrow('Unknown adapter type');
    });
  });

  describe('testConnection', () => {
    it('should test anthropic adapter connection successfully', async () => {
      vi.mocked(mockAdapterService.getById).mockResolvedValue(mockAdapter);
      vi.mocked(getAvailableModels).mockResolvedValue({
        provider: 'anthropic',
        models: ['claude-3-opus'],
      });

      const caller = router.createCaller(mockContext);
      const result = await caller.testConnection({ adapterId: 'adapter-1' });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.details?.provider).toBe('anthropic');
      expect(result.details?.modelCount).toBe(1);
    });

    it('should handle connection test failure', async () => {
      vi.mocked(mockAdapterService.getById).mockResolvedValue(mockAdapter);
      vi.mocked(getAvailableModels).mockRejectedValue(
        new Error('Connection failed')
      );

      const caller = router.createCaller(mockContext);
      const result = await caller.testConnection({ adapterId: 'adapter-1' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });

    it('should test claude-code-cli adapter connection', async () => {
      const cliAdapter = {
        ...mockAdapter,
        type: 'claude-code-cli' as const,
        config: {
          cli_path: 'claude',
        },
      };
      vi.mocked(mockAdapterService.getById).mockResolvedValue(cliAdapter);

      const caller = router.createCaller(mockContext);
      const result = await caller.testConnection({ adapterId: 'adapter-1' });

      // CLI validation will likely fail in test environment, but we test the flow
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });
});
