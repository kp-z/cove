import { PrismaClient } from '../../../../generated/client';
import * as path from 'path';

/**
 * Agent 元数据（来自 agent.md frontmatter）
 *
 * 说明：扫描与解析职责已下沉到 Local Device，
 * Backend 仅通过 tRPC 接收 Local 推送的元数据并 upsert 入库（详见 AgentSyncRouter）。
 */
/**
 * Agent 内容（Phase 4 路线 A）
 *
 * 由 Local 解析本地文件后随元数据上送，Backend 序列化写入 DB 的 contentJson 列，
 * 作为 UI/查询的内容真源；Backend 不再读取 agent 目录文件。
 */
export interface AgentContent {
  description?: string;
  capabilities?: string[];
  tags?: string[];
  runtimeConfig?: Record<string, unknown>;
  persona?: Record<string, unknown>;
  skills?: Record<string, unknown>;
  tools?: Record<string, unknown>;
  triggers?: Record<string, unknown>;
}

export interface AgentMetadata {
  agent_id: string;
  name: string;
  display_name: string;
  status?: string;
  category?: string;
  capabilities?: string[];
  tags?: string[];
  created_by?: string;
  created_at?: string;
  content?: AgentContent;
}

export class AgentDiscoveryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 根据元数据 upsert 单个 Agent（供 Local 推送同步调用）
   *
   * 冲突策略：以 Local 文件（即调用方传入的 metadata）为准。
   * - DB 已存在：更新可变字段
   * - DB 不存在：在默认 Realm 下创建
   */
  async syncAgentMetadata(metadata: AgentMetadata): Promise<void> {
    if (!metadata.agent_id || !metadata.name) {
      console.warn('[AgentDiscoveryService] Skip sync: missing agent_id or name');
      return;
    }

    try {
      const existingAgent = await this.prisma.agent.findUnique({
        where: { id: metadata.agent_id },
      });

      if (existingAgent) {
        await this.updateAgent(metadata);
      } else {
        await this.createAgent(metadata);
      }
    } catch (error) {
      console.error(`[AgentDiscoveryService] Failed to sync agent ${metadata.agent_id}`, error);
    }
  }

  /**
   * 批量 upsert（供 tRPC sync 端点调用）
   * @returns 成功同步的数量
   */
  async syncAgentMetadataBatch(list: AgentMetadata[]): Promise<{ synced: number }> {
    let synced = 0;
    for (const metadata of list) {
      await this.syncAgentMetadata(metadata);
      synced += 1;
    }
    return { synced };
  }

  private async createAgent(
    metadata: AgentMetadata,
  ): Promise<void> {
    const now = new Date();
    const configPath = path.join('storage', 'agents', metadata.agent_id);

    // Get default realm ID (agents discovered from filesystem belong to default realm)
    const defaultRealm = await this.prisma.realm.findFirst({
      where: { name: 'default' },
    });

    if (!defaultRealm) {
      console.error(`[AgentDiscoveryService] Default realm not found, cannot create agent ${metadata.agent_id}`);
      return;
    }

    await this.prisma.agent.create({
      data: {
        id: metadata.agent_id,
        realmId: defaultRealm.id,
        name: metadata.name,
        displayName: metadata.display_name || metadata.name,
        status: metadata.status || 'active',
        scope: 'user',
        projectIds: '[]',
        configPath,
        // Phase 4 路线 A：内容真源写入 contentJson（Local 上送的完整内容）
        contentJson: metadata.content ? JSON.stringify(metadata.content) : null,
        avatarUrl: null,
        avatarType: 'dicebear',
        createdBy: metadata.created_by || 'system',
        createdAt: metadata.created_at ? new Date(metadata.created_at) : now,
      },
    });
  }

  private async updateAgent(
    metadata: AgentMetadata,
  ): Promise<void> {
    const configPath = path.join('storage', 'agents', metadata.agent_id);

    await this.prisma.agent.update({
      where: { id: metadata.agent_id },
      data: {
        name: metadata.name,
        displayName: metadata.display_name || metadata.name,
        status: metadata.status || 'active',
        configPath,  // Fix old .json format paths
        // Phase 4 路线 A：仅当 Local 上送了内容时才更新 contentJson（Local 为准），
        // 否则保留 DB 既有内容，避免被空值覆盖。
        ...(metadata.content ? { contentJson: JSON.stringify(metadata.content) } : {}),
      },
    });
  }
}
