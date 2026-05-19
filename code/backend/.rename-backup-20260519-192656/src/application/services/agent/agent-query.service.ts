/**
 * AgentQueryService - Agent 查询操作
 */

import { AgentEntity, AgentStatus } from '../../../domain/models/agent/agent.entity';
import {
  IAgentRepository,
  IAgentConfigStore,
} from '../../interfaces';
import { AgentNotFoundError } from './agent.errors';
import type { AdapterService } from '../adapter/adapter.service';

export class AgentQueryService {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly configStore?: IAgentConfigStore,
    private readonly adapterService?: AdapterService
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
    const json = agent.toJSON();
    const detail: Record<string, unknown> = { ...json };

    if (this.configStore) {
      const [runtime, persona, files] = await Promise.all([
        this.configStore.getRuntime(agentId).catch(() => null),
        this.configStore.getPersona(agentId).catch(() => null),
        this.configStore.getFilePaths(agentId).catch(() => null),
      ]);
      detail.runtime = runtime;
      detail.persona = persona;
      detail.files = files;

      // If runtime has adapter_id, fetch the adapter configuration
      if (runtime?.adapter_id && this.adapterService) {
        try {
          // Skip permission check for internal query - the adapter is already referenced in the agent's runtime
          const adapter = await this.adapterService.getById(runtime.adapter_id, agent.createdBy, true);
          detail.adapter = adapter;
        } catch (error) {
          // Adapter not found or access denied, continue without it
          detail.adapter = null;
        }
      }
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
