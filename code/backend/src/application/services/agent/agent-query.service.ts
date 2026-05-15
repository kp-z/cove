/**
 * AgentQueryService - Agent 查询操作
 */

import { AgentEntity, AgentStatus } from '../../../domain/models/agent/agent.entity';
import {
  IAgentRepository,
  IAgentConfigStore,
} from '../../interfaces';
import { AgentNotFoundError } from './agent.errors';

export class AgentQueryService {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly configStore?: IAgentConfigStore
  ) {}

  async getAgentById(agentId: string): Promise<AgentEntity> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }
    return agent;
  }

  async getAgentDetail(agentId: string): Promise<Record<string, unknown>> {
    const agent = await this.getAgentById(agentId);
    const detail: Record<string, unknown> = {
      ...agent,
    };

    if (this.configStore) {
      const [runtime, persona, files] = await Promise.all([
        this.configStore.getRuntime(agentId).catch(() => null),
        this.configStore.getPersona(agentId).catch(() => null),
        this.configStore.getFilePaths(agentId).catch(() => null),
      ]);
      detail.runtime = runtime;
      detail.persona = persona;
      detail.files = files;
    }

    return detail;
  }

  async getAllAgents(): Promise<AgentEntity[]> {
    return await this.agentRepository.findAll();
  }

  async getAgentsByStatus(status: AgentStatus): Promise<AgentEntity[]> {
    const allAgents = await this.agentRepository.findAll();
    return allAgents.filter(agent => agent.status === status);
  }

  async getAvailableAgents(): Promise<AgentEntity[]> {
    const allAgents = await this.agentRepository.findAll();
    return allAgents.filter(agent => agent.status === 'idle');
  }
}
