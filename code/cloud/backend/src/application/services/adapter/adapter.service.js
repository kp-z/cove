"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterService = void 0;
const adapter_config_validation_1 = require("../../../domain/models/adapter/adapter-config.validation");
const crypto = __importStar(require("crypto"));
/**
 * Adapter Configuration Service
 *
 * Provides high-level operations for managing adapter configurations
 */
class AdapterService {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Create a new adapter configuration
     */
    async create(config, actorId) {
        // Generate ID
        const id = crypto.randomUUID();
        // Build full configuration
        const fullConfig = {
            ...config,
            id,
            created_at: new Date(),
            updated_at: new Date(),
        };
        // Validate configuration
        const validationResult = adapter_config_validation_1.adapterConfigSchema.safeParse(fullConfig);
        if (!validationResult.success) {
            throw new Error(`Invalid adapter configuration: ${validationResult.error.message}`);
        }
        // Check permissions
        if (config.scope === 'shared' && config.owner_id && config.owner_id !== actorId) {
            throw new Error('Cannot create shared adapter for another user');
        }
        if (config.scope === 'private' && config.owner_id !== actorId) {
            throw new Error('Cannot create private adapter for another user');
        }
        // Save to store
        await this.store.save(fullConfig);
        return fullConfig;
    }
    /**
     * Get an adapter configuration by ID
     * @param skipPermissionCheck - Skip permission check for internal queries (default: false)
     */
    async getById(id, actorId, skipPermissionCheck = false) {
        const config = await this.store.getById(id);
        if (!config) {
            return null;
        }
        // Check permissions (unless explicitly skipped for internal queries)
        if (!skipPermissionCheck && config.scope === 'private' && config.owner_id !== actorId) {
            throw new Error('Access denied: cannot access private adapter of another user');
        }
        return config;
    }
    /**
     * Update an adapter configuration
     */
    async update(id, updates, actorId) {
        // Get existing config
        const existing = await this.store.getById(id);
        if (!existing) {
            throw new Error(`Adapter configuration not found: ${id}`);
        }
        // Check permissions
        if (existing.scope === 'private' && existing.owner_id !== actorId) {
            throw new Error('Access denied: cannot update private adapter of another user');
        }
        if (existing.scope === 'shared' && existing.owner_id !== actorId) {
            throw new Error('Access denied: cannot update shared adapter of another user');
        }
        // Merge updates
        const updatedConfig = {
            ...existing,
            ...updates,
            id: existing.id,
            scope: existing.scope,
            created_at: existing.created_at,
            updated_at: new Date(),
        };
        // Validate
        const validationResult = adapter_config_validation_1.adapterConfigSchema.safeParse(updatedConfig);
        if (!validationResult.success) {
            throw new Error(`Invalid adapter configuration: ${validationResult.error.message}`);
        }
        // Save
        await this.store.save(updatedConfig);
        return updatedConfig;
    }
    /**
     * Delete an adapter configuration
     */
    async delete(id, actorId) {
        // Get existing config
        const existing = await this.store.getById(id);
        if (!existing) {
            throw new Error(`Adapter configuration not found: ${id}`);
        }
        // Check permissions
        if (existing.scope === 'private' && existing.owner_id !== actorId) {
            throw new Error('Access denied: cannot delete private adapter of another user');
        }
        if (existing.scope === 'shared' && existing.owner_id !== actorId) {
            throw new Error('Access denied: cannot delete shared adapter of another user');
        }
        // Delete
        await this.store.delete(id);
    }
    /**
     * List all adapters accessible to the actor
     */
    async list(actorId) {
        const allConfigs = await this.store.list();
        // Filter: shared adapters + private adapters owned by actor
        return allConfigs.filter(config => config.scope === 'shared' || config.owner_id === actorId);
    }
    /**
     * List adapters by scope
     */
    async listByScope(scope, actorId) {
        const configs = await this.store.listByScope(scope);
        // Filter private adapters by owner
        if (scope === 'private') {
            return configs.filter(config => config.owner_id === actorId);
        }
        return configs;
    }
    /**
     * List adapters owned by the actor
     */
    async listOwned(actorId) {
        return await this.store.listByOwner(actorId);
    }
    /**
     * Fork a shared adapter to create a private copy
     */
    async fork(sharedAdapterId, actorId, newName) {
        // Get the shared adapter
        const sharedAdapter = await this.store.getById(sharedAdapterId);
        if (!sharedAdapter) {
            throw new Error(`Adapter configuration not found: ${sharedAdapterId}`);
        }
        if (sharedAdapter.scope !== 'shared') {
            throw new Error('Can only fork shared adapters');
        }
        // Create a private copy
        const forkedConfig = {
            ...sharedAdapter,
            name: newName || `${sharedAdapter.name} (forked)`,
            scope: 'private',
            owner_id: actorId,
        };
        return await this.create(forkedConfig, actorId);
    }
    /**
     * Resolve API key reference to actual value
     *
     * Supports three formats:
     * - env:VAR_NAME - Read from environment variable
     * - vault:SECRET_ID - Read from vault (not yet implemented)
     * - Direct key - Use the key as-is (e.g., sk-xxx...)
     */
    async resolveApiKey(apiKeyRef) {
        // Check if it's a reference format (env: or vault:)
        const match = apiKeyRef.match(/^(env|vault):(.+)$/);
        if (!match) {
            // Not a reference format, treat as direct API key
            // Validate it looks like a key (starts with common prefixes)
            if (apiKeyRef.startsWith('sk-') || apiKeyRef.startsWith('api-') || apiKeyRef.length > 20) {
                return apiKeyRef;
            }
            throw new Error(`Invalid API key format: ${apiKeyRef}`);
        }
        const type = match[1];
        const path = match[2];
        if (!type || !path) {
            throw new Error(`Invalid API key reference format: ${apiKeyRef}`);
        }
        if (type === 'env') {
            const value = process.env[path];
            if (!value) {
                throw new Error(`Environment variable not found: ${path}`);
            }
            return value;
        }
        if (type === 'vault') {
            // For now, vault is not implemented, throw error
            throw new Error('Vault secret resolution not yet implemented');
        }
        throw new Error(`Unknown secret type: ${type}`);
    }
}
exports.AdapterService = AdapterService;
