/**
 * Avatar Router - 头像相关 API
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { AvatarService } from '../../../application/services/avatar/avatar.service';

export function createAvatarRouter(avatarService: AvatarService) {
  return router({
    /**
     * 获取可用的 DiceBear 风格列表
     */
    getAvailableStyles: publicProcedure
      .input(
        z
          .object({
            entityType: z.enum(['user', 'agent', 'channel', 'realm']).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const styles = avatarService.getAvailableStyles(input?.entityType);

        return {
          styles,
        };
      }),
  });
}
