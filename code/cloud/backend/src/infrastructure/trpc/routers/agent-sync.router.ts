/**
 * Agent Sync Router
 *
 * 接收 Local Device 推送的 Agent 元数据并 upsert 入库。
 *
 * 背景：Agent 文件（agent.md 等）位于 Local Device 本地。
 * 扫描与 frontmatter 解析的职责已从 Backend 下沉到 Local，
 * Backend 不再于启动时扫描文件系统，而是被动接收 Local 的同步推送。
 */

import { z } from 'zod';
import { router, procedure } from '../trpc';
import type { AgentDiscoveryService } from '../../../application/services/agent/agent-discovery.service';

/**
 * Agent 内容校验（Phase 4 路线 A：写入 DB contentJson 的内容真源）
 */
const agentContentSchema = z.object({
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  runtimeConfig: z.record(z.unknown()).optional(),
  persona: z.record(z.unknown()).optional(),
  skills: z.record(z.unknown()).optional(),
  tools: z.record(z.unknown()).optional(),
  triggers: z.record(z.unknown()).optional(),
});

/**
 * 单个 Agent 元数据的输入校验
 */
const agentMetadataSchema = z.object({
  agent_id: z.string().min(1),
  name: z.string().min(1),
  display_name: z.string().min(1),
  status: z.string().optional(),
  category: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  created_by: z.string().optional(),
  created_at: z.string().optional(),
  content: agentContentSchema.optional(),
});

export function createAgentSyncRouter(agentDiscoveryService: AgentDiscoveryService) {
  return router({
    /**
     * 批量同步 Agent 元数据（Local → Backend）
     */
    sync: procedure
      .input(
        z.object({
          deviceId: z.string().optional(),
          realmId: z.string().optional(),
          agents: z.array(agentMetadataSchema),
        })
      )
      .mutation(async ({ input }) => {
        const result = await agentDiscoveryService.syncAgentMetadataBatch(input.agents);
        return {
          synced: result.synced,
          received: input.agents.length,
        };
      }),
  });
}
