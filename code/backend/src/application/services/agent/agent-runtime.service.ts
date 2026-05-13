/**
 * AgentRuntimeService - Agent 运行时管理
 *
 * 职责：
 * - 启动和停止 Agent Runtime
 * - 查询 Agent 运行状态
 * - 发布状态变更事件
 *
 * 依赖：
 * - IAgentRepository: Agent 数据访问
 * - IRuntimeAdapter: 运行时适配器
 * - IEventPublisher: 事件发布（可选）
 * - ILogger: 日志记录
 */

import {
  IAgentRepository,
  IEventPublisher,
  ILogger,
  IRuntimeAdapter,
} from '../../interfaces';
import { AgentNotFoundError } from './agent.errors';

export class AgentRuntimeService {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly runtimeAdapter: IRuntimeAdapter,
    private readonly eventPublisher: IEventPublisher | undefined,
    private readonly logger: ILogger
  ) {}

  /**
   * 启动 Agent
   */
  async startAgent(agentId: string): Promise<void> {
    this.logger.info('Starting agent runtime', { agentId });

    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }

    if (!agent.canBeStarted()) {
      throw new AgentNotReadyError(agentId);
    }

    await this.runtimeAdapter.startAgent(agentId, agent.runtimeConfig!);

    if (this.eventPublisher) {
      await this.eventPublisher.publish('agent_status_changed', '', {
        agentId,
        status: 'running',
      });
    }

    this.logger.info('Agent runtime started', { agentId });
  }

  /**
   * 停止 Agent
   */
  async stopAgent(agentId: string): Promise<void> {
    this.logger.info('Stopping agent runtime', { agentId });

    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }

    await this.runtimeAdapter.stopAgent(agentId);

    if (this.eventPublisher) {
      await this.eventPublisher.publish('agent_status_changed', '', {
        agentId,
        status: 'stopped',
      });
    }

    this.logger.info('Agent runtime stopped', { agentId });
  }

  /**
   * 获取 Agent 运行状态
   */
  async getStatus(agentId: string): Promise<{ status: string }> {
    const status = await this.runtimeAdapter.getRuntimeStatus(agentId);
    return { status };
  }
}

// --- Errors ---

export class AgentNotReadyError extends Error {
  constructor(agentId: string) {
    super(`Agent not ready to start: ${agentId}`);
    this.name = 'AgentNotReadyError';
  }
}
