/**
 * AgentCrudService - Agent CRUD 操作
 */

import { AgentEntity, AgentScope } from '../../../domain/models/agent/agent.entity';
import {
  IAgentRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { AgentNotFoundError, AgentInUseError } from './agent.errors';

export interface CreateAgentDTO {
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly scope?: AgentScope;
  readonly projectIds?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];
  readonly createdBy: string;
}

export interface UpdateAgentDTO {
  // Basic info
  readonly displayName?: string;
  readonly description?: string;
  readonly scope?: AgentScope;
  readonly projectIds?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];

  // Runtime config
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly systemPrompt?: string;

  // Persona
  readonly personaName?: string;
  readonly role?: string;
  readonly tone?: string;
  readonly instructions?: string;

  // Skills & Tools
  readonly skillIds?: readonly string[];
  readonly toolIds?: readonly string[];

  // Triggers
  readonly onMention?: boolean;
  readonly onDirectMessage?: boolean;
  readonly onSchedule?: string;
  readonly customRules?: readonly string[];
}

export class AgentCrudService {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async createAgent(dto: CreateAgentDTO): Promise<AgentEntity> {
    this.logger.info('Creating new agent', { name: dto.name });

    const agentId = this.generateAgentId();

    const agent = AgentEntity.create({
      agentId,
      name: dto.name,
      displayName: dto.displayName,
      description: dto.description,
      status: 'idle',
      scope: dto.scope ?? 'user',
      projectIds: dto.projectIds,
      capabilities: dto.capabilities,
      tags: dto.tags,
      createdBy: dto.createdBy,
      createdAt: new Date(),
    });

    await this.agentRepository.save(agent);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'agent.created',
      aggregateId: agent.agentId,
      aggregateType: 'Agent',
      occurredAt: new Date(),
      payload: {
        agentId: agent.agentId,
        name: agent.name,
        createdBy: dto.createdBy,
      },
    });

    this.logger.info('Agent created successfully', { agentId: agent.agentId });

    return agent;
  }

  async updateAgent(agentId: string, dto: UpdateAgentDTO): Promise<AgentEntity> {
    this.logger.info('Updating agent', { agentId });

    const agent = await this.getAgentById(agentId);

    // Build runtime config if any runtime fields are provided
    const runtimeConfig = (dto.model !== undefined || dto.temperature !== undefined ||
                          dto.maxTokens !== undefined || dto.systemPrompt !== undefined)
      ? {
          model: dto.model ?? agent.runtimeConfig?.model ?? 'opus',
          temperature: dto.temperature ?? agent.runtimeConfig?.temperature,
          maxTokens: dto.maxTokens ?? agent.runtimeConfig?.maxTokens,
          systemPrompt: dto.systemPrompt ?? agent.runtimeConfig?.systemPrompt,
        }
      : agent.runtimeConfig;

    // Build persona if any persona fields are provided
    const persona = (dto.personaName !== undefined || dto.role !== undefined ||
                    dto.tone !== undefined || dto.instructions !== undefined)
      ? {
          name: dto.personaName ?? agent.persona?.name ?? agent.name,
          role: dto.role ?? agent.persona?.role ?? 'assistant',
          tone: dto.tone ?? agent.persona?.tone,
          instructions: dto.instructions ?? agent.persona?.instructions,
        }
      : agent.persona;

    // Build skills if provided
    const skills = dto.skillIds !== undefined
      ? { skillIds: dto.skillIds }
      : agent.skills;

    // Build tools if provided
    const tools = dto.toolIds !== undefined
      ? { toolIds: dto.toolIds }
      : agent.tools;

    // Build triggers if any trigger fields are provided
    const triggers = (dto.onMention !== undefined || dto.onDirectMessage !== undefined ||
                     dto.onSchedule !== undefined || dto.customRules !== undefined)
      ? {
          onMention: dto.onMention ?? agent.triggers?.onMention,
          onDirectMessage: dto.onDirectMessage ?? agent.triggers?.onDirectMessage,
          onSchedule: dto.onSchedule ?? agent.triggers?.onSchedule,
          customRules: dto.customRules ?? agent.triggers?.customRules,
        }
      : agent.triggers;

    const updatedAgent = AgentEntity.create({
      agentId: agent.agentId,
      name: agent.name,
      displayName: dto.displayName !== undefined ? dto.displayName : agent.displayName,
      description: dto.description !== undefined ? dto.description : agent.description,
      status: agent.status,
      scope: dto.scope !== undefined ? dto.scope : agent.scope,
      projectIds: dto.projectIds !== undefined ? dto.projectIds : agent.projectIds,
      capabilities: dto.capabilities !== undefined ? dto.capabilities : agent.capabilities,
      tags: dto.tags !== undefined ? dto.tags : agent.tags,
      runtimeConfig,
      persona,
      skills,
      tools,
      triggers,
      createdBy: agent.createdBy,
      createdAt: agent.createdAt,
    });

    await this.agentRepository.update(updatedAgent);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'agent.updated',
      aggregateId: agentId,
      aggregateType: 'Agent',
      occurredAt: new Date(),
      payload: {
        agentId,
        changes: dto,
      },
    });

    this.logger.info('Agent updated successfully', { agentId });

    return updatedAgent;
  }

  async deleteAgent(agentId: string): Promise<void> {
    this.logger.info('Deleting agent', { agentId });

    const agent = await this.getAgentById(agentId);

    if (agent.status === 'active') {
      throw new AgentInUseError(agentId);
    }

    await this.agentRepository.delete(agentId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'agent.deleted',
      aggregateId: agentId,
      aggregateType: 'Agent',
      occurredAt: new Date(),
      payload: { agentId },
    });

    this.logger.info('Agent deleted successfully', { agentId });
  }

  private async getAgentById(agentId: string): Promise<AgentEntity> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }
    return agent;
  }

  private generateAgentId(): string {
    return `agent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    }
  }
}
