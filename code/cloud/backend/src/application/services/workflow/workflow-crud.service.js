"use strict";
/**
 * WorkflowCrudService - Workflow CRUD 操作
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowCrudService = void 0;
const workflow_entity_1 = require("../../../domain/models/workflow/workflow.entity");
const workflow_errors_1 = require("./workflow.errors");
const task_errors_1 = require("../task/task.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class WorkflowCrudService {
    workflowRepository;
    taskRepository;
    eventBus;
    logger;
    constructor(workflowRepository, taskRepository, eventBus, logger) {
        this.workflowRepository = workflowRepository;
        this.taskRepository = taskRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async createWorkflow(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Creating new workflow', { name: dto.name });
        const workflowId = this.generateWorkflowId();
        await this.validateWorkflowSteps(dto.steps);
        const workflow = workflow_entity_1.WorkflowEntity.create({
            workflowId,
            name: dto.name,
            description: dto.description,
            krId: dto.krId,
            projectId: dto.projectId,
            status: 'draft',
            steps: dto.steps,
            triggers: dto.triggers || [],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: {
                id: dto.createdBy,
                type: 'human',
            },
            meta: {
                tags: [],
            },
        });
        await this.workflowRepository.save(workflow, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'workflow.created',
            aggregateId: workflow.workflowId,
            aggregateType: 'Workflow',
            occurredAt: new Date(),
            payload: {
                workflowId: workflow.workflowId,
                name: workflow.name,
                projectId: dto.projectId,
                createdBy: dto.createdBy,
            },
        });
        this.logger.info('Workflow created successfully', { workflowId: workflow.workflowId });
        return workflow;
    }
    async updateWorkflow(workflowId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating workflow', { workflowId });
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new workflow_errors_1.WorkflowNotFoundError(workflowId);
        }
        let updatedWorkflow = workflow;
        if (dto.name !== undefined) {
            updatedWorkflow = updatedWorkflow.updateName(dto.name);
        }
        if (dto.description !== undefined) {
            updatedWorkflow = updatedWorkflow.updateDescription(dto.description);
        }
        await this.workflowRepository.update(updatedWorkflow, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'workflow.updated',
            aggregateId: workflowId,
            aggregateType: 'Workflow',
            occurredAt: new Date(),
            payload: {
                workflowId,
                changes: dto,
            },
        });
        this.logger.info('Workflow updated successfully', { workflowId });
        return updatedWorkflow;
    }
    async deleteWorkflow(workflowId) {
        this.logger.info('Deleting workflow', { workflowId });
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new workflow_errors_1.WorkflowNotFoundError(workflowId);
        }
        if (workflow.status !== 'archived') {
            throw new workflow_errors_1.WorkflowNotArchivedError(workflowId);
        }
        await this.workflowRepository.delete(workflowId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'workflow.deleted',
            aggregateId: workflowId,
            aggregateType: 'Workflow',
            occurredAt: new Date(),
            payload: { workflowId },
        });
        this.logger.info('Workflow deleted successfully', { workflowId });
    }
    async validateWorkflowSteps(steps) {
        for (const stage of steps) {
            for (const step of stage) {
                const task = await this.taskRepository.findById(step.taskId);
                if (!task) {
                    throw new task_errors_1.TaskNotFoundError(step.taskId);
                }
            }
        }
    }
    generateWorkflowId() {
        return `workflow-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
exports.WorkflowCrudService = WorkflowCrudService;
