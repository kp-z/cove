/**
 * Agent DM 事件处理器
 *
 * 职责：监听 agent.created 事件，自动创建 DM Channel
 *
 * 设计优点：
 * 1. 只依赖 AgentDMService，不直接依赖 Channel 服务（低耦合）
 * 2. 事件负载最小化（只需 agentId, createdBy, realmId）
 * 3. 错误隔离，不影响 Agent 创建流程
 */

import { DomainEvent } from '../../../application/interfaces/event-bus.interface';
import { AgentDMService } from '../../../application/services/agent-dm/agent-dm.service';
import { ILogger } from '../../../application/interfaces';

export class AgentDMHandler {
  constructor(
    private readonly agentDMService: AgentDMService,
    private readonly logger: ILogger
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    if (event.eventType !== 'agent.created') return;

    const { agentId, createdBy, realmId } = event.payload as {
      agentId: string;
      createdBy: string;
      realmId: string;
    };

    // 跳过 system 创建的 agents，避免创建无效的 DM channels
    if (!createdBy || typeof createdBy !== 'string' || createdBy === 'system') {
      this.logger.info('[AgentDMHandler] Skipping DM creation - system agent or no valid createdBy', { agentId, createdBy });
      return;
    }

    try {
      await this.agentDMService.ensureAgentDMChannel({
        agentId,
        userId: createdBy,
        realmId,
      });

      this.logger.info('[AgentDMHandler] Auto-created DM channel for agent', { agentId, userId: createdBy });
    } catch (error) {
      this.logger.error('[AgentDMHandler] Failed to auto-create DM channel', error as Error, { agentId });
      // 不抛出错误，避免影响 agent 创建流程
    }
  }
}
