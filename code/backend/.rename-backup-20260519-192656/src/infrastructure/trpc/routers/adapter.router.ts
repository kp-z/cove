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

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import type { AdapterService } from '../../../application/services/adapter/adapter.service';
import { AdapterMetadataService } from '../../../application/services/adapter/adapter-metadata.service';
import {
  adapterConfigSchema,
  anthropicConfigSchema,
  openaiConfigSchema,
  claudeCodeCLIConfigSchema,
} from '../../../domain/models/adapter/adapter-config.validation';
import { getAvailableModels } from '../../adapters/llm/model-discovery';

// Input schema for creating adapter config
const createAdapterSchema = z.object({
  name: z.string().min(1, 'Adapter name is required'),
  description: z.string().optional(),
  scope: z.enum(['shared', 'private']),
  owner_id: z.string().optional(),
  adapter: adapterConfigSchema,
});

// Input schema for updating adapter config
const updateAdapterSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  adapter: adapterConfigSchema.optional(),
});

// Query schema for listing by scope
const listByScopeSchema = z.object({
  scope: z.enum(['shared', 'private']),
  owner_id: z.string().optional(),
});

interface AdapterRouterDeps {
  adapterService: AdapterService;
  adapterMetadataService: AdapterMetadataService;
}

export function createAdapterRouter(deps: AdapterRouterDeps) {
  return router({
    // Create adapter configuration
    create: publicProcedure
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
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // List all adapter configurations
    list: publicProcedure.query(async ({ ctx }) => {
      try {
        const actorId = ctx.userId || 'system';
        const configs = await deps.adapterService.list(actorId);
        return {
          adapters: configs,
          total: configs.length,
        };
      } catch (error: any) {
        throw mapErrorToTRPC(error);
      }
    }),

    // List adapter configurations by scope
    listByScope: publicProcedure
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
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Get adapter configuration by ID
    getById: publicProcedure
      .input(z.object({ adapterId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const actorId = ctx.userId || 'system';
          const config = await deps.adapterService.getById(input.adapterId, actorId);
          return config;
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Update adapter configuration
    update: publicProcedure
      .input(
        z.object({
          adapterId: z.string(),
          data: updateAdapterSchema,
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const actorId = ctx.userId || 'system';
          const updates: any = {};

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

          const config = await deps.adapterService.update(
            input.adapterId,
            updates,
            actorId
          );
          return config;
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Delete adapter configuration
    delete: publicProcedure
      .input(z.object({ adapterId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const actorId = ctx.userId || 'system';
          await deps.adapterService.delete(input.adapterId, actorId);
          return { adapterId: input.adapterId, deleted: true };
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Get available models for an adapter
    getAvailableModels: publicProcedure
      .input(z.object({ adapterId: z.string() }))
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
          const config = adapter.config as any;
          const baseURL = config.base_url;
          const customHeaders = config.custom_headers;

          // Resolve API key for OpenAI
          let apiKey: string | undefined;
          if (adapter.type === 'openai-api') {
            if (config.api_key) {
              apiKey = config.api_key;
            } else if (config.api_key_ref) {
              apiKey = await deps.adapterService.resolveApiKey(config.api_key_ref);
            }
          }

          const result = await getAvailableModels(
            adapter.type,
            baseURL,
            customHeaders,
            apiKey
          );

          return result;
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Discover models with temporary config (for creating new adapters)
    discoverModels: publicProcedure
      .input(
        z.object({
          adapterType: z.enum(['anthropic-api', 'openai-api', 'claude-code-cli']),
          baseURL: z.string().optional(),
          apiKey: z.string().optional(),
          customHeaders: z.record(z.string()).optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const { adapterType, baseURL, apiKey, customHeaders } = input;

          // Only support model discovery for anthropic-api and openai-api
          if (adapterType !== 'anthropic-api' && adapterType !== 'openai-api') {
            throw new Error(`Model discovery not supported for adapter type: ${adapterType}`);
          }

          const result = await getAvailableModels(
            adapterType,
            baseURL,
            customHeaders,
            apiKey
          );

          return result;
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // Get all adapter type metadata
    getAdapterTypes: publicProcedure.query(async () => {
      return deps.adapterMetadataService.getAdapterTypes();
    }),

    // Get single adapter type metadata
    getAdapterType: publicProcedure
      .input(
        z.object({
          type: z.enum(['anthropic-api', 'openai-api', 'claude-code-cli']),
        })
      )
      .query(async ({ input }) => {
        const metadata = deps.adapterMetadataService.getAdapterType(input.type);
        if (!metadata) {
          throw new Error(`Unknown adapter type: ${input.type}`);
        }
        return metadata;
      }),

    // Test adapter connection
    testConnection: publicProcedure
      .input(z.object({ adapterId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const actorId = ctx.userId || 'system';
          const adapter = await deps.adapterService.getById(input.adapterId, actorId);

          if (!adapter) {
            throw new Error('Adapter not found');
          }

          const startTime = Date.now();

          switch (adapter.type) {
            case 'anthropic-api':
            case 'openai-api': {
              const config = adapter.config as any;
              const baseURL = config.base_url;
              const customHeaders = config.custom_headers;

              let apiKey: string | undefined;
              if (adapter.type === 'openai-api') {
                if (config.api_key) {
                  apiKey = config.api_key;
                } else if (config.api_key_ref) {
                  apiKey = await deps.adapterService.resolveApiKey(config.api_key_ref);
                }
              }

              const result = await getAvailableModels(
                adapter.type,
                baseURL,
                customHeaders,
                apiKey
              );

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
              const config = adapter.config as any;
              const cliPath = config.cli_path || 'claude';
              const fs = await import('fs/promises');
              const path = await import('path');

              try {
                if (!path.isAbsolute(cliPath)) {
                  const { execSync } = await import('child_process');
                  try {
                    const isWindows = process.platform === 'win32';
                    const command = isWindows ? `where ${cliPath}` : `which ${cliPath}`;
                    const fullPath = execSync(command, { encoding: 'utf-8' }).trim();
                    await fs.access(fullPath, fs.constants.X_OK);
                  } catch {
                    throw new Error(`CLI executable not found in PATH: ${cliPath}`);
                  }
                } else {
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
              } catch (error: any) {
                throw new Error(`CLI path validation failed: ${error.message}`);
              }
            }

            default:
              throw new Error(`Unsupported adapter type: ${adapter.type}`);
          }
        } catch (error: any) {
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

// Export schemas for reuse
export {
  createAdapterSchema,
  updateAdapterSchema,
  listByScopeSchema,
  anthropicConfigSchema,
  openaiConfigSchema,
  claudeCodeCLIConfigSchema,
};
