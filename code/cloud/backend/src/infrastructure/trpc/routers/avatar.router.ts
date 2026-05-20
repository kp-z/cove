/**
 * Avatar Router - 头像相关 API
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { AvatarService } from '../../../application/services/avatar/avatar.service';

export function createAvatarRouter(avatarService: AvatarService) {
  return router({
    /**
     * 获取所有预设头像
     */
    getPresetAvatars: publicProcedure.query(async () => {
      const presets = avatarService.getPresetAvatars();

      return {
        presets,
      };
    }),

    /**
     * 上传头像
     */
    uploadAvatar: protectedProcedure
      .input(
        z.object({
          entityType: z.enum(['user', 'agent', 'channel', 'realm']),
          entityId: z.string(),
          file: z.string(), // base64 encoded image
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { entityType, entityId, file, mimeType } = input;

        // 权限检查：用户只能修改自己的头像
        if (entityType === 'user' && entityId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only modify your own avatar',
          });
        }

        // 解码 base64 文件
        const fileBuffer = Buffer.from(file, 'base64');

        try {
          const avatarInfo = await avatarService.uploadAvatar({
            entityType,
            entityId,
            fileBuffer,
            mimeType,
          });

          return avatarInfo;
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error.message,
            });
          }
          throw error;
        }
      }),

    /**
     * 设置预设头像
     */
    setPresetAvatar: protectedProcedure
      .input(
        z.object({
          entityType: z.enum(['user', 'agent', 'channel', 'realm']),
          entityId: z.string(),
          presetId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { entityType, entityId, presetId } = input;

        // 权限检查：用户只能修改自己的头像
        if (entityType === 'user' && entityId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only modify your own avatar',
          });
        }

        try {
          const avatarInfo = await avatarService.setPresetAvatar({
            entityType,
            entityId,
            presetId,
          });

          return avatarInfo;
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error.message,
            });
          }
          throw error;
        }
      }),

    /**
     * 删除上传的头像
     */
    deleteAvatar: protectedProcedure
      .input(
        z.object({
          entityType: z.enum(['user', 'agent', 'channel', 'realm']),
          entityId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { entityType, entityId } = input;

        // 权限检查：用户只能删除自己的头像
        if (entityType === 'user' && entityId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only delete your own avatar',
          });
        }

        try {
          await avatarService.deleteUploadedAvatar(entityType, entityId);

          return {
            success: true,
            message: 'Avatar deleted successfully',
          };
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error.message,
            });
          }
          throw error;
        }
      }),
  });
}
