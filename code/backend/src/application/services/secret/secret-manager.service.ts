import { ISecretManager } from './secret-manager.interface';

/**
 * Secret Manager Implementation
 *
 * Resolves secret references from various backends.
 * Currently supports:
 * - env: Environment variables
 * - vault: (TODO) HashiCorp Vault or similar
 */
export class SecretManager implements ISecretManager {
  async resolve(ref: string): Promise<string> {
    const colonIndex = ref.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid secret reference format: ${ref}. Expected "type:path"`);
    }

    const type = ref.substring(0, colonIndex);
    const path = ref.substring(colonIndex + 1);

    if (!path) {
      throw new Error(`Empty path in secret reference: ${ref}`);
    }

    switch (type) {
      case 'env':
        return this.resolveFromEnv(path);

      case 'vault':
        return this.resolveFromVault(path);

      default:
        throw new Error(`Unknown secret type: ${type}. Supported types: env, vault`);
    }
  }

  /**
   * Resolve secret from environment variable
   */
  private resolveFromEnv(varName: string): Promise<string> {
    const value = process.env[varName];
    if (!value) {
      throw new Error(`Environment variable not found: ${varName}`);
    }
    return Promise.resolve(value);
  }

  /**
   * Resolve secret from Vault
   * TODO: Implement Vault integration
   */
  private resolveFromVault(path: string): Promise<string> {
    throw new Error(`Vault integration not implemented yet. Path: ${path}`);
  }
}
