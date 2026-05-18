import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecretManager } from '../../../src/application/services/secret/secret-manager.service';

describe('SecretManager', () => {
  let secretManager: SecretManager;
  const originalEnv = process.env;

  beforeEach(() => {
    secretManager = new SecretManager();
    // Create a copy of process.env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('resolve', () => {
    it('should resolve environment variable reference', async () => {
      process.env.TEST_API_KEY = 'test-key-123';

      const result = await secretManager.resolve('env:TEST_API_KEY');

      expect(result).toBe('test-key-123');
    });

    it('should throw error for missing environment variable', async () => {
      await expect(
        secretManager.resolve('env:MISSING_VAR')
      ).rejects.toThrow('Environment variable not found: MISSING_VAR');
    });

    it('should throw error for invalid reference format', async () => {
      await expect(
        secretManager.resolve('invalid-format')
      ).rejects.toThrow('Invalid secret reference format');
    });

    it('should throw error for empty path', async () => {
      await expect(
        secretManager.resolve('env:')
      ).rejects.toThrow('Empty path in secret reference');
    });

    it('should throw error for unknown secret type', async () => {
      await expect(
        secretManager.resolve('unknown:some-path')
      ).rejects.toThrow('Unknown secret type: unknown');
    });

    it('should throw error for vault (not implemented)', async () => {
      await expect(
        secretManager.resolve('vault:prod/api-key')
      ).rejects.toThrow('Vault integration not implemented yet');
    });
  });
});
