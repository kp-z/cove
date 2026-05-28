/**
 * Agent DM Router - 专门处理 Agent DM 相关操作
 *
 * 职责：提供 Agent DM Channel 的查询和确保接口
 *
 * Procedures:
 * - getAgentDM: 获取 Agent 的 DM Channel
 * - ensureAgentDM: 确保 Agent DM Channel 存在（幂等）
 */

import { z } from 'zod';
import { router, procedure } from '../trpc';
import { mapErrorToTRPC } from '../../../common/errors';
import { RealmContext } from '../../../application/context/realm-context';
import { runWithContext } from '../../../application/context/realm-context-store';

export const createAgentDMRouter = (deps: { agentDMService: any }) => {
  const { agentDMService } = deps;

  return router({
    // 获取 Agent 的 DM Channel
    getAgentDM: procedure
      .input(z.object({ agentId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const channel = await agentDMService.getAgentDMChannel({
              agentId: input.agentId,
              userId: ctx.userId,
            });
            return channel?.toJSON() || null;
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),

    // 确保 Agent DM Channel 存在（幂等）
    ensureAgentDM: procedure
      .input(z.object({ agentId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const context = RealmContext.create(ctx.realmId || 'default-server', ctx.userId || 'system');
          return await runWithContext(context, async () => {
            const channel = await agentDMService.ensureAgentDMChannel({
              agentId: input.agentId,
              userId: ctx.userId,
              realmId: ctx.realmId,
            });
            return channel.toJSON();
          });
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
};
