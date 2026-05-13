/**
 * ChannelsController - Channel REST API 控制器
 *
 * 职责：
 * - 处理 HTTP 请求和响应
 * - 参数验证和转换
 * - 调用 ChannelService 业务逻辑
 * - 统一错误处理
 *
 * 路由：
 * - POST   /api/channels - 创建频道
 * - GET    /api/channels/:channelId - 获取频道详情
 * - PUT    /api/channels/:channelId - 更新频道
 * - DELETE /api/channels/:channelId - 删除频道
 * - GET    /api/channels/:channelId/members - 获取频道成员
 * - POST   /api/channels/:channelId/members - 添加成员
 * - DELETE /api/channels/:channelId/members/:memberId - 移除成员
 * - GET    /api/projects/:projectId/channels - 获取项目的所有频道
 */

import { ChannelService, CreateChannelDTO, UpdateChannelDTO } from '../../02-application/services/channel/channel.service';

// 统一的 API 响应格式
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Express Request/Response 类型（简化版）
interface Request {
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class ChannelsController {
  constructor(private readonly channelService: ChannelService) {}

  /**
   * POST /api/channels
   * 创建频道
   */
  async createChannel(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, type, projectId, createdBy, memberIds } = req.body;

      if (!name || !type || !createdBy) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'name, type, and createdBy are required',
          },
        });
        return;
      }

      const dto: CreateChannelDTO = {
        name,
        description,
        type,
        projectId,
        createdBy,
        memberIds,
      };

      const channel = await this.channelService.createChannel(dto);

      // 返回成功响应
      res.status(201).json({
        success: true,
        data: channel.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/channels/:channelId
   * 获取频道详情
   */
  async getChannelById(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;

      const channel = await this.channelService.getChannelById(channelId);

      res.status(200).json({
        success: true,
        data: channel.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * PUT /api/channels/:channelId
   * 更新频道
   */
  async updateChannel(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const { name, description } = req.body;

      const dto: UpdateChannelDTO = { name, description };
      const channel = await this.channelService.updateChannel(channelId, dto);

      res.status(200).json({
        success: true,
        data: channel.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * DELETE /api/channels/:channelId
   * 删除频道
   */
  async deleteChannel(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;

      await this.channelService.deleteChannel(channelId);

      res.status(200).json({
        success: true,
        data: { channelId, deleted: true },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/channels/:channelId/members
   * 获取频道成员列表
   */
  async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;

      const channel = await this.channelService.getChannelById(channelId);
      const members = channel.members;

      res.status(200).json({
        success: true,
        data: {
          channelId,
          members: members.map(m => ({
            memberId: m.memberId,
            memberType: m.memberType,
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
          })),
          total: members.length,
        },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/channels/:channelId/members
   * 添加成员
   */
  async addMember(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const { memberId } = req.body;

      if (!memberId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'memberId is required',
          },
        });
        return;
      }

      const channel = await this.channelService.addMember({ channelId, memberId });

      res.status(200).json({
        success: true,
        data: channel.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * DELETE /api/channels/:channelId/members/:memberId
   * 移除成员
   */
  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const { channelId, memberId } = req.params;

      const channel = await this.channelService.removeMember({ channelId, memberId });

      res.status(200).json({
        success: true,
        data: channel.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/projects/:projectId/channels
   * 获取项目的所有频道
   */
  async getChannels(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId as string | undefined;

      let channels;
      if (projectId) {
        channels = await this.channelService.getChannelsByProject(projectId);
      } else {
        channels = await this.channelService.getAllChannels();
      }

      res.status(200).json({
        success: true,
        data: {
          channels: channels.map(c => c.toJSON()),
          total: channels.length,
        },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/channels/:channelId/agents
   * 获取频道的 Agent Pool
   */
  async getAgents(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;

      const channel = await this.channelService.getChannelById(channelId);
      const agentPool = channel.agentPool;

      res.status(200).json({
        success: true,
        data: {
          channelId,
          agentPool,
          total: agentPool.length,
        },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * 统一错误处理
   */
  private handleError(error: any, res: Response): void {
    console.error('ChannelsController error:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else if (error.message?.includes('already exists')) {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: error.message,
        },
      });
    } else if (error.message?.includes('not active')) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
      });
    }
  }
}
