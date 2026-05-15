/**
 * AgentConfigService - Agent 配置管理
 */

import { AgentEntity, AgentRuntimeConfig, AgentPersona, AgentSkills, AgentTools, AgentTriggers } from '../../../domain/models/agent/agent.entity';
import {
  IAgentRepository,
  ILogger,
  IAgentConfigStore,
} from '../../interfaces';
import { AgentNotFoundError } from './agent.errors';

export class AgentConfigService {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly logger: ILogger,
    private readonly configStore?: IAgentConfigStore
  ) {}

  async updateRuntimeConfig(agentId: string, config: AgentRuntimeConfig | Record<string, unknown>): Promise<unknown> {
    this.logger.info('Updating agent runtime config', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      return this.configStore.updateRuntime(agentId, config as Record<string, unknown>);
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updateRuntimeConfig(config as AgentRuntimeConfig);
    await this.agentRepository.update(updated);
    return updated;
  }

  async updatePersona(agentId: string, persona: AgentPersona | Record<string, unknown>): Promise<unknown> {
    this.logger.info('Updating agent persona', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      return this.configStore.updatePersona(agentId, persona as Record<string, unknown>);
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updatePersona(persona as AgentPersona);
    await this.agentRepository.update(updated);
    return updated;
  }

  async updateSkills(agentId: string, skills: AgentSkills): Promise<unknown> {
    this.logger.info('Updating agent skills', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      await this.configStore.updateSkills(agentId, skills as any);
      return skills;
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updateSkills(skills);
    await this.agentRepository.update(updated);
    return updated;
  }

  async updateTools(agentId: string, tools: AgentTools): Promise<unknown> {
    this.logger.info('Updating agent tools', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      await this.configStore.updateTools(agentId, tools as any);
      return tools;
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updateTools(tools);
    await this.agentRepository.update(updated);
    return updated;
  }

  async updateTriggers(agentId: string, triggers: AgentTriggers): Promise<unknown> {
    this.logger.info('Updating agent triggers', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      await this.configStore.updateTriggers(agentId, triggers as any);
      return triggers;
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updateTriggers(triggers);
    await this.agentRepository.update(updated);
    return updated;
  }

  private async getAgentById(agentId: string): Promise<AgentEntity> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }
    return agent;
  }
}
