"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatusService = void 0;
const task_service_1 = require("./task.service");
const realm_context_store_1 = require("../../context/realm-context-store");
class TaskStatusService {
    taskRepository;
    eventBus;
    logger;
    constructor(taskRepository, eventBus, logger) {
        this.taskRepository = taskRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async startTask(taskId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Starting task', { taskId });
        const task = await this.findTask(taskId);
        const updated = task.start();
        await this.taskRepository.update(updated, context.realmId);
        await this.publishEvent('task.started', taskId, { taskId });
        return updated;
    }
    async submitForReview(taskId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Submitting task for review', { taskId });
        const task = await this.findTask(taskId);
        const updated = task.submitForReview();
        await this.taskRepository.update(updated, context.realmId);
        await this.publishEvent('task.submitted_for_review', taskId, { taskId });
        return updated;
    }
    async completeTask(taskId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Completing task', { taskId });
        const task = await this.findTask(taskId);
        const updated = task.complete();
        await this.taskRepository.update(updated, context.realmId);
        await this.publishEvent('task.completed', taskId, { taskId });
        return updated;
    }
    async blockTask(taskId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Blocking task', { taskId });
        const task = await this.findTask(taskId);
        const updated = task.block();
        await this.taskRepository.update(updated, context.realmId);
        await this.publishEvent('task.blocked', taskId, { taskId });
        return updated;
    }
    async cancelTask(taskId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Cancelling task', { taskId });
        const task = await this.findTask(taskId);
        const updated = task.cancel();
        await this.taskRepository.update(updated, context.realmId);
        await this.publishEvent('task.cancelled', taskId, { taskId });
        return updated;
    }
    async updateTaskStatus(taskId, status, actorId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating task status', { taskId, status, actorId });
        const task = await this.findTask(taskId);
        let updated;
        switch (status) {
            case 'in_progress':
                updated = task.start();
                break;
            case 'in_review':
                updated = task.submitForReview();
                break;
            case 'done':
                updated = task.complete();
                break;
            case 'blocked':
                updated = task.block();
                break;
            case 'cancelled':
                updated = task.cancel();
                break;
            default: throw new task_service_1.InvalidStatusTransitionError(task.status, status);
        }
        await this.taskRepository.update(updated, context.realmId);
        await this.publishEvent('task.status_updated', taskId, {
            taskId, previousStatus: task.status, newStatus: status, actorId,
        });
        return updated;
    }
    async findTask(taskId) {
        const task = await this.taskRepository.findById(taskId);
        if (!task)
            throw new task_service_1.TaskNotFoundError(taskId);
        return task;
    }
    async publishEvent(eventType, aggregateId, payload) {
        try {
            await this.eventBus.publish({
                eventId: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                eventType,
                aggregateId,
                aggregateType: 'Task',
                occurredAt: new Date(),
                payload,
            });
        }
        catch (error) {
            this.logger.error('Failed to publish event', error, { eventType, aggregateId });
        }
    }
}
exports.TaskStatusService = TaskStatusService;
