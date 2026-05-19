import { AdapterConfig, AdapterScope } from '../../domain/models/adapter/adapter-config.entity';
import { Transaction } from './transaction.interface';

/**
 * Adapter Configuration Store Interface
 *
 * Defines the contract for storing and retrieving adapter configurations
 */
export interface IAdapterConfigStore {
  /**
   * Save an adapter configuration
   */
  save(config: AdapterConfig, tx?: Transaction): Promise<void>;

  /**
   * Get an adapter configuration by ID
   */
  getById(id: string): Promise<AdapterConfig | null>;

  /**
   * List all adapter configurations
   */
  list(): Promise<AdapterConfig[]>;

  /**
   * List adapter configurations by scope
   */
  listByScope(scope: AdapterScope): Promise<AdapterConfig[]>;

  /**
   * List adapter configurations by owner
   */
  listByOwner(ownerId: string): Promise<AdapterConfig[]>;

  /**
   * Delete an adapter configuration
   */
  delete(id: string, tx?: Transaction): Promise<void>;

  /**
   * Check if an adapter configuration exists
   */
  exists(id: string): Promise<boolean>;
}
