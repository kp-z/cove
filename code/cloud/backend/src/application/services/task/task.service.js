"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidStatusTransitionError = exports.TaskService = exports.TaskNotFoundError = void 0;
const task_entity_1 = require("../../../domain/models/task/task.entity");
const value_objects_1 = require("../../../domain/models/value-objects");
const task_errors_1 = require("./task.errors");
const message_errors_1 = require("../message/message.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
var task_errors_2 = require("./task.errors");
Object.defineProperty(exports, "TaskNotFoundError", { enumerable: true, get: function () { return task_errors_2.TaskNotFoundError; } });
class TaskService {
    taskRepository;
    taskStatusService;
    taskAssignmentService;
    eventBus;
    logger;
    messageRepository;
    constructor(taskRepository, taskStatusService, taskAssignmentService, eventBus, logger, messageRepository) {
        this.taskRepository = taskRepository;
        this.taskStatusService = taskStatusService;
        this.taskAssignmentService = taskAssignmentService;
        this.eventBus = eventBus;
        this.logger = logger;
        this.messageRepository = messageRepository;
    }
    async createTask(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Creating new task', { title: dto.title });
        const taskId = this.generateTaskId();
        const actor = value_objects_1.ActorRef.create({ id: dto.createdBy, type: 'human' });
        const task = task_entity_1.TaskEntity.create({
            taskId,
            title: dto.title,
            description: dto.description,
            taskType: dto.taskType,
            priority: dto.priority,
            status: 'todo',
            channelId: dto.channelId,
            projectId: dto.projectId,
            krId: dto.krId,
            dependsOn: dto.dependsOn ? [...dto.dependsOn] : [],
            createdBy: actor,
            createdAt: new Date(),
        });
        await this.taskRepository.save(task, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'task.created',
            aggregateId: task.taskId,
            aggregateType: 'Task',
            occurredAt: new Date(),
            payload: { taskId: task.taskId, title: task.title, channelId: dto.channelId, createdBy: dto.createdBy },
        });
        this.logger.info('Task created successfully', { taskId: task.taskId });
        return task;
    }
    async getTaskById(taskId) {
        const task = await this.taskRepository.findById(taskId);
        if (!task)
            throw new task_errors_1.TaskNotFoundError(taskId);
        return task;
    }
    async getTasksByChannel(channelId) {
        return this.taskRepository.findByChannel(channelId);
    }
    async getTasksByProject(projectId) {
        return this.taskRepository.findByProject(projectId);
    }
    async getTasksByStatus(status) {
        return this.taskRepository.findByStatus(status);
    }
    async getTasksByPriority(priority) {
        return this.taskRepository.findByPriority(priority);
    }
    async getTasksByAssignee(assigneeId) {
        return this.taskRepository.findByAssignee(assigneeId);
    }
    async updateTask(taskId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating task', { taskId });
        // Handle status update if provided
        if (dto.status !== undefined && dto.actorId !== undefined) {
            return this.taskStatusService.updateTaskStatus(taskId, dto.status, dto.actorId);
        }
        const task = await this.getTaskById(taskId);
        const json = task.toJSON();
        const updated = task_entity_1.TaskEntity.fromJSON({
            ...json,
            title: dto.title ?? json.title,
            description: dto.description !== undefined ? dto.description : json.description,
            priority: dto.priority ?? json.priority,
        });
        await this.taskRepository.update(updated, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'task.updated',
            aggregateId: taskId,
            aggregateType: 'Task',
            occurredAt: new Date(),
            payload: { taskId, changes: dto },
        });
        return updated;
    }
    async deleteTask(taskId) {
        this.logger.info('Deleting task', { taskId });
        const task = await this.getTaskById(taskId);
        if (task.status !== 'cancelled' && task.status !== 'done') {
            throw new task_errors_1.TaskNotDeletableError(taskId, task.status);
        }
        await this.taskRepository.delete(taskId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'task.deleted',
            aggregateId: taskId,
            aggregateType: 'Task',
            occurredAt: new Date(),
            payload: { taskId },
        });
    }
    async convertMessageToTask(messageId, title, createdBy) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Converting message to task', { messageId, title });
        if (!this.messageRepository) {
            throw new Error('MessageRepository is required for convertMessageToTask');
        }
        const message = await this.messageRepository.findById(messageId);
        if (!message)
            throw new message_errors_1.MessageNotFoundError(messageId);
        const taskNumber = await this.taskRepository.getNextTaskNumber(message.channelId);
        const taskId = this.generateTaskId();
        const actor = value_objects_1.ActorRef.create({ id: createdBy, type: 'human' });
        const task = task_entity_1.TaskEntity.create({
            taskId,
            title,
            taskType: 'single_agent',
            priority: 'P2',
            status: 'todo',
            channelId: message.channelId,
            projectId: 'default',
            sourceMessageId: messageId,
            taskNumber,
            createdBy: actor,
            createdAt: new Date(),
        });
        await this.taskRepository.save(task, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'task.created',
            aggregateId: task.taskId,
            aggregateType: 'Task',
            occurredAt: new Date(),
            payload: { taskId: task.taskId, title, channelId: message.channelId, sourceMessageId: messageId, taskNumber, createdBy },
        });
        return task;
    }
    // --- Delegation to TaskStatusService ---
    async startTask(taskId) { return this.taskStatusService.startTask(taskId); }
    async submitForReview(taskId) { return this.taskStatusService.submitForReview(taskId); }
    async completeTask(taskId) { return this.taskStatusService.completeTask(taskId); }
    async blockTask(taskId) { return this.taskStatusService.blockTask(taskId); }
    async cancelTask(taskId) { return this.taskStatusService.cancelTask(taskId); }
    // --- Delegation to TaskAssignmentService ---
    async assignTask(dto) { return this.taskAssignmentService.assignTask(dto); }
    async claimTask(dto) { return this.taskAssignmentService.claimTask(dto); }
    async unclaimTask(taskId, userId) { return this.taskAssignmentService.unclaimTask(taskId, userId); }
    async addDependency(dto) { return this.taskAssignmentService.addDependency(dto); }
    async removeDependency(dto) { return this.taskAssignmentService.removeDependency(dto); }
    // --- Private helpers ---
    generateTaskId() {
        return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
                eventType: event.eventType, aggregateId: event.aggregateId,
            });
        }
    }
}
exports.TaskService = TaskService;
class InvalidStatusTransitionError extends Error {
    constructor(fromStatus, toStatus) {
        super(`Invalid status transition from '${fromStatus}' to '${toStatus}'`);
        this.name = 'InvalidStatusTransitionError';
    }
}
exports.InvalidStatusTransitionError = InvalidStatusTransitionError;
