/**
 * IRuntimeAdapter - Runtime Adapter 接口
 *
 * 轻量级适配器接口，用于 AgentRuntimeService 与 Runtime 交互。
 * 提供启动、停止、查询状态的基本操作。
 */

import { AgentRuntimeConfig } from '../../01-domain/models/agent/agent.entity';

export type RuntimeAdapterStatus = 'running' | 'stopped' | 'error';

export interface IRuntimeAdapter {
  /**
   * 启动 Agent
   * @param agentId - Agent ID
   * @param config - 运行时配置
   */
  startAgent(agentId: string, config: AgentRuntimeConfig): Promise<void>;

  /**
   * 停止 Agent
   * @param agentId - Agent ID
   */
  stopAgent(agentId: string): Promise<void>;

  /**
   * 获取 Agent 运行状态
   * @param agentId - Agent ID
   * @returns Agent 运行状态
   */
  getRuntimeStatus(agentId: string): Promise<RuntimeAdapterStatus>;
}
