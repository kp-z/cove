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

          const result = await getAvailableModels(
            adapter.type,
            baseURL,
            customHeaders
          );

          return result;
        } catch (error: any) {
          throw mapErrorToTRPC(error);
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
