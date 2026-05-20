import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FileSystemAdapterConfigStore } from '../../../src/infrastructure/persistence/file-system-adapter-config-store';
import { FileLockManager } from '../../../src/application/services/lock/file-lock-manager.service';
import { AuditLogger } from '../../../src/application/services/audit/audit-logger.service';
import { FileSystemAuditLogStore } from '../../../src/application/services/audit/file-system-audit-log-store';
import { AnthropicAdapterConfig, OpenAIAdapterConfig } from '../../../src/domain/models/adapter/adapter-config.entity';

describe('FileSystemAdapterConfigStore', () => {
  let store: FileSystemAdapterConfigStore;
  let testDir: string;
  let lockManager: FileLockManager;
  let auditLogger: AuditLogger;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adapter-store-test-'));

    // Create lock manager
    const lockDir = path.join(testDir, 'locks');
    await fs.mkdir(lockDir, { recursive: true });
    lockManager = new FileLockManager(lockDir);

    // Create audit logger
    const auditLogDir = path.join(testDir, 'audit-logs');
    await fs.mkdir(auditLogDir, { recursive: true });
    const auditLogStore = new FileSystemAuditLogStore(auditLogDir);
    auditLogger = new AuditLogger(auditLogStore);

    // Create store
    store = new FileSystemAdapterConfigStore(testDir, lockManager, auditLogger);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('save', () => {
    it('should save a new shared adapter configuration', async () => {
      const config: AnthropicAdapterConfig = {
        id: 'adapter-1',
        name: 'Test Anthropic Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: 4096,
        },
      };

      await store.save(config);

      const retrieved = await store.getById('adapter-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('adapter-1');
      expect(retrieved?.name).toBe('Test Anthropic Adapter');
      expect(retrieved?.type).toBe('anthropic-api');
    });

    it('should save a new private adapter configuration', async () => {
      const config: OpenAIAdapterConfig = {
        id: 'adapter-2',
        name: 'Test OpenAI Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-2',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
          temperature: 0.5,
          max_tokens: 2048,
        },
      };

      await store.save(config);

      const retrieved = await store.getById('adapter-2');
      expect(retrieved).toBeDefined();
      expect(retrieved?.scope).toBe('private');
    });

    it('should update an existing adapter configuration', async () => {
      const config: AnthropicAdapterConfig = {
        id: 'adapter-3',
        name: 'Original Name',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      await store.save(config);

      const updatedConfig: AnthropicAdapterConfig = {
        ...config,
        name: 'Updated Name',
        updated_at: new Date(),
      };

      await store.save(updatedConfig);

      const retrieved = await store.getById('adapter-3');
      expect(retrieved?.name).toBe('Updated Name');
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig = {
        id: 'adapter-invalid',
        name: 'Invalid Adapter',
        type: 'invalid-type', // Invalid type
        scope: 'shared',
        created_at: new Date(),
        updated_at: new Date(),
        config: {},
      };

      await expect(store.save(invalidConfig as any)).rejects.toThrow('Invalid adapter configuration');
    });
  });

  describe('getById', () => {
    it('should retrieve an existing adapter', async () => {
      const config: AnthropicAdapterConfig = {
        id: 'adapter-4',
        name: 'Test Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      await store.save(config);

      const retrieved = await store.getById('adapter-4');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('adapter-4');
    });

    it('should return null for non-existent adapter', async () => {
      const retrieved = await store.getById('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('list', () => {
    it('should list all adapters across all scopes', async () => {
      const config1: AnthropicAdapterConfig = {
        id: 'adapter-5',
        name: 'Shared Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      const config2: OpenAIAdapterConfig = {
        id: 'adapter-6',
        name: 'Private Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-2',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      await store.save(config1);
      await store.save(config2);

      const allAdapters = await store.list();
      expect(allAdapters).toHaveLength(2);
      expect(allAdapters.map(a => a.id)).toContain('adapter-5');
      expect(allAdapters.map(a => a.id)).toContain('adapter-6');
    });

    it('should return empty array when no adapters exist', async () => {
      const allAdapters = await store.list();
      expect(allAdapters).toHaveLength(0);
    });
  });

  describe('listByScope', () => {
    it('should list only shared adapters', async () => {
      const config1: AnthropicAdapterConfig = {
        id: 'adapter-7',
        name: 'Shared Adapter 1',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      const config2: OpenAIAdapterConfig = {
        id: 'adapter-8',
        name: 'Private Adapter 1',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-2',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      await store.save(config1);
      await store.save(config2);

      const sharedAdapters = await store.listByScope('shared');
      expect(sharedAdapters).toHaveLength(1);
      expect(sharedAdapters[0].id).toBe('adapter-7');
    });

    it('should list only private adapters', async () => {
      const config1: AnthropicAdapterConfig = {
        id: 'adapter-9',
        name: 'Shared Adapter 2',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      const config2: OpenAIAdapterConfig = {
        id: 'adapter-10',
        name: 'Private Adapter 2',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-2',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      await store.save(config1);
      await store.save(config2);

      const privateAdapters = await store.listByScope('private');
      expect(privateAdapters).toHaveLength(1);
      expect(privateAdapters[0].id).toBe('adapter-10');
    });
  });

  describe('listByOwner', () => {
    it('should list adapters by owner', async () => {
      const config1: AnthropicAdapterConfig = {
        id: 'adapter-11',
        name: 'User 1 Adapter 1',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      const config2: OpenAIAdapterConfig = {
        id: 'adapter-12',
        name: 'User 1 Adapter 2',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      const config3: AnthropicAdapterConfig = {
        id: 'adapter-13',
        name: 'User 2 Adapter',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'user-2',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      await store.save(config1);
      await store.save(config2);
      await store.save(config3);

      const user1Adapters = await store.listByOwner('user-1');
      expect(user1Adapters).toHaveLength(2);
      expect(user1Adapters.map(a => a.id)).toContain('adapter-11');
      expect(user1Adapters.map(a => a.id)).toContain('adapter-12');
    });
  });

  describe('delete', () => {
    it('should delete an existing adapter', async () => {
      const config: AnthropicAdapterConfig = {
        id: 'adapter-14',
        name: 'To Be Deleted',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      await store.save(config);
      expect(await store.exists('adapter-14')).toBe(true);

      await store.delete('adapter-14');
      expect(await store.exists('adapter-14')).toBe(false);
    });

    it('should throw error when deleting non-existent adapter', async () => {
      await expect(store.delete('non-existent')).rejects.toThrow('Adapter configuration not found');
    });
  });

  describe('exists', () => {
    it('should return true for existing adapter', async () => {
      const config: AnthropicAdapterConfig = {
        id: 'adapter-15',
        name: 'Exists Test',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      await store.save(config);
      expect(await store.exists('adapter-15')).toBe(true);
    });

    it('should return false for non-existent adapter', async () => {
      expect(await store.exists('non-existent')).toBe(false);
    });
  });
});
