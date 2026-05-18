/**
 * IAgentRepository - Agent Repository 接口
 *
 * Application Layer 通过此接口访问 Agent 数据，不依赖具体实现。
 * Infrastructure Layer 负责实现此接口（如 PrismaAgentRepository）。
 *
 * 设计原则：
 * - 依赖倒置：Application 依赖接口，Infrastructure 实现接口
 * - 返回 Domain Entity，不返回数据库模型
 * - 所有方法返回 Promise（异步操作）
 */

import { AgentEntity, AgentStatus } from '../../../domain/models/agent/agent.entity';

export interface IAgentRepository {
  /**
   * 根据 ID 查找 Agent
   * @param agentId - Agent ID
   * @returns Agent 实体，不存在返回 null
   */
  findById(agentId: string): Promise<AgentEntity | null>;

  /**
   * 根据状态查找 Agents
   * @param status - Agent 状态
   * @returns Agent 实体数组
   */
  findByStatus(status: AgentStatus): Promise<AgentEntity[]>;

  /**
   * 根据创建者查找 Agents
   * @param createdBy - 创建者 ID
   * @returns Agent 实体数组
   */
  findByCreator(createdBy: string): Promise<AgentEntity[]>;

  /**
   * 查找所有 Agents
   * @returns Agent 实体数组
   */
  findAll(): Promise<AgentEntity[]>;

  /**
   * 保存新 Agent
   * @param agent - Agent 实体
   * @param serverId - Server ID（用于多 Server 数据隔离）
   */
  save(agent: AgentEntity, serverId: string): Promise<void>;

  /**
   * 更新 Agent
   * @param agent - Agent 实体
   * @param serverId - Server ID（用于多 Server 数据隔离）
   */
  update(agent: AgentEntity, serverId: string): Promise<void>;

  /**
   * 删除 Agent
   * @param agentId - Agent ID
   */
  delete(agentId: string): Promise<void>;

  /**
   * 检查 Agent 是否存在
   * @param agentId - Agent ID
   * @returns 是否存在
   */
  exists(agentId: string): Promise<boolean>;
}
