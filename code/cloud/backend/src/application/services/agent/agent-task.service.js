"use strict";
/**
 * AgentTaskService - Agent 任务分配
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTaskService = void 0;
const value_objects_1 = require("../../../domain/models/value-objects");
const agent_errors_1 = require("./agent.errors");
const task_errors_1 = require("../task/task.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class AgentTaskService {
    agentRepository;
    taskRepository;
    eventBus;
    logger;
    constructor(agentRepository, taskRepository, eventBus, logger) {
        this.agentRepository = agentRepository;
        this.taskRepository = taskRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async assignTask(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Assigning task to agent', { ...dto, realmId: context.realmId });
        const agent = await this.agentRepository.findById(dto.agentId);
        if (!agent) {
            throw new agent_errors_1.AgentNotFoundError(dto.agentId);
        }
        if (agent.status !== 'idle' && agent.status !== 'active') {
            throw new agent_errors_1.AgentNotAvailableError(dto.agentId, agent.status);
        }
        const task = await this.taskRepository.findById(dto.taskId);
        if (!task) {
            throw new task_errors_1.TaskNotFoundError(dto.taskId);
        }
        if (task.status !== 'todo') {
            throw new task_errors_1.TaskNotAssignableError(dto.taskId, task.status);
        }
        const assignee = value_objects_1.AssigneeRef.create({
            id: dto.agentId,
            type: 'agent',
            assignedAt: new Date(),
        });
        const assignedTask = task.claim(assignee);
        await this.taskRepository.update(assignedTask, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'task.assigned',
            aggregateId: dto.taskId,
            aggregateType: 'Task',
            occurredAt: new Date(),
            payload: {
                taskId: dto.taskId,
                agentId: dto.agentId,
            },
        });
        this.logger.info('Task assigned to agent successfully', { ...dto });
        return assignedTask;
    }
    generateEventId() {
        return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    async publishEvent(event) {
        try {
            await this.eventBus.publish(event);
        }
        catch (error) {
            this.logger.error('Failed to publish event', error, {
                eventType: event.eventType,
                aggregateId: event.aggregateId,
            });
        }
    }
}
exports.AgentTaskService = AgentTaskService;
