import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IAdapterConfigStore } from '../../application/interfaces/adapter-config-store.interface';
import { AdapterConfig, AdapterScope } from '../../domain/models/adapter/adapter-config.entity';
import { Transaction } from '../../application/interfaces/transaction.interface';
import { ILockManager } from '../../application/services/lock/lock-manager.interface';
import { IAuditLogger } from '../../application/services/audit/audit-logger.interface';
import { adapterConfigSchema } from '../../domain/models/adapter/adapter-config.validation';

/**
 * File System Adapter Configuration Store
 *
 * Stores adapter configurations as YAML files in the file system:
 * - .cove/adapters/shared/{id}.yaml
 * - .cove/adapters/private/{id}.yaml
 */
export class FileSystemAdapterConfigStore implements IAdapterConfigStore {
  private readonly locksDir: string;

  constructor(
    private readonly baseDir: string,
    private readonly lockManager: ILockManager,
    private readonly auditLogger: IAuditLogger,
  ) {
    this.locksDir = path.join(baseDir, '.locks');
  }

  private getAdapterPath(id: string, scope: AdapterScope): string {
    return path.join(this.baseDir, 'adapters', scope, `${id}.yaml`);
  }

  private getLockPath(id: string): string {
    return path.join(this.locksDir, `${id}.lock`);
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async ensureLockFile(lockPath: string): Promise<void> {
    try {
      await fs.writeFile(lockPath, '', { flag: 'wx' });
    } catch (error) {
      // Ignore if file already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async save(config: AdapterConfig, _tx?: Transaction): Promise<void> {
    // Validate configuration
    const validationResult = adapterConfigSchema.safeParse(config);
    if (!validationResult.success) {
      throw new Error(`Invalid adapter configuration: ${validationResult.error.message}`);
    }

    const adapterPath = this.getAdapterPath(config.id, config.scope);
    const dirPath = path.dirname(adapterPath);

    // Ensure directories exist
    await this.ensureDirectory(dirPath);
    await this.ensureDirectory(this.locksDir);

    // Create and use lock file
    const lockPath = this.getLockPath(config.id);
    await this.ensureLockFile(lockPath);

    try {
      await this.lockManager.acquire(lockPath);

      // Check if this is an update or create
      const exists = await this.exists(config.id);
      const operation = exists ? 'update' : 'create';

      // Serialize to YAML
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });

      // Write to file
      await fs.writeFile(adapterPath, yamlContent, 'utf-8');

      // Log audit entry
      await this.auditLogger.log({
        action: `adapter.${operation}`,
        resource_type: 'adapter',
        resource_id: config.id,
        actor_id: config.owner_id || 'system',
        changes: {
          adapter_type: config.type,
          adapter_scope: config.scope,
          adapter_name: config.name,
        },
      });
    } finally {
      await this.lockManager.release(lockPath);
    }
  }

  async getById(id: string): Promise<AdapterConfig | null> {
    // Try both scopes
    for (const scope of ['shared', 'private'] as AdapterScope[]) {
      const adapterPath = this.getAdapterPath(id, scope);

      try {
        const content = await fs.readFile(adapterPath, 'utf-8');
        const config = yaml.load(content) as AdapterConfig;

        // Validate configuration
        const validationResult = adapterConfigSchema.safeParse(config);
        if (!validationResult.success) {
          throw new Error(`Invalid adapter configuration in ${adapterPath}: ${validationResult.error.message}`);
        }

        return config;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // File not found, try next scope
          continue;
        }
        throw error;
      }
    }

    return null;
  }

  async list(): Promise<AdapterConfig[]> {
    const configs: AdapterConfig[] = [];

    for (const scope of ['shared', 'private'] as AdapterScope[]) {
      const scopeDir = path.join(this.baseDir, 'adapters', scope);

      try {
        const files = await fs.readdir(scopeDir);

        for (const file of files) {
          if (file.endsWith('.yaml')) {
            const filePath = path.join(scopeDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const config = yaml.load(content) as AdapterConfig;

            // Validate configuration
            const validationResult = adapterConfigSchema.safeParse(config);
            if (validationResult.success) {
              configs.push(config);
            }
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // Directory doesn't exist yet, skip
          continue;
        }
        throw error;
      }
    }

    return configs;
  }

  async listByScope(scope: AdapterScope): Promise<AdapterConfig[]> {
    const configs: AdapterConfig[] = [];
    const scopeDir = path.join(this.baseDir, 'adapters', scope);

    try {
      const files = await fs.readdir(scopeDir);

      for (const file of files) {
        if (file.endsWith('.yaml')) {
          const filePath = path.join(scopeDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const config = yaml.load(content) as AdapterConfig;

          // Validate configuration
          const validationResult = adapterConfigSchema.safeParse(config);
          if (validationResult.success) {
            configs.push(config);
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Directory doesn't exist yet, return empty array
        return [];
      }
      throw error;
    }

    return configs;
  }

  async listByOwner(ownerId: string): Promise<AdapterConfig[]> {
    const allConfigs = await this.list();
    return allConfigs.filter(config => config.owner_id === ownerId);
  }

  async delete(id: string, _tx?: Transaction): Promise<void> {
    // Find the adapter first to get its scope
    const config = await this.getById(id);
    if (!config) {
      throw new Error(`Adapter configuration not found: ${id}`);
    }

    const adapterPath = this.getAdapterPath(id, config.scope);

    // Ensure lock directory and file exist
    await this.ensureDirectory(this.locksDir);
    const lockPath = this.getLockPath(id);
    await this.ensureLockFile(lockPath);

    try {
      await this.lockManager.acquire(lockPath);

      // Delete the file
      await fs.unlink(adapterPath);

      // Log audit entry
      await this.auditLogger.log({
        action: 'adapter.delete',
        resource_type: 'adapter',
        resource_id: id,
        actor_id: config.owner_id || 'system',
        changes: {
          adapter_type: config.type,
          adapter_scope: config.scope,
          adapter_name: config.name,
        },
      });
    } finally {
      await this.lockManager.release(lockPath);
    }
  }

  async exists(id: string): Promise<boolean> {
    const config = await this.getById(id);
    return config !== null;
  }
}
