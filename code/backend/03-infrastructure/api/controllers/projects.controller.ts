/**
 * ProjectsController - Project REST API 控制器
 *
 * 路由：
 * - POST   /api/projects              - 创建项目
 * - GET    /api/projects              - 获取项目列表
 * - GET    /api/projects/:projectId   - 获取单个项目
 * - PUT    /api/projects/:projectId   - 更新项目
 * - DELETE /api/projects/:projectId   - 删除项目
 */

import { ProjectService, CreateProjectDTO, UpdateProjectDTO } from '../../../02-application/services/project/project.service';

interface Request {
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class ProjectsController {
  constructor(private readonly projectService: ProjectService) {}

  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, ownerId } = req.body;

      if (!name || !ownerId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'name and ownerId are required' },
        });
        return;
      }

      const dto: CreateProjectDTO = { name, description, ownerId };
      const project = await this.projectService.createProject(dto);

      res.status(201).json({ success: true, data: project.toJSON() });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await this.projectService.getAllProjects();

      res.status(200).json({
        success: true,
        data: { projects: projects.map(p => p.toJSON()), total: projects.length },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async getProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const project = await this.projectService.getProjectById(projectId);

      res.status(200).json({ success: true, data: project.toJSON() });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { name, description } = req.body;

      const dto: UpdateProjectDTO = { name, description };
      const project = await this.projectService.updateProject(projectId, dto);

      res.status(200).json({ success: true, data: project.toJSON() });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      await this.projectService.deleteProject(projectId);

      res.status(200).json({ success: true, data: { projectId, deleted: true } });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    if (error.message?.includes('not found')) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    } else if (error.message?.includes('already exists')) {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
    } else {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Internal server error' } });
    }
  }
}
