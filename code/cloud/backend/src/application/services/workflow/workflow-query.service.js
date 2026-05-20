"use strict";
/**
 * WorkflowQueryService - Workflow 查询操作
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowQueryService = void 0;
const workflow_errors_1 = require("./workflow.errors");
class WorkflowQueryService {
    workflowRepository;
    constructor(workflowRepository) {
        this.workflowRepository = workflowRepository;
    }
    async getWorkflowById(workflowId) {
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new workflow_errors_1.WorkflowNotFoundError(workflowId);
        }
        return workflow;
    }
    async getWorkflowsByProject(projectId) {
        return await this.workflowRepository.findByProject(projectId);
    }
    async getWorkflowsByKR(krId) {
        return await this.workflowRepository.findByKR(krId);
    }
    async getWorkflowsByStatus(status) {
        return await this.workflowRepository.findByStatus(status);
    }
    async getActiveWorkflows() {
        return await this.workflowRepository.findActive();
    }
    async getWorkflowSteps(workflowId) {
        const workflow = await this.getWorkflowById(workflowId);
        return workflow.steps;
    }
}
exports.WorkflowQueryService = WorkflowQueryService;
