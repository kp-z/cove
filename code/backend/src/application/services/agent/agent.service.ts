/**
 * AgentService - Agent 管理业务逻辑（协调器）
 */

import { AgentEntity, AgentStatus, AgentRuntimeConfig, AgentPersona, AgentSkills, AgentTools, AgentTriggers } from '../../../domain/models/agent/agent.entity';
import { TaskEntity } from '../../../domain/models/task/task.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { AgentCrudService, CreateAgentDTO, UpdateAgentDTO } from './agent-crud.service';
import { AgentQueryService } from './agent-query.service';
import { AgentConfigService } from './agent-config.service';
import { AgentTaskService, AgentAssignTaskDTO } from './agent-task.service';
import { AgentResponseService } from './agent-response.service';
import { ServerContext } from '../../context/server-context';

export { CreateAgentDTO, UpdateAgentDTO, AgentAssignTaskDTO };

export class AgentService {
  constructor(
    private readonly crudService: AgentCrudService,
    private readonly queryService: AgentQueryService,
    private readonly configService: AgentConfigService,
    private readonly taskService: AgentTaskService,
    private readonly responseService: AgentResponseService
  ) {}

  async createAgent(dto: CreateAgentDTO, context: ServerContext): Promise<AgentEntity> {
    return this.crudService.createAgent(dto, context);
  }

  async getAgentById(agentId: string): Promise<AgentEntity> {
    return this.queryService.getAgentById(agentId);
  }

  async getAgentDetail(agentId: string): Promise<Record<string, unknown>> {
    return this.queryService.getAgentDetail(agentId);
  }

  async getAllAgents(): Promise<AgentEntity[]> {
    return this.queryService.getAllAgents();
  }

  async getAgentsByStatus(status: AgentStatus): Promise<AgentEntity[]> {
    return this.queryService.getAgentsByStatus(status);
  }

  async getAvailableAgents(): Promise<AgentEntity[]> {
    return this.queryService.getAvailableAgents();
  }

  async updateAgent(agentId: string, dto: UpdateAgentDTO, context: ServerContext): Promise<AgentEntity> {
    return this.crudService.updateAgent(agentId, dto, context);
  }

  async updateRuntimeConfig(agentId: string, config: AgentRuntimeConfig | Record<string, unknown>, context: ServerContext): Promise<unknown> {
    return this.configService.updateRuntimeConfig(agentId, config, context);
  }

  async updatePersona(agentId: string, persona: AgentPersona | Record<string, unknown>, context: ServerContext): Promise<unknown> {
    return this.configService.updatePersona(agentId, persona, context);
  }

  async updateSkills(agentId: string, skills: AgentSkills, context: ServerContext): Promise<unknown> {
    return this.configService.updateSkills(agentId, skills, context);
  }

  async updateTools(agentId: string, tools: AgentTools, context: ServerContext): Promise<unknown> {
    return this.configService.updateTools(agentId, tools, context);
  }

  async updateTriggers(agentId: string, triggers: AgentTriggers, context: ServerContext): Promise<unknown> {
    return this.configService.updateTriggers(agentId, triggers, context);
  }

  async assignTask(dto: AgentAssignTaskDTO, context: ServerContext): Promise<TaskEntity> {
    return this.taskService.assignTask(dto, context);
  }

  async deleteAgent(agentId: string): Promise<void> {
    return this.crudService.deleteAgent(agentId);
  }

  async handleIncomingMessage(message: MessageEntity, context: ServerContext): Promise<void> {
    return this.responseService.handleIncomingMessage(message, context);
  }

  async shouldAgentRespond(agent: AgentEntity, message: MessageEntity, channel: ChannelEntity): Promise<boolean> {
    return this.responseService.shouldAgentRespond(agent, message, channel);
  }

  async generateAgentResponse(agent: AgentEntity, message: MessageEntity, channel: ChannelEntity): Promise<string> {
    return this.responseService.generateAgentResponse(agent, message, channel);
  }
}
