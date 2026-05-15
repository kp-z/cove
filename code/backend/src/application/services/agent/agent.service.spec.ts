/**
 * AgentService 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentService } from './agent.service';
import { AgentCrudService, CreateAgentDTO, UpdateAgentDTO } from './agent-crud.service';
import { AgentQueryService } from './agent-query.service';
import { AgentConfigService } from './agent-config.service';
import { AgentTaskService, AgentAssignTaskDTO } from './agent-task.service';
import { AgentResponseService } from './agent-response.service';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { TaskEntity } from '../../../domain/models/task/task.entity';
import { AgentNotFoundError } from './agent.errors';

describe('AgentService', () => {
  let agentService: AgentService;
  let mockCrudService: AgentCrudService;
  let mockQueryService: AgentQueryService;
  let mockConfigService: AgentConfigService;
  let mockTaskService: AgentTaskService;
  let mockResponseService: AgentResponseService;

  beforeEach(() => {
    mockCrudService = {
      createAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
    } as unknown as AgentCrudService;

    mockQueryService = {
      getAgentById: vi.fn(),
      getAgentDetail: vi.fn(),
      listAgents: vi.fn(),
      getAgentsByStatus: vi.fn(),
      getAvailableAgents: vi.fn(),
    } as unknown as AgentQueryService;

    mockConfigService = {
      updateRuntime: vi.fn(),
      updatePersona: vi.fn(),
      updateSkills: vi.fn(),
      updateTools: vi.fn(),
      updateTriggers: vi.fn(),
    } as unknown as AgentConfigService;

    mockTaskService = {
      assignTask: vi.fn(),
    } as unknown as AgentTaskService;

    mockResponseService = {
      shouldAgentRespond: vi.fn(),
      generateAgentResponse: vi.fn(),
    } as unknown as AgentResponseService;

    agentService = new AgentService(
      mockCrudService,
      mockQueryService,
      mockConfigService,
      mockTaskService,
      mockResponseService
    );
  });

  describe('createAgent', () => {
    it('should create a new agent with valid data', async () => {
      const dto: CreateAgentDTO = {
        name: 'test-agent',
        displayName: 'Test Agent',
        projectId: 'project-1',
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: dto.name,
        displayName: dto.displayName,
        projectId: dto.projectId,
        category: 'engineering',
        status: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: dto.createdBy,
      });

      vi.mocked(mockCrudService.createAgent).mockResolvedValue(mockAgent);

      const result = await agentService.createAgent(dto);

      expect(result).toBe(mockAgent);
      expect(mockCrudService.createAgent).toHaveBeenCalledWith(dto);
    });

    it('should save agent to repository', async () => {
      const dto: CreateAgentDTO = {
        name: 'test-agent',
        displayName: 'Test Agent',
        projectId: 'project-1',
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: dto.name,
        displayName: dto.displayName,
        projectId: dto.projectId,
        category: 'engineering',
        status: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: dto.createdBy,
      });

      vi.mocked(mockCrudService.createAgent).mockResolvedValue(mockAgent);

      await agentService.createAgent(dto);

      expect(mockCrudService.createAgent).toHaveBeenCalled();
    });

    it('should publish agent.created event', async () => {
      const dto: CreateAgentDTO = {
        name: 'test-agent',
        displayName: 'Test Agent',
        projectId: 'project-1',
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: dto.name,
        displayName: dto.displayName,
        projectId: dto.projectId,
        category: 'engineering',
        status: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: dto.createdBy,
      });

      vi.mocked(mockCrudService.createAgent).mockResolvedValue(mockAgent);

      await agentService.createAgent(dto);

      expect(mockCrudService.createAgent).toHaveBeenCalled();
    });

    it('should log agent creation', async () => {
      const dto: CreateAgentDTO = {
        name: 'test-agent',
        displayName: 'Test Agent',
        projectId: 'project-1',
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: dto.name,
        displayName: dto.displayName,
        projectId: dto.projectId,
        category: 'engineering',
        status: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: dto.createdBy,
      });

      vi.mocked(mockCrudService.createAgent).mockResolvedValue(mockAgent);

      await agentService.createAgent(dto);

      expect(mockCrudService.createAgent).toHaveBeenCalled();
    });
  });

  describe('getAgentById', () => {
    it('should return agent when found', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        projectId: 'project-1',
        category: 'engineering',
        status: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockQueryService.getAgentById).mockResolvedValue(mockAgent);

      const result = await agentService.getAgentById('agent-1');

      expect(result).toBe(mockAgent);
    });

    it('should throw AgentNotFoundError when not found', async () => {
      vi.mocked(mockQueryService.getAgentById).mockRejectedValue(
        new AgentNotFoundError('nonexistent')
      );

      await expect(agentService.getAgentById('nonexistent')).rejects.toThrow(
        AgentNotFoundError
      );
    });
  });

  describe('getAgentsByStatus', () => {
    it('should return agents with matching status', async () => {
      const mockAgents = [
        AgentEntity.create({
          agentId: 'agent-1',
          name: 'agent-1',
          displayName: 'Agent 1',
          projectId: 'project-1',
          category: 'engineering',
        status: 'idle',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        }),
        AgentEntity.create({
          agentId: 'agent-2',
          name: 'agent-2',
          displayName: 'Agent 2',
          projectId: 'project-1',
          category: 'engineering',
        status: 'idle',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        }),
      ];

      vi.mocked(mockQueryService.getAgentsByStatus).mockResolvedValue(mockAgents);

      const result = await agentService.getAgentsByStatus('idle');

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockAgents);
    });
  });

  describe('updateAgent', () => {
    it('should update agent properties', async () => {
      const dto: UpdateAgentDTO = {
        displayName: 'Updated Agent',
      };

      const updatedAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Updated Agent',
        projectId: 'project-1',
        category: 'engineering',
        status: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockCrudService.updateAgent).mockResolvedValue(updatedAgent);

      const result = await agentService.updateAgent('agent-1', dto);

      expect(result.displayName).toBe('Updated Agent');
    });

    it('should publish agent.updated event', async () => {
      const dto: UpdateAgentDTO = {
        displayName: 'Updated Agent',
      };

      const updatedAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Updated Agent',
        projectId: 'project-1',
        category: 'engineering',
        status: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockCrudService.updateAgent).mockResolvedValue(updatedAgent);

      await agentService.updateAgent('agent-1', dto);

      expect(mockCrudService.updateAgent).toHaveBeenCalled();
    });
  });

  describe('assignTask', () => {
    it('should assign task to idle agent', async () => {
      const dto: AgentAssignTaskDTO = {
        agentId: 'agent-1',
        taskId: 'task-1',
      };

      const mockTask = TaskEntity.create({
        taskId: 'task-1',
        title: 'Test Task',
        taskType: 'single_agent',
        projectId: 'project-1',
        status: 'in_progress',
        priority: 'P2',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockTaskService.assignTask).mockResolvedValue(mockTask);

      const result = await agentService.assignTask(dto);

      expect(result).toBe(mockTask);
      expect(mockTaskService.assignTask).toHaveBeenCalledWith(dto);
    });

    it('should throw error when agent is not available', async () => {
      const dto: AgentAssignTaskDTO = {
        agentId: 'agent-1',
        taskId: 'task-1',
      };

      vi.mocked(mockTaskService.assignTask).mockRejectedValue(
        new Error('Agent is not available')
      );

      await expect(agentService.assignTask(dto)).rejects.toThrow('Agent is not available');
    });

    it('should throw error when task is not in todo status', async () => {
      const dto: AgentAssignTaskDTO = {
        agentId: 'agent-1',
        taskId: 'task-1',
      };

      vi.mocked(mockTaskService.assignTask).mockRejectedValue(
        new Error('Task cannot be assigned')
      );

      await expect(agentService.assignTask(dto)).rejects.toThrow('Task cannot be assigned');
    });

    it('should publish task.assigned event', async () => {
      const dto: AgentAssignTaskDTO = {
        agentId: 'agent-1',
        taskId: 'task-1',
      };

      const mockTask = TaskEntity.create({
        taskId: 'task-1',
        title: 'Test Task',
        taskType: 'single_agent',
        projectId: 'project-1',
        status: 'in_progress',
        priority: 'P2',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockTaskService.assignTask).mockResolvedValue(mockTask);

      await agentService.assignTask(dto);

      expect(mockTaskService.assignTask).toHaveBeenCalled();
    });
  });

  describe('deleteAgent', () => {
    it('should delete an idle agent', async () => {
      vi.mocked(mockCrudService.deleteAgent).mockResolvedValue(undefined);

      await expect(agentService.deleteAgent('agent-1')).resolves.toBeUndefined();
      expect(mockCrudService.deleteAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should throw error when deleting active agent', async () => {
      vi.mocked(mockCrudService.deleteAgent).mockRejectedValue(
        new Error('Agent is in use')
      );

      await expect(agentService.deleteAgent('agent-1')).rejects.toThrow('Agent is in use');
    });

    it('should publish agent.deleted event', async () => {
      vi.mocked(mockCrudService.deleteAgent).mockResolvedValue(undefined);

      await agentService.deleteAgent('agent-1');

      expect(mockCrudService.deleteAgent).toHaveBeenCalled();
    });
  });
});
