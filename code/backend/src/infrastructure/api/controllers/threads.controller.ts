/**
 * ThreadsController - Thread REST API 控制器
 *
 * 职责：
 * - 处理 HTTP 请求和响应
 * - 参数验证和转换
 * - 调用 ThreadService 业务逻辑
 * - 统一错误处理
 *
 * 路由：
 * - POST   /api/threads/:threadId/replies      - 回复线程
 * - GET    /api/threads/:threadId/messages      - 获取线程消息
 * - GET    /api/threads/:threadId               - 获取线程元数据
 * - GET    /api/channels/:channelId/threads     - 获取频道线程列表
 */

import { ThreadService, NestedThreadError, RootMessageNotFoundError, ThreadNotFoundError } from '../../../application/services/thread/thread.service';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface Request {
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class ThreadsController {
  constructor(private readonly threadService: ThreadService) {}

  async replyInThread(req: Request, res: Response): Promise<void> {
    try {
      const threadId = req.params.threadId!;
      const { senderId, senderType, content } = req.body;

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

      const message = await this.threadService.replyInThread(
        threadId,
        senderId,
        senderType || 'human',
        content,
      );

      res.status(201).json({
        success: true,
        data: message.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async getThreadMessages(req: Request, res: Response): Promise<void> {
    try {
      const threadId = req.params.threadId!;
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const messages = await this.threadService.listThreadMessages(threadId, cursor, limit);

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

  async getThreadMetadata(req: Request, res: Response): Promise<void> {
    try {
      const threadId = req.params.threadId!;

      const thread = await this.threadService.getOrCreateThread(threadId);

      res.status(200).json({
        success: true,
        data: thread.toJSON(),
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async listChannelThreads(req: Request, res: Response): Promise<void> {
    try {
      const channelId = req.params.channelId!;

      const threads = await this.threadService.listChannelThreads(channelId);

      res.status(200).json({
        success: true,
        data: {
          threads: threads.map(t => t.toJSON()),
          total: threads.length,
        },
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    if (error.name === 'NestedThreadError') {
      res.status(400).json({
        success: false,
        error: { code: 'NESTED_THREAD', message: error.message },
      });
    } else if (error.name === 'ThreadNotFoundError' || error.name === 'RootMessageNotFoundError') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message },
      });
    } else {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message || 'Internal server error' },
      });
    }
  }
}
