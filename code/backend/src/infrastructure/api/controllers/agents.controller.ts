/**
 * AgentsController - Agent REST API 控制器
 *
 * 路由：
 * - POST   /agents              - 创建 Agent
 * - GET    /agents              - 获取所有 Agents
 * - GET    /agents/:agentId     - 获取单个 Agent
 * - PUT    /agents/:agentId/runtime  - 更新 Runtime 配置
 * - PUT    /agents/:agentId/persona  - 更新 Persona
 * - PUT    /agents/:agentId/skills   - 更新 Skills
 * - PUT    /agents/:agentId/tools    - 更新 Tools
 * - PUT    /agents/:agentId/triggers - 更新 Triggers
 * - POST   /agents/:agentId/start    - 启动 Agent
 * - POST   /agents/:agentId/stop     - 停止 Agent
 * - GET    /agents/:agentId/status   - 获取 Agent 状态
 * - DELETE /agents/:agentId          - 删除 Agent
 */

import { AgentService, CreateAgentDTO } from '../../../application/services/agent/agent.service';
import { AgentRuntimeService } from '../../../application/services/agent/agent-runtime.service';

interface Request {
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class AgentsController {
  constructor(
    private readonly agentService: AgentService,
    private readonly agentRuntimeService: AgentRuntimeService
  ) {}

  /**
   * POST /agents - 创建 Agent
   */
  async createAgent(req: Request, res: Response): Promise<void> {
    try {
      const { name, displayName, description, capabilities, tags, createdBy } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'name is required' },
        });
        return;
      }

      const dto: CreateAgentDTO = {
        name,
        displayName: displayName ?? name,
        description,
        capabilities,
        tags,
        createdBy: createdBy ?? 'system',
      };
      const agent = await this.agentService.createAgent(dto);

      res.status(201).json({ success: true, data: agent.toJSON() });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /agents - 获取所有 Agents
   */
  async getAllAgents(_req: Request, res: Response): Promise<void> {
    try {
      const agents = await this.agentService.getAllAgents();

      res.status(200).json({
        success: true,
        data: { agents: agents.map(a => a.toJSON()), total: agents.length },
      });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /agents/:agentId - 获取单个 Agent
   */
  async getAgent(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      const detail = await this.agentService.getAgentDetail(agentId);

      res.status(200).json({ success: true, data: detail });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * PUT /agents/:agentId/runtime - 更新 Runtime 配置
   */
  async updateRuntime(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      const result = await this.agentService.updateRuntimeConfig(agentId, req.body);
      const data = result && typeof result === 'object' && 'toJSON' in result ? (result as any).toJSON() : result;
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * PUT /agents/:agentId/persona - 更新 Persona
   */
  async updatePersona(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      const result = await this.agentService.updatePersona(agentId, req.body);
      const data = result && typeof result === 'object' && 'toJSON' in result ? (result as any).toJSON() : result;
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * PUT /agents/:agentId/skills - 更新 Skills
   */
  async updateSkills(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      const result = await this.agentService.updateSkills(agentId, req.body);
      const data = result && typeof result === 'object' && 'toJSON' in result ? (result as any).toJSON() : result;
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * PUT /agents/:agentId/tools - 更新 Tools
   */
  async updateTools(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      const result = await this.agentService.updateTools(agentId, req.body);
      const data = result && typeof result === 'object' && 'toJSON' in result ? (result as any).toJSON() : result;
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * PUT /agents/:agentId/triggers - 更新 Triggers
   */
  async updateTriggers(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      const result = await this.agentService.updateTriggers(agentId, req.body);
      const data = result && typeof result === 'object' && 'toJSON' in result ? (result as any).toJSON() : result;
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /agents/:agentId/start - 启动 Agent (202 Accepted)
   */
  async startAgent(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      await this.agentRuntimeService.startAgent(agentId);

      res.status(202).json({
        success: true,
        data: { message: 'Agent start initiated' },
      });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /agents/:agentId/stop - 停止 Agent (202 Accepted)
   */
  async stopAgent(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      await this.agentRuntimeService.stopAgent(agentId);

      res.status(202).json({
        success: true,
        data: { message: 'Agent stop initiated' },
      });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /agents/:agentId/status - 获取 Agent 运行状态
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      const result = await this.agentRuntimeService.getStatus(agentId);

      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  /**
   * DELETE /agents/:agentId - 删除 Agent
   */
  async deleteAgent(req: Request, res: Response): Promise<void> {
    try {
      const agentId = req.params.agentId!;
      await this.agentService.deleteAgent(agentId);

      res.status(200).json({ success: true, data: { agentId, deleted: true } });
    } catch (error: unknown) {
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): void {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const name = error instanceof Error ? error.name : '';

    if (name === 'AgentNotFoundError' || message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message },
      });
    } else if (name === 'AgentNotReadyError' || message.includes('Temperature must be')) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message },
      });
    } else if (message.includes('already')) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message },
      });
    } else {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message },
      });
    }
  }
}
