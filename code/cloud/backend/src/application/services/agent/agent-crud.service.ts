/**
 * AgentCrudService - Agent CRUD 操作
 */

import { AgentEntity, AgentScope, AgentPersona } from '../../../domain/models/agent/agent.entity';
import {
  IAgentRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { AgentNotFoundError, AgentInUseError } from './agent.errors';
import { getRealmContext } from '../../context/realm-context-store';

export interface CreateAgentDTO {
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly scope?: AgentScope;
  readonly projectIds?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];
  readonly repositoryPath?: string;
  readonly createdBy: string;
  readonly runtimeConfig?: {
    readonly adapter_id?: string;
    readonly overrides?: Record<string, unknown>;
  };
  readonly persona?: AgentPersona;
}

export interface UpdateAgentDTO {
  // Basic info
  readonly displayName?: string;
  readonly description?: string;
  readonly scope?: AgentScope;
  readonly projectIds?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];
  readonly repositoryPath?: string;

  // Runtime config (legacy individual fields)
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly systemPrompt?: string;

  // Runtime config (new adapter-based config)
  readonly runtimeConfig?: {
    readonly adapter_id?: string;
    readonly overrides?: Record<string, unknown>;
  };

  // Persona
  readonly personaName?: string;
  readonly role?: string;
  readonly tone?: string;
  readonly instructions?: string;
  readonly avatar?: {
    readonly url: string;
    readonly type: 'uploaded' | 'dicebear' | 'default';
  };

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
    const context = getRealmContext();
    this.logger.info('Creating new agent', { name: dto.name, realmId: context.realmId });

    const agentId = this.generateAgentId();

    // Set default repository path if not provided
    const repositoryPath = dto.repositoryPath ?? `.cove/agents/${dto.name}`;

    const agent = AgentEntity.create({
      agentId,
      realmId: context.realmId,
      name: dto.name,
      displayName: dto.displayName,
      description: dto.description,
      status: 'idle',
      scope: dto.scope ?? 'user',
      projectIds: dto.projectIds,
      capabilities: dto.capabilities,
      tags: dto.tags,
      repositoryPath,
      runtimeConfig: dto.runtimeConfig as any,
      persona: dto.persona,
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
      metadata: {
        realmId: context.realmId,
      },
    });

    this.logger.info('Agent created successfully', { agentId: agent.agentId });

    return agent;
  }

  async updateAgent(agentId: string, dto: UpdateAgentDTO): Promise<AgentEntity> {
    const context = getRealmContext();
    this.logger.info('Updating agent', { agentId, realmId: context.realmId });

    const agent = await this.getAgentById(agentId);

    // Build runtime config
    // Priority: dto.runtimeConfig > legacy individual fields > existing config
    let runtimeConfig;
    if (dto.runtimeConfig !== undefined) {
      // New adapter-based config provided
      runtimeConfig = dto.runtimeConfig as any;
    } else if (dto.model !== undefined || dto.temperature !== undefined ||
               dto.maxTokens !== undefined || dto.systemPrompt !== undefined) {
      // Legacy individual fields provided
      runtimeConfig = {
        model: dto.model ?? agent.runtimeConfig?.model ?? 'opus',
        temperature: dto.temperature ?? agent.runtimeConfig?.temperature,
        maxTokens: dto.maxTokens ?? agent.runtimeConfig?.maxTokens,
        systemPrompt: dto.systemPrompt ?? agent.runtimeConfig?.systemPrompt,
      };
    } else {
      // No runtime config changes
      runtimeConfig = agent.runtimeConfig;
    }

    // Build persona if any persona fields are provided
    const persona = (dto.personaName !== undefined || dto.role !== undefined ||
                    dto.tone !== undefined || dto.instructions !== undefined || dto.avatar !== undefined)
      ? {
          name: dto.personaName ?? agent.persona?.name ?? agent.name,
          role: dto.role ?? agent.persona?.role ?? 'assistant',
          tone: dto.tone ?? agent.persona?.tone,
          instructions: dto.instructions ?? agent.persona?.instructions,
          avatar: dto.avatar ?? agent.persona?.avatar, // Use new avatar if provided
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
      realmId: agent.realmId,
      name: agent.name,
      displayName: dto.displayName !== undefined ? dto.displayName : agent.displayName,
      description: dto.description !== undefined ? dto.description : agent.description,
      status: agent.status,
      scope: dto.scope !== undefined ? dto.scope : agent.scope,
      projectIds: dto.projectIds !== undefined ? dto.projectIds : agent.projectIds,
      capabilities: dto.capabilities !== undefined ? dto.capabilities : agent.capabilities,
      tags: dto.tags !== undefined ? dto.tags : agent.tags,
      repositoryPath: dto.repositoryPath !== undefined ? dto.repositoryPath : agent.repositoryPath,
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

    await this.agentRepository.delete(agentId, getRealmContext().realmId);

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
    const agent = await this.agentRepository.findById(agentId, getRealmContext().realmId);
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
