/**
 * UsersController - User REST API 控制器
 *
 * 路由：
 * - POST   /api/users          - 创建用户
 * - GET    /api/users          - 获取用户列表
 * - GET    /api/users/:userId  - 获取单个用户
 * - PUT    /api/users/:userId  - 更新用户
 * - DELETE /api/users/:userId  - 删除用户
 */

import { UserService, CreateUserDTO, UpdateUserDTO } from '../../../application/services/user/user.service';

interface Request {
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class UsersController {
  constructor(private readonly userService: UserService) {}

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, displayName, email, role, avatar } = req.body;

      if (!username || !displayName || !email) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'username, displayName, and email are required' },
        });
        return;
      }

      const dto: CreateUserDTO = { username, displayName, email, role, avatar };
      const user = await this.userService.createUser(dto);

      res.status(201).json({ success: true, data: user.toJSON() });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.query;

      const users = role
        ? await this.userService.getUsersByRole(role as any)
        : await this.userService.getAllUsers();

      res.status(200).json({
        success: true,
        data: { users: users.map(u => u.toJSON()), total: users.length },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId!;
      const user = await this.userService.getUserById(userId);

      res.status(200).json({ success: true, data: user.toJSON() });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId!;
      const { displayName, email, avatar } = req.body;

      const dto: UpdateUserDTO = { displayName, email, avatar };
      const user = await this.userService.updateUser(userId, dto);

      res.status(200).json({ success: true, data: user.toJSON() });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId!;
      await this.userService.deleteUser(userId);

      res.status(200).json({ success: true, data: { userId, deleted: true } });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    if (error.name === 'UserNotFoundError') {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    } else if (error.name === 'UsernameAlreadyExistsError' || error.name === 'EmailAlreadyExistsError') {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
    } else {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Internal server error' } });
    }
  }
}
