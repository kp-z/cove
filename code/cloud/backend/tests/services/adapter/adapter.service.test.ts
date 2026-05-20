import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AdapterService } from '../../../src/application/services/adapter/adapter.service';
import { FileSystemAdapterConfigStore } from '../../../src/infrastructure/persistence/file-system-adapter-config-store';
import { FileLockManager } from '../../../src/application/services/lock/file-lock-manager.service';
import { AuditLogger } from '../../../src/application/services/audit/audit-logger.service';
import { FileSystemAuditLogStore } from '../../../src/application/services/audit/file-system-audit-log-store';
import { SecretManager } from '../../../src/application/services/secret/secret-manager.service';
import { AnthropicAdapterConfig, OpenAIAdapterConfig } from '../../../src/domain/models/adapter/adapter-config.entity';

describe('AdapterService', () => {
  let service: AdapterService;
  let store: FileSystemAdapterConfigStore;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adapter-service-test-'));

    // Create lock manager
    const lockDir = path.join(testDir, 'locks');
    await fs.mkdir(lockDir, { recursive: true });
    const lockManager = new FileLockManager(lockDir);

    // Create audit logger
    const auditLogDir = path.join(testDir, 'audit-logs');
    await fs.mkdir(auditLogDir, { recursive: true });
    const auditLogStore = new FileSystemAuditLogStore(auditLogDir);
    const auditLogger = new AuditLogger(auditLogStore);

    // Create store
    store = new FileSystemAdapterConfigStore(testDir, lockManager, auditLogger);

    // Create service
    service = new AdapterService(store);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('create', () => {
    it('should create a new shared adapter', async () => {
      const config: Omit<AnthropicAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Test Anthropic Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: 4096,
        },
      };

      const created = await service.create(config, 'user-1');

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Test Anthropic Adapter');
      expect(created.scope).toBe('shared');
      expect(created.created_at).toBeInstanceOf(Date);
      expect(created.updated_at).toBeInstanceOf(Date);
    });

    it('should create a new private adapter', async () => {
      const config: Omit<OpenAIAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Test OpenAI Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-2',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
          temperature: 0.5,
          max_tokens: 2048,
        },
      };

      const created = await service.create(config, 'user-2');

      expect(created.scope).toBe('private');
      expect(created.owner_id).toBe('user-2');
    });

    it('should throw error when creating shared adapter for another user', async () => {
      const config: Omit<AnthropicAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Test Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      await expect(service.create(config, 'user-2')).rejects.toThrow(
        'Cannot create shared adapter for another user',
      );
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig: any = {
        name: 'Invalid Adapter',
        type: 'invalid-type',
        scope: 'shared',
        owner_id: 'user-1',
        config: {},
      };

      await expect(service.create(invalidConfig, 'user-1')).rejects.toThrow(
        'Invalid adapter configuration',
      );
    });
  });

  describe('getById', () => {
    it('should get a shared adapter', async () => {
      const config: Omit<AnthropicAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Shared Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      const created = await service.create(config, 'user-1');
      const retrieved = await service.getById(created.id, 'user-2');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get own private adapter', async () => {
      const config: Omit<OpenAIAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Private Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      const created = await service.create(config, 'user-1');
      const retrieved = await service.getById(created.id, 'user-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should throw error when accessing another user\'s private adapter', async () => {
      const config: Omit<OpenAIAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Private Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      const created = await service.create(config, 'user-1');

      await expect(service.getById(created.id, 'user-2')).rejects.toThrow(
        'Access denied: cannot access private adapter of another user',
      );
    });

    it('should return null for non-existent adapter', async () => {
      const retrieved = await service.getById('non-existent', 'user-1');
      expect(retrieved).toBeNull();
    });
  });

  describe('update', () => {
    it('should update own adapter', async () => {
      const config: Omit<AnthropicAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Original Name',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      const created = await service.create(config, 'user-1');
      const updated = await service.update(created.id, { name: 'Updated Name' }, 'user-1');

      expect(updated.name).toBe('Updated Name');
      expect(updated.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should throw error when updating another user\'s adapter', async () => {
      const config: Omit<OpenAIAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Private Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      const created = await service.create(config, 'user-1');

      await expect(service.update(created.id, { name: 'Hacked' }, 'user-2')).rejects.toThrow(
        'Access denied',
      );
    });

    it('should throw error for non-existent adapter', async () => {
      await expect(service.update('non-existent', { name: 'New Name' }, 'user-1')).rejects.toThrow(
        'Adapter configuration not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete own adapter', async () => {
      const config: Omit<AnthropicAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'To Be Deleted',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      const created = await service.create(config, 'user-1');
      await service.delete(created.id, 'user-1');

      const retrieved = await service.getById(created.id, 'user-1');
      expect(retrieved).toBeNull();
    });

    it('should throw error when deleting another user\'s adapter', async () => {
      const config: Omit<OpenAIAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Private Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      const created = await service.create(config, 'user-1');

      await expect(service.delete(created.id, 'user-2')).rejects.toThrow('Access denied');
    });
  });

  describe('list', () => {
    it('should list shared adapters and own private adapters', async () => {
      const sharedConfig: Omit<AnthropicAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Shared Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      const privateConfig: Omit<OpenAIAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Private Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-2',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      await service.create(sharedConfig, 'user-1');
      await service.create(privateConfig, 'user-2');

      const user2List = await service.list('user-2');

      expect(user2List).toHaveLength(2); // Shared + own private
      expect(user2List.some(a => a.scope === 'shared')).toBe(true);
      expect(user2List.some(a => a.scope === 'private' && a.owner_id === 'user-2')).toBe(true);
    });
  });

  describe('fork', () => {
    it('should fork a shared adapter to private', async () => {
      const sharedConfig: Omit<AnthropicAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Shared Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
        },
      };

      const shared = await service.create(sharedConfig, 'user-1');
      const forked = await service.fork(shared.id, 'user-2', 'My Custom Adapter');

      expect(forked.scope).toBe('private');
      expect(forked.owner_id).toBe('user-2');
      expect(forked.name).toBe('My Custom Adapter');
      expect(forked.config).toEqual(shared.config);
      expect(forked.id).not.toBe(shared.id);
    });

    it('should throw error when forking private adapter', async () => {
      const privateConfig: Omit<OpenAIAdapterConfig, 'id' | 'created_at' | 'updated_at'> = {
        name: 'Private Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user-1',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4',
        },
      };

      const created = await service.create(privateConfig, 'user-1');

      await expect(service.fork(created.id, 'user-2')).rejects.toThrow(
        'Can only fork shared adapters',
      );
    });
  });

  describe('resolveApiKey', () => {
    it('should resolve environment variable reference', async () => {
      process.env.TEST_API_KEY = 'test-key-123';

      const resolved = await service.resolveApiKey('env:TEST_API_KEY');

      expect(resolved).toBe('test-key-123');

      delete process.env.TEST_API_KEY;
    });

    it('should throw error for missing environment variable', async () => {
      await expect(service.resolveApiKey('env:MISSING_VAR')).rejects.toThrow(
        'Environment variable not found: MISSING_VAR',
      );
    });

    it('should throw error for invalid reference format', async () => {
      await expect(service.resolveApiKey('invalid-format')).rejects.toThrow(
        'Invalid API key format: invalid-format',
      );
    });

    it('should throw error for vault (not yet implemented)', async () => {
      await expect(service.resolveApiKey('vault:path/to/secret')).rejects.toThrow(
        'Vault secret resolution not yet implemented',
      );
    });
  });
});
