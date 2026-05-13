/**
 * WorkflowsController - Workflow REST API 控制器
 *
 * 路由：
 * - POST   /api/projects/:projectId/workflows  - 创建工作流
 * - GET    /api/projects/:projectId/workflows  - 获取项目工作流列表
 * - GET    /api/workflows/:workflowId          - 获取单个工作流
 * - PUT    /api/workflows/:workflowId          - 更新工作流
 * - POST   /api/workflows/:workflowId/execute  - 执行工作流
 * - DELETE /api/workflows/:workflowId          - 删除工作流
 */

import { WorkflowService, CreateWorkflowDTO, UpdateWorkflowDTO } from '../../../02-application/services/workflow/workflow.service';

interface Request {
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class WorkflowsController {
  constructor(private readonly workflowService: WorkflowService) {}

  async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { name, type, description, steps } = req.body;

      if (!name || !type) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'name and type are required' },
        });
        return;
      }

      const dto: CreateWorkflowDTO = { projectId, name, type, description, steps };
      const workflow = await this.workflowService.createWorkflow(dto);

      res.status(201).json({ success: true, data: workflow.toJSON() });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async getProjectWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { status } = req.query;

      let workflows;
      if (status) {
        workflows = await this.workflowService.getWorkflowsByStatus(projectId, status as any);
      } else {
        workflows = await this.workflowService.getWorkflowsByProject(projectId);
      }

      res.status(200).json({
        success: true,
        data: { workflows: workflows.map(w => w.toJSON()), total: workflows.length },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async getWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const workflow = await this.workflowService.getWorkflowById(workflowId);

      res.status(200).json({ success: true, data: workflow.toJSON() });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { name, description, steps } = req.body;

      const dto: UpdateWorkflowDTO = { name, description, steps };
      const workflow = await this.workflowService.updateWorkflow(workflowId, dto);

      res.status(200).json({ success: true, data: workflow.toJSON() });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { triggeredBy } = req.body;

      const execution = await this.workflowService.executeWorkflow(workflowId, triggeredBy);

      res.status(200).json({ success: true, data: execution });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      await this.workflowService.deleteWorkflow(workflowId);

      res.status(200).json({ success: true, data: { workflowId, deleted: true } });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    if (error.message?.includes('not found')) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    } else {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Internal server error' } });
    }
  }
}
