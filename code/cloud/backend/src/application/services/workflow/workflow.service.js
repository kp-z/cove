"use strict";
/**
 * WorkflowService - Workflow 管理业务逻辑（协调器）
 *
 * 职责：
 * - 协调各个子服务完成 Workflow 管理功能
 *
 * 子服务：
 * - WorkflowCrudService: CRUD 操作
 * - WorkflowQueryService: 查询操作
 * - WorkflowLifecycleService: 生命周期管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
class WorkflowService {
    crudService;
    queryService;
    lifecycleService;
    constructor(crudService, queryService, lifecycleService) {
        this.crudService = crudService;
        this.queryService = queryService;
        this.lifecycleService = lifecycleService;
    }
    async createWorkflow(dto) {
        return this.crudService.createWorkflow(dto);
    }
    async getWorkflowById(workflowId) {
        return this.queryService.getWorkflowById(workflowId);
    }
    async getWorkflowsByProject(projectId) {
        return this.queryService.getWorkflowsByProject(projectId);
    }
    async getWorkflowsByKR(krId) {
        return this.queryService.getWorkflowsByKR(krId);
    }
    async getWorkflowsByStatus(status) {
        return this.queryService.getWorkflowsByStatus(status);
    }
    async getActiveWorkflows() {
        return this.queryService.getActiveWorkflows();
    }
    async updateWorkflow(workflowId, dto) {
        return this.crudService.updateWorkflow(workflowId, dto);
    }
    async activateWorkflow(workflowId) {
        return this.lifecycleService.activateWorkflow(workflowId);
    }
    async pauseWorkflow(workflowId) {
        return this.lifecycleService.pauseWorkflow(workflowId);
    }
    async resumeWorkflow(workflowId) {
        return this.lifecycleService.resumeWorkflow(workflowId);
    }
    async completeWorkflow(workflowId) {
        return this.lifecycleService.completeWorkflow(workflowId);
    }
    async archiveWorkflow(workflowId) {
        return this.lifecycleService.archiveWorkflow(workflowId);
    }
    async deleteWorkflow(workflowId) {
        return this.crudService.deleteWorkflow(workflowId);
    }
    async getWorkflowSteps(workflowId) {
        return this.queryService.getWorkflowSteps(workflowId);
    }
}
exports.WorkflowService = WorkflowService;
