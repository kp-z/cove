/**
 * MessagesController - Message REST API 控制器
 *
 * 职责：
 * - 处理 HTTP 请求和响应
 * - 参数验证和转换
 * - 调用 MessageService 业务逻辑
 * - 统一错误处理
 *
 * 路由：
 * - POST   /api/channels/:channelId/messages - 发送消息
 * - GET    /api/channels/:channelId/messages - 获取频道消息
 * - GET    /api/messages/:messageId - 获取单条消息
 * - PUT    /api/messages/:messageId - 更新消息
 * - DELETE /api/messages/:messageId - 删除消息
 * - POST   /api/messages/:messageId/reactions - 添加反应
 * - DELETE /api/messages/:messageId/reactions - 移除反应
 */

import { MessageService, SendMessageDTO, UpdateMessageDTO } from '../../02-application/services/message/message.service';

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

export class MessagesController {
  constructor(private readonly messageService: MessageService) {}

  /**
   * POST /api/channels/:channelId/messages
   * 发送消息
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const { senderId, senderType, content, threadId, attachments, mentions } = req.body;

      // 参数验证
      if (!senderId || !content) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'senderId and content are required',
          },
        });
        return;
      }

      // 调用 Service
      const dto: SendMessageDTO = {
        channelId,
        senderId,
        senderType: senderType || 'human',
        content,
        threadId,
        attachments,
        mentions,
      };

      const message = await this.messageService.sendMessage(dto);

      // 返回成功响应
      res.status(201).json({
        success: true,
        data: message.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/channels/:channelId/messages
   * 获取频道消息列表
   */
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const cursor = req.query.cursor as string | undefined;

      const result = await this.messageService.getMessagesByChannelCursor(channelId, cursor || null, limit);

      res.status(200).json({
        success: true,
        data: {
          messages: result.messages.map(m => m.toJSON()),
          nextCursor: result.nextCursor,
        },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/messages/:messageId
   * 获取单条消息
   */
  async getMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;

      const message = await this.messageService.getMessageById(messageId);

      res.status(200).json({
        success: true,
        data: message.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * PUT /api/messages/:messageId
   * 更新消息内容
   */
  async updateMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { content, editorId } = req.body;

      if (!content || !editorId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'content and editorId are required',
          },
        });
        return;
      }

      const dto: UpdateMessageDTO = { messageId, content, editorId };
      const message = await this.messageService.updateMessage(dto);

      res.status(200).json({
        success: true,
        data: message.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * DELETE /api/messages/:messageId
   * 删除消息
   */
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { deletedBy } = req.body;

      if (!deletedBy) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'deletedBy is required',
          },
        });
        return;
      }

      await this.messageService.deleteMessage({ messageId, deletedBy });

      res.status(200).json({
        success: true,
        data: { messageId, deleted: true },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/messages/:messageId/reactions
   * 添加反应
   */
  async addReaction(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { userId, emoji } = req.body;

      if (!userId || !emoji) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'userId and emoji are required',
          },
        });
        return;
      }

      const message = await this.messageService.addReaction({ messageId, userId, emoji });

      res.status(200).json({
        success: true,
        data: message.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * DELETE /api/messages/:messageId/reactions
   * 移除反应
   */
  async removeReaction(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { userId, emoji } = req.body;

      if (!userId || !emoji) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'userId and emoji are required',
          },
        });
        return;
      }

      const message = await this.messageService.removeReaction({ messageId, userId, emoji });

      res.status(200).json({
        success: true,
        data: message.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/messages/:messageId/thread
   * 获取线程消息
   */
  async getThreadMessages(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      // messageId 是 thread root，获取该线程下的所有消息
      const messages = await this.messageService.getMessagesByThread(messageId, limit);

      res.status(200).json({
        success: true,
        data: {
          messages: messages.map(m => m.toJSON()),
          total: messages.length,
        },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/messages/:messageId/thread
   * 回复线程
   */
  async replyToThread(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { senderId, senderType, content, attachments, mentions } = req.body;

      if (!senderId || !content) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'senderId and content are required',
          },
        });
        return;
      }

      // 获取 thread root 消息以获取 channelId
      const threadRoot = await this.messageService.getMessageById(messageId);

      const message = await this.messageService.sendMessage({
        senderId,
        senderType: senderType || 'human',
        channelId: threadRoot.channelId,
        content,
        threadId: messageId, // 设置 threadId 为 thread root 的 messageId
        attachments,
        mentions,
      });

      res.status(201).json({
        success: true,
        data: message.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  /**
   * 统一错误处理
   */
  private handleError(error: any, res: Response): void {
    if (error.name === 'UnauthorizedMessageEditError' || error.name === 'UnauthorizedMessageDeletionError') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message },
      });
    } else if (error.name === 'SendMessageDeniedError') {
      res.status(403).json({
        success: false,
        error: { code: 'SEND_DENIED', message: error.message },
      });
    } else if (error.message?.includes('not found')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message },
      });
    } else if (error.message?.includes('already exists')) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: error.message },
      });
    } else {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message || 'Internal server error' },
      });
    }
  }
}
