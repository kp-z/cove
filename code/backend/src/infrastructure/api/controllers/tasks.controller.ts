/**
 * TasksController - Task REST API 控制器
 *
 * 路由：
 * - POST   /api/projects/:projectId/tasks      - 创建任务
 * - GET    /api/projects/:projectId/tasks      - 获取项目任务列表
 * - GET    /api/tasks/:taskId                  - 获取单个任务
 * - PUT    /api/tasks/:taskId                  - 更新任务
 * - DELETE /api/tasks/:taskId                  - 删除任务
 * - POST   /api/messages/:messageId/convert-to-task - 消息转任务
 * - GET    /api/channels/:channelId/tasks      - 获取频道任务列表
 * - POST   /api/tasks/:taskId/claim            - 认领任务
 * - POST   /api/tasks/:taskId/unclaim          - 放弃认领
 * - PUT    /api/tasks/:taskId/status           - 更新任务状态
 */

import { TaskService, CreateTaskDTO, UpdateTaskDTO } from '../../../application/services/task/task.service';

interface Request {
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class TasksController {
  constructor(private readonly taskService: TaskService) {}

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId!;
      const { title, description, priority, channelId, taskType, createdBy } = req.body;

      if (!title) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'title is required' },
        });
        return;
      }

      const dto: CreateTaskDTO = {
        projectId,
        title,
        description,
        taskType: taskType || 'single_agent',
        priority: priority || 'P2',
        channelId,
        createdBy: createdBy || 'system',
      };
      const task = await this.taskService.createTask(dto);

      res.status(201).json({ success: true, data: task.toJSON() });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  async getProjectTasks(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId!;
      const { status, priority } = req.query;

      let tasks;
      if (status) {
        tasks = await this.taskService.getTasksByStatus(status as any);
      } else if (priority) {
        tasks = await this.taskService.getTasksByPriority(priority as any);
      } else {
        tasks = await this.taskService.getTasksByProject(projectId);
      }

      res.status(200).json({
        success: true,
        data: { tasks: tasks.map(t => t.toJSON()), total: tasks.length },
      });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  async getTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId!;
      const task = await this.taskService.getTaskById(taskId);

      res.status(200).json({ success: true, data: task.toJSON() });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId!;
      const { title, description, priority } = req.body;

      const dto: UpdateTaskDTO = {
        title,
        description,
        priority,
      };
      const task = await this.taskService.updateTask(taskId, dto);

      res.status(200).json({ success: true, data: task.toJSON() });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId!;
      await this.taskService.deleteTask(taskId);

      res.status(200).json({ success: true, data: { taskId, deleted: true } });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * 消息转任务
   * POST /api/messages/:messageId/convert-to-task
   */
  async convertMessageToTask(req: Request, res: Response): Promise<void> {
    try {
      const messageId = req.params.messageId!;
      const { title, createdBy } = req.body;

      if (!title) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'title is required' },
        });
        return;
      }

      if (!createdBy) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'createdBy is required' },
        });
        return;
      }

      const task = await this.taskService.convertMessageToTask(messageId, title, createdBy);

      res.status(201).json({ success: true, data: task.toJSON() });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * 获取频道任务列表
   * GET /api/channels/:channelId/tasks
   */
  async getChannelTasks(req: Request, res: Response): Promise<void> {
    try {
      const channelId = req.params.channelId!;
      const tasks = await this.taskService.getTasksByChannel(channelId);

      res.status(200).json({
        success: true,
        data: { tasks: tasks.map(t => t.toJSON()), total: tasks.length },
      });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * 认领任务
   * POST /api/tasks/:taskId/claim
   */
  async claimTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId!;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'userId is required' },
        });
        return;
      }

      const task = await this.taskService.claimTask({
        taskId,
        assigneeId: userId,
        assigneeType: 'human',
      });

      res.status(200).json({ success: true, data: task.toJSON() });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * 放弃认领任务
   * POST /api/tasks/:taskId/unclaim
   */
  async unclaimTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId!;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'userId is required' },
        });
        return;
      }

      const task = await this.taskService.unclaimTask(taskId, userId);

      res.status(200).json({ success: true, data: task.toJSON() });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * 更新任务状态
   * PUT /api/tasks/:taskId/status
   */
  async updateTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId!;
      const { status, actorId } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'status is required' },
        });
        return;
      }

      if (!actorId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'actorId is required' },
        });
        return;
      }

      const task = await this.taskService.updateTaskStatus(taskId, status, actorId);

      res.status(200).json({ success: true, data: task.toJSON() });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): void {
    const err = error as Error;
    const message = err.message || 'Internal server error';
    const name = err.name || '';

    if (name === 'TaskNotFoundError' || name === 'MessageNotFoundError' || message.includes('not found')) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } });
    } else if (name === 'TaskNotAssignableError' || message.includes('is not the assignee')) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message } });
    } else if (name === 'InvalidStatusTransitionError' || message.includes('Cannot')) {
      res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message } });
    } else {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } });
    }
  }
}
