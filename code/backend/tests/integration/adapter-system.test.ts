/**
 * Integration Tests for Adapter System
 *
 * These tests verify the adapter configuration system works end-to-end.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AdapterService } from '../../src/application/services/adapter/adapter.service';
import { FileSystemAdapterConfigStore } from '../../src/infrastructure/persistence/file-system-adapter-config-store';
import { FileLockManager } from '../../src/application/services/lock/file-lock-manager.service';
import { AuditLogger } from '../../src/application/services/audit/audit-logger.service';
import { FileSystemAuditLogStore } from '../../src/application/services/audit/file-system-audit-log-store';
import { LlmAdapterFactory } from '../../src/infrastructure/adapters/llm/llm-adapter-factory';
import type { AdapterConfig } from '../../src/domain/models/adapter/adapter-config.entity';

describe('Adapter System Integration', () => {
  const testDir = path.join(process.cwd(), '.test-cove-adapter-system');
  let adapterService: AdapterService;
  let adapterFactory: LlmAdapterFactory;

  beforeEach(async () => {
    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'adapters', 'shared'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'adapters', 'private'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.locks'), { recursive: true });

    // Initialize services
    const lockManager = new FileLockManager();
    const auditLogStore = new FileSystemAuditLogStore(testDir);
    const auditLogger = new AuditLogger(auditLogStore);

    const adapterConfigStore = new FileSystemAdapterConfigStore(testDir, lockManager, auditLogger);
    adapterService = new AdapterService(adapterConfigStore);
    adapterFactory = new LlmAdapterFactory(adapterService);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Adapter CRUD Operations', () => {
    it('should create and retrieve an Anthropic adapter', async () => {
      const adapter = await adapterService.create({
        name: 'Test Anthropic Adapter',
        description: 'Test adapter for Anthropic API',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'test-user',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: 4096,
        },
      }, 'test-user');

      expect(adapter.id).toBeDefined();
      expect(adapter.name).toBe('Test Anthropic Adapter');
      expect(adapter.type).toBe('anthropic-api');

      // Retrieve it
      const retrieved = await adapterService.getById(adapter.id, 'test-user');
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(adapter.id);
      expect(retrieved.config.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should create and retrieve an OpenAI adapter', async () => {
      const adapter = await adapterService.create({
        name: 'Test OpenAI Adapter',
        type: 'openai-api',
        scope: 'shared',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4o',
          temperature: 0.8,
          max_tokens: 2048,
        },
      }, 'system');

      expect(adapter.id).toBeDefined();
      expect(adapter.type).toBe('openai-api');
      expect(adapter.scope).toBe('shared');

      const retrieved = await adapterService.getById(adapter.id, 'any-user');
      expect(retrieved).toBeDefined();
      expect(retrieved.config.model).toBe('gpt-4o');
    });

    it('should create and retrieve a Claude Code CLI adapter', async () => {
      const adapter = await adapterService.create({
        name: 'Test Claude CLI Adapter',
        type: 'claude-code-cli',
        scope: 'private',
        owner_id: 'test-user',
        config: {
          cli_path: '/usr/local/bin/claude',
          working_dir: '/tmp/claude-workspace',
          model: 'claude-sonnet-4-20250514',
        },
      }, 'test-user');

      expect(adapter.id).toBeDefined();
      expect(adapter.type).toBe('claude-code-cli');

      const retrieved = await adapterService.getById(adapter.id, 'test-user');
      expect(retrieved).toBeDefined();
      expect(retrieved.config.cli_path).toBe('/usr/local/bin/claude');
    });

    it('should list adapters by scope', async () => {
      // Create shared adapter
      await adapterService.create({
        name: 'Shared Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      }, 'system');

      // Create private adapter
      await adapterService.create({
        name: 'Private Adapter',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'user1',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4o',
        },
      }, 'user1');

      // List all adapters for user1
      const adapters = await adapterService.list('user1');
      expect(adapters.length).toBeGreaterThanOrEqual(2);

      // Should include both shared and user's private adapters
      const sharedCount = adapters.filter(a => a.scope === 'shared').length;
      const privateCount = adapters.filter(a => a.scope === 'private' && a.owner_id === 'user1').length;

      expect(sharedCount).toBeGreaterThanOrEqual(1);
      expect(privateCount).toBeGreaterThanOrEqual(1);
    });

    it('should update an adapter', async () => {
      const adapter = await adapterService.create({
        name: 'Original Name',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'test-user',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
        },
      }, 'test-user');

      // Update it
      const updated = await adapterService.update(adapter.id, {
        name: 'Updated Name',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.9, // Changed
        },
      }, 'test-user');

      expect(updated.name).toBe('Updated Name');
      expect(updated.config.temperature).toBe(0.9);
    });

    it('should delete an adapter', async () => {
      const adapter = await adapterService.create({
        name: 'To Be Deleted',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'test-user',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      }, 'test-user');

      // Delete it
      await adapterService.delete(adapter.id, 'test-user');

      // Should not be retrievable (getById returns null for deleted adapters)
      const retrieved = await adapterService.getById(adapter.id, 'test-user');
      expect(retrieved).toBeNull();
    });
  });

  describe('Adapter Factory', () => {
    it('should create adapter config that can be used by factory', async () => {
      // Create adapter config
      const adapterConfig = await adapterService.create({
        name: 'Factory Test Adapter',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'test-user',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
        },
      }, 'test-user');

      expect(adapterConfig.id).toBeDefined();
      expect(adapterConfig.type).toBe('anthropic-api');

      // Note: We can't test actual LLM adapter creation without real API keys
      // The factory integration is tested in unit tests with mocked dependencies
    });

    it('should retrieve adapter config by ID for factory use', async () => {
      const adapterConfig = await adapterService.create({
        name: 'Factory Test Adapter 2',
        type: 'openai-api',
        scope: 'private',
        owner_id: 'test-user',
        config: {
          api_key_ref: 'env:OPENAI_API_KEY',
          model: 'gpt-4o',
        },
      }, 'test-user');

      // Retrieve by ID
      const retrieved = await adapterService.getById(adapterConfig.id, 'test-user');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(adapterConfig.id);
      expect(retrieved?.type).toBe('openai-api');

      // Note: Actual LLM adapter creation requires real API keys
    });
  });

  describe('Permission Control', () => {
    it('should allow owner to access private adapter', async () => {
      const adapter = await adapterService.create({
        name: 'Private Adapter',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'owner-user',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      }, 'owner-user');

      // Owner should be able to access
      const retrieved = await adapterService.getById(adapter.id, 'owner-user');
      expect(retrieved).toBeDefined();
    });

    it('should deny non-owner access to private adapter', async () => {
      const adapter = await adapterService.create({
        name: 'Private Adapter',
        type: 'anthropic-api',
        scope: 'private',
        owner_id: 'owner-user',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      }, 'owner-user');

      // Non-owner should not be able to access
      await expect(
        adapterService.getById(adapter.id, 'other-user')
      ).rejects.toThrow();
    });

    it('should allow anyone to access shared adapter', async () => {
      const adapter = await adapterService.create({
        name: 'Shared Adapter',
        type: 'anthropic-api',
        scope: 'shared',
        config: {
          api_key_ref: 'env:ANTHROPIC_API_KEY',
          model: 'claude-3-5-sonnet-20241022',
        },
      }, 'system');

      // Any user should be able to access
      const retrieved1 = await adapterService.getById(adapter.id, 'user1');
      const retrieved2 = await adapterService.getById(adapter.id, 'user2');

      expect(retrieved1).toBeDefined();
      expect(retrieved2).toBeDefined();
    });
  });
});
