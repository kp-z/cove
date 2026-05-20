"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskAssignmentService = void 0;
const value_objects_1 = require("../../../domain/models/value-objects");
const task_errors_1 = require("./task.errors");
const agent_errors_1 = require("../agent/agent.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class TaskAssignmentService {
    taskRepository;
    agentRepository;
    eventBus;
    logger;
    constructor(taskRepository, agentRepository, eventBus, logger) {
        this.taskRepository = taskRepository;
        this.agentRepository = agentRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async assignTask(dto) {
        // TODO: Fix logger call
        const context = (0, realm_context_store_1.getRealmContext)();
        const task = await this.findTask(dto.taskId);
        if (task.status !== 'todo') {
            throw new task_errors_1.TaskNotAssignableError(dto.taskId, task.status);
        }
        if (dto.assigneeType === 'agent') {
            const agent = await this.agentRepository.findById(dto.assigneeId);
            if (!agent)
                throw new agent_errors_1.AgentNotFoundError(dto.assigneeId);
        }
        const assignee = value_objects_1.AssigneeRef.create({
            id: dto.assigneeId,
            type: dto.assigneeType,
            assignedAt: new Date(),
        });
        const assigned = task.assignTo(assignee);
        await this.taskRepository.update(assigned, context.realmId);
        await this.publishEvent('task.assigned', dto.taskId, {
            taskId: dto.taskId,
            assigneeId: dto.assigneeId,
            assigneeType: dto.assigneeType,
        });
        return assigned;
    }
    async claimTask(dto) {
        // TODO: Fix logger call
        const context = (0, realm_context_store_1.getRealmContext)();
        const task = await this.findTask(dto.taskId);
        if (task.status !== 'todo') {
            throw new task_errors_1.TaskNotAssignableError(dto.taskId, task.status);
        }
        if (dto.assigneeType === 'agent') {
            const agent = await this.agentRepository.findById(dto.assigneeId);
            if (!agent)
                throw new agent_errors_1.AgentNotFoundError(dto.assigneeId);
        }
        const assignee = value_objects_1.AssigneeRef.create({
            id: dto.assigneeId,
            type: dto.assigneeType,
            assignedAt: new Date(),
        });
        const claimed = task.assignTo(assignee).start();
        await this.taskRepository.update(claimed, context.realmId);
        await this.publishEvent('task.claimed', dto.taskId, {
            taskId: dto.taskId,
            assigneeId: dto.assigneeId,
            assigneeType: dto.assigneeType,
        });
        return claimed;
    }
    async unclaimTask(taskId, userId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Unclaiming task', { taskId, userId });
        const task = await this.findTask(taskId);
        const unclaimed = task.unclaim(userId);
        await this.taskRepository.update(unclaimed, context.realmId);
        await this.publishEvent('task.unclaimed', taskId, { taskId, userId });
        return unclaimed;
    }
    async addDependency(dto) {
        // TODO: Fix logger call
        const context = (0, realm_context_store_1.getRealmContext)();
        const task = await this.findTask(dto.taskId);
        await this.findTask(dto.dependsOnTaskId);
        const updated = task.addDependency(dto.dependsOnTaskId);
        await this.taskRepository.update(updated, context.realmId);
        await this.publishEvent('task.dependency_added', dto.taskId, {
            taskId: dto.taskId, dependsOnTaskId: dto.dependsOnTaskId,
        });
        return updated;
    }
    async removeDependency(dto) {
        // TODO: Fix logger call
        const context = (0, realm_context_store_1.getRealmContext)();
        const task = await this.findTask(dto.taskId);
        const updated = task.removeDependency(dto.dependsOnTaskId);
        await this.taskRepository.update(updated, context.realmId);
        await this.publishEvent('task.dependency_removed', dto.taskId, {
            taskId: dto.taskId, dependsOnTaskId: dto.dependsOnTaskId,
        });
        return updated;
    }
    async findTask(taskId) {
        const task = await this.taskRepository.findById(taskId);
        if (!task)
            throw new task_errors_1.TaskNotFoundError(taskId);
        return task;
    }
    async publishEvent(eventType, aggregateId, payload) {
        try {
            await this.eventBus.publish({
                eventId: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                eventType, aggregateId, aggregateType: 'Task', occurredAt: new Date(), payload,
            });
        }
        catch (error) {
            this.logger.error('Failed to publish event', error, { eventType, aggregateId });
        }
    }
}
exports.TaskAssignmentService = TaskAssignmentService;
