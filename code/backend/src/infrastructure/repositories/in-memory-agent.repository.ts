/**
 * InMemoryAgentRepository - Agent Repository 的内存实现
 *
 * MVP 阶段使用 Map 存储数据，后续可替换为 Prisma/TypeORM 实现。
 * 实现 IAgentRepository 接口，遵循依赖倒置原则。
 */

import { IAgentRepository } from '../../application/interfaces/repositories/agent.repository.interface';
import { AgentEntity, AgentStatus } from '../../domain/models/agent/agent.entity';

export class InMemoryAgentRepository implements IAgentRepository {
  private agents: Map<string, AgentEntity> = new Map();

  /**
   * 根据 ID 查找 Agent
   */
  async findById(agentId: string): Promise<AgentEntity | null> {
    const agent = this.agents.get(agentId);
    return agent || null;
  }

  /**
   * 根据状态查找 Agents
   */
  async findByStatus(status: AgentStatus): Promise<AgentEntity[]> {
    return Array.from(this.agents.values())
      .filter(agent => agent.status === status)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 根据创建者查找 Agents
   */
  async findByCreator(createdBy: string): Promise<AgentEntity[]> {
    return Array.from(this.agents.values())
      .filter(agent => agent.createdBy === createdBy)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 查找所有 Agents
   */
  async findAll(): Promise<AgentEntity[]> {
    return Array.from(this.agents.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 保存新 Agent
   */
  async save(agent: AgentEntity): Promise<void> {
    if (this.agents.has(agent.agentId)) {
      throw new Error(`Agent with ID ${agent.agentId} already exists`);
    }
    this.agents.set(agent.agentId, agent);
  }

  /**
   * 更新 Agent
   */
  async update(agent: AgentEntity): Promise<void> {
    if (!this.agents.has(agent.agentId)) {
      throw new Error(`Agent with ID ${agent.agentId} not found`);
    }
    this.agents.set(agent.agentId, agent);
  }

  /**
   * 删除 Agent
   */
  async delete(agentId: string): Promise<void> {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    this.agents.delete(agentId);
  }

  /**
   * 检查 Agent 是否存在
   */
  async exists(agentId: string): Promise<boolean> {
    return this.agents.has(agentId);
  }

  /**
   * 清空所有数据（仅用于测试）
   */
  clear(): void {
    this.agents.clear();
  }

  /**
   * 获取总数（仅用于测试/调试）
   */
  count(): number {
    return this.agents.size;
  }
}
