"use strict";
/**
 * WorkflowLifecycleService - Workflow 生命周期管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowLifecycleService = void 0;
const workflow_errors_1 = require("./workflow.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class WorkflowLifecycleService {
    workflowRepository;
    eventBus;
    logger;
    constructor(workflowRepository, eventBus, logger) {
        this.workflowRepository = workflowRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async activateWorkflow(workflowId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Activating workflow', { workflowId });
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new workflow_errors_1.WorkflowNotFoundError(workflowId);
        }
        const activatedWorkflow = workflow.activate();
        await this.workflowRepository.update(activatedWorkflow, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'workflow.activated',
            aggregateId: workflowId,
            aggregateType: 'Workflow',
            occurredAt: new Date(),
            payload: { workflowId },
        });
        this.logger.info('Workflow activated successfully', { workflowId });
        return activatedWorkflow;
    }
    async pauseWorkflow(workflowId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Pausing workflow', { workflowId });
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new workflow_errors_1.WorkflowNotFoundError(workflowId);
        }
        const pausedWorkflow = workflow.pause();
        await this.workflowRepository.update(pausedWorkflow, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'workflow.paused',
            aggregateId: workflowId,
            aggregateType: 'Workflow',
            occurredAt: new Date(),
            payload: { workflowId },
        });
        this.logger.info('Workflow paused successfully', { workflowId });
        return pausedWorkflow;
    }
    async resumeWorkflow(workflowId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Resuming workflow', { workflowId });
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new workflow_errors_1.WorkflowNotFoundError(workflowId);
        }
        const resumedWorkflow = workflow.resume();
        await this.workflowRepository.update(resumedWorkflow, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'workflow.resumed',
            aggregateId: workflowId,
            aggregateType: 'Workflow',
            occurredAt: new Date(),
            payload: { workflowId },
        });
        this.logger.info('Workflow resumed successfully', { workflowId });
        return resumedWorkflow;
    }
    async completeWorkflow(workflowId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Completing workflow', { workflowId });
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new workflow_errors_1.WorkflowNotFoundError(workflowId);
        }
        const completedWorkflow = workflow.complete();
        await this.workflowRepository.update(completedWorkflow, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'workflow.completed',
            aggregateId: workflowId,
            aggregateType: 'Workflow',
            occurredAt: new Date(),
            payload: { workflowId },
        });
        this.logger.info('Workflow completed successfully', { workflowId });
        return completedWorkflow;
    }
    async archiveWorkflow(workflowId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Archiving workflow', { workflowId });
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new workflow_errors_1.WorkflowNotFoundError(workflowId);
        }
        const archivedWorkflow = workflow.archive();
        await this.workflowRepository.update(archivedWorkflow, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'workflow.archived',
            aggregateId: workflowId,
            aggregateType: 'Workflow',
            occurredAt: new Date(),
            payload: { workflowId },
        });
        this.logger.info('Workflow archived successfully', { workflowId });
        return archivedWorkflow;
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
exports.WorkflowLifecycleService = WorkflowLifecycleService;
