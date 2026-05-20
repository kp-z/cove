"use strict";
/**
 * Adapter Configuration tRPC Router
 *
 * Procedures:
 * - create: 创建 Adapter 配置
 * - list: 获取 Adapter 配置列表
 * - listByScope: 按作用域获取 Adapter 配置列表
 * - getById: 获取单个 Adapter 配置
 * - update: 更新 Adapter 配置
 * - delete: 删除 Adapter 配置
 */
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
exports.claudeCodeCLIConfigSchema = exports.openaiConfigSchema = exports.anthropicConfigSchema = exports.listByScopeSchema = exports.updateAdapterSchema = exports.createAdapterSchema = void 0;
exports.createAdapterRouter = createAdapterRouter;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const errors_1 = require("../../../common/errors");
const adapter_config_validation_1 = require("../../../domain/models/adapter/adapter-config.validation");
Object.defineProperty(exports, "anthropicConfigSchema", { enumerable: true, get: function () { return adapter_config_validation_1.anthropicConfigSchema; } });
Object.defineProperty(exports, "openaiConfigSchema", { enumerable: true, get: function () { return adapter_config_validation_1.openaiConfigSchema; } });
Object.defineProperty(exports, "claudeCodeCLIConfigSchema", { enumerable: true, get: function () { return adapter_config_validation_1.claudeCodeCLIConfigSchema; } });
const model_discovery_1 = require("../../adapters/llm/model-discovery");
// Input schema for creating adapter config
const createAdapterSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Adapter name is required'),
    description: zod_1.z.string().optional(),
    scope: zod_1.z.enum(['shared', 'private']),
    owner_id: zod_1.z.string().optional(),
    adapter: adapter_config_validation_1.adapterConfigSchema,
});
exports.createAdapterSchema = createAdapterSchema;
// Input schema for updating adapter config
const updateAdapterSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    adapter: adapter_config_validation_1.adapterConfigSchema.optional(),
});
exports.updateAdapterSchema = updateAdapterSchema;
// Query schema for listing by scope
const listByScopeSchema = zod_1.z.object({
    scope: zod_1.z.enum(['shared', 'private']),
    owner_id: zod_1.z.string().optional(),
});
exports.listByScopeSchema = listByScopeSchema;
function createAdapterRouter(deps) {
    return (0, trpc_1.router)({
        // Create adapter configuration
        create: trpc_1.publicProcedure
            .input(createAdapterSchema)
            .mutation(async ({ input, ctx }) => {
            try {
                const actorId = ctx.userId || 'system';
                const config = await deps.adapterService.create({
                    name: input.name,
                    description: input.description,
                    scope: input.scope,
                    owner_id: input.owner_id || actorId,
                    ...input.adapter,
                }, actorId);
                return config;
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // List all adapter configurations
        list: trpc_1.publicProcedure.query(async ({ ctx }) => {
            try {
                const actorId = ctx.userId || 'system';
                const configs = await deps.adapterService.list(actorId);
                return {
                    adapters: configs,
                    total: configs.length,
                };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // List adapter configurations by scope
        listByScope: trpc_1.publicProcedure
            .input(listByScopeSchema)
            .query(async ({ input, ctx }) => {
            try {
                const actorId = ctx.userId || 'system';
                const configs = await deps.adapterService.listByScope(input.scope, actorId);
                // Filter by owner_id if provided (for private adapters)
                let filtered = configs;
                if (input.owner_id && input.scope === 'private') {
                    filtered = configs.filter(c => c.owner_id === input.owner_id);
                }
                return {
                    adapters: filtered,
                    total: filtered.length,
                };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Get adapter configuration by ID
        getById: trpc_1.publicProcedure
            .input(zod_1.z.object({ adapterId: zod_1.z.string() }))
            .query(async ({ input, ctx }) => {
            try {
                const actorId = ctx.userId || 'system';
                const config = await deps.adapterService.getById(input.adapterId, actorId);
                return config;
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Update adapter configuration
        update: trpc_1.publicProcedure
            .input(zod_1.z.object({
            adapterId: zod_1.z.string(),
            data: updateAdapterSchema,
        }))
            .mutation(async ({ input, ctx }) => {
            try {
                const actorId = ctx.userId || 'system';
                const updates = {};
                if (input.data.name) {
                    updates.name = input.data.name;
                }
                if (input.data.description !== undefined) {
                    updates.description = input.data.description;
                }
                if (input.data.adapter) {
                    updates.type = input.data.adapter.type;
                    updates.config = input.data.adapter.config;
                }
                const config = await deps.adapterService.update(input.adapterId, updates, actorId);
                return config;
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Delete adapter configuration
        delete: trpc_1.publicProcedure
            .input(zod_1.z.object({ adapterId: zod_1.z.string() }))
            .mutation(async ({ input, ctx }) => {
            try {
                const actorId = ctx.userId || 'system';
                await deps.adapterService.delete(input.adapterId, actorId);
                return { adapterId: input.adapterId, deleted: true };
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Get available models for an adapter
        getAvailableModels: trpc_1.publicProcedure
            .input(zod_1.z.object({ adapterId: zod_1.z.string() }))
            .query(async ({ input, ctx }) => {
            try {
                const actorId = ctx.userId || 'system';
                const adapter = await deps.adapterService.getById(input.adapterId, actorId);
                if (!adapter) {
                    throw new Error('Adapter not found');
                }
                // Only support model discovery for anthropic-api and openai-api
                if (adapter.type !== 'anthropic-api' && adapter.type !== 'openai-api') {
                    throw new Error(`Model discovery not supported for adapter type: ${adapter.type}`);
                }
                // Extract configuration - type guard ensures we have the right config structure
                const config = adapter.config;
                const baseURL = config.base_url;
                const customHeaders = config.custom_headers;
                // Resolve API key for OpenAI
                let apiKey;
                if (adapter.type === 'openai-api') {
                    if (config.api_key) {
                        apiKey = config.api_key;
                    }
                    else if (config.api_key_ref) {
                        apiKey = await deps.adapterService.resolveApiKey(config.api_key_ref);
                    }
                }
                const result = await (0, model_discovery_1.getAvailableModels)(adapter.type, baseURL, customHeaders, apiKey);
                return result;
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Discover models with temporary config (for creating new adapters)
        discoverModels: trpc_1.publicProcedure
            .input(zod_1.z.object({
            adapterType: zod_1.z.enum(['anthropic-api', 'openai-api', 'claude-code-cli']),
            baseURL: zod_1.z.string().optional(),
            apiKey: zod_1.z.string().optional(),
            customHeaders: zod_1.z.record(zod_1.z.string()).optional(),
        }))
            .query(async ({ input }) => {
            try {
                const { adapterType, baseURL, apiKey, customHeaders } = input;
                // Only support model discovery for anthropic-api and openai-api
                if (adapterType !== 'anthropic-api' && adapterType !== 'openai-api') {
                    throw new Error(`Model discovery not supported for adapter type: ${adapterType}`);
                }
                const result = await (0, model_discovery_1.getAvailableModels)(adapterType, baseURL, customHeaders, apiKey);
                return result;
            }
            catch (error) {
                throw (0, errors_1.mapErrorToTRPC)(error);
            }
        }),
        // Get all adapter type metadata
        getAdapterTypes: trpc_1.publicProcedure.query(async () => {
            return deps.adapterMetadataService.getAdapterTypes();
        }),
        // Get single adapter type metadata
        getAdapterType: trpc_1.publicProcedure
            .input(zod_1.z.object({
            type: zod_1.z.enum(['anthropic-api', 'openai-api', 'claude-code-cli']),
        }))
            .query(async ({ input }) => {
            const metadata = deps.adapterMetadataService.getAdapterType(input.type);
            if (!metadata) {
                throw new Error(`Unknown adapter type: ${input.type}`);
            }
            return metadata;
        }),
        // Test adapter connection
        testConnection: trpc_1.publicProcedure
            .input(zod_1.z.object({ adapterId: zod_1.z.string() }))
            .mutation(async ({ input, ctx }) => {
            try {
                const actorId = ctx.userId || 'system';
                const adapter = await deps.adapterService.getById(input.adapterId, actorId);
                if (!adapter) {
                    throw new Error('Adapter not found');
                }
                const startTime = Date.now();
                const adapterType = adapter.type;
                switch (adapterType) {
                    case 'anthropic-api':
                    case 'openai-api': {
                        const config = adapter.config;
                        const baseURL = config.base_url;
                        const customHeaders = config.custom_headers;
                        let apiKey;
                        if (adapter.type === 'openai-api') {
                            if (config.api_key) {
                                apiKey = config.api_key;
                            }
                            else if (config.api_key_ref) {
                                apiKey = await deps.adapterService.resolveApiKey(config.api_key_ref);
                            }
                        }
                        const result = await (0, model_discovery_1.getAvailableModels)(adapter.type, baseURL, customHeaders, apiKey);
                        const latency = Date.now() - startTime;
                        return {
                            success: true,
                            message: 'Connection successful',
                            details: {
                                provider: result.provider,
                                modelCount: result.models.length,
                                latency,
                            },
                        };
                    }
                    case 'claude-code-cli': {
                        const config = adapter.config;
                        const cliPath = config.cli_path || 'claude';
                        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                        const path = await Promise.resolve().then(() => __importStar(require('path')));
                        try {
                            if (!path.isAbsolute(cliPath)) {
                                const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
                                try {
                                    const isWindows = process.platform === 'win32';
                                    const command = isWindows ? `where ${cliPath}` : `which ${cliPath}`;
                                    const fullPath = execSync(command, { encoding: 'utf-8' }).trim();
                                    await fs.access(fullPath, fs.constants.X_OK);
                                }
                                catch {
                                    throw new Error(`CLI executable not found in PATH: ${cliPath}`);
                                }
                            }
                            else {
                                await fs.access(cliPath, fs.constants.X_OK);
                            }
                            const latency = Date.now() - startTime;
                            return {
                                success: true,
                                message: 'CLI path is valid and executable',
                                details: {
                                    provider: 'claude-code-cli',
                                    latency,
                                },
                            };
                        }
                        catch (error) {
                            throw new Error(`CLI path validation failed: ${error.message}`);
                        }
                    }
                    default:
                        throw new Error(`Unsupported adapter type: ${adapterType}`);
                }
            }
            catch (error) {
                return {
                    success: false,
                    message: error.message || 'Connection test failed',
                    details: {
                        error: error.message,
                    },
                };
            }
        }),
    });
}
