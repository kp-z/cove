/**
 * Execution Mode Router
 *
 * 处理执行模式相关的请求
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const createExecutionModeRouter = () => {
  return router({
    getMode: publicProcedure
      .input(z.object({
        channelId: z.string(),
      }))
      .query(async ({ input }) => {
        // 默认返回 'device' 模式
        // 在未来可以根据 channel 配置返回不同的模式
        return {
          mode: 'device',
          channelId: input.channelId,
        };
      }),
  });
};
