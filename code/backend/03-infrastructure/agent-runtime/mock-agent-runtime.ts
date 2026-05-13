/**
 * MockAgentRuntime - Agent Runtime 的 Mock 实现
 *
 * MVP 阶段使用 Mock 实现，返回模拟的响应。
 * 后续可替换为真实的 Claude Code/OpenClaw Runtime 实现。
 *
 * 特性：
 * - 模拟 Agent 生命周期管理（启动/停止/暂停/恢复）
 * - 模拟任务执行（返回固定的 Mock 响应）
 * - 记录执行历史和指标
 * - 支持健康检查
 */

import {
  IAgentRuntime,
  AgentStatus,
  ExecutionStatus,
  RuntimeConfig,
  ExecutionContext,
  ExecutionResult,
  AgentMetrics,
} from '../../02-application/interfaces/agent-runtime.interface';
import { IRuntimeAdapter } from '../../02-application/interfaces/runtime-adapter.interface';
import { AgentRuntimeConfig } from '../../01-domain/models/agent/agent.entity';

interface AgentState {
  status: AgentStatus;
  config?: RuntimeConfig | AgentRuntimeConfig;
  startedAt?: Date;
}

interface ExecutionRecord extends ExecutionResult {
  context: ExecutionContext;
}

export class MockAgentRuntime implements IAgentRuntime, IRuntimeAdapter {
  private agents: Map<string, AgentState> = new Map();
  private executions: Map<string, ExecutionRecord> = new Map();
  private metrics: Map<string, AgentMetrics> = new Map();
  private runtimeStatuses: Map<string, 'running' | 'stopped' | 'error'> = new Map();

  /**
   * 启动 Agent (IAgentRuntime + IRuntimeAdapter)
   */
  async startAgent(agentId: string, config?: RuntimeConfig | AgentRuntimeConfig): Promise<void> {
    console.log(`[MockAgentRuntime] Starting agent ${agentId}`);

    this.agents.set(agentId, {
      status: 'idle',
      config,
      startedAt: new Date(),
    });

    // Track runtime status for IRuntimeAdapter
    this.runtimeStatuses.set(agentId, 'running');

    // 初始化指标
    if (!this.metrics.has(agentId)) {
      this.metrics.set(agentId, {
        agentId,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageDuration: 0,
      });
    }
  }

  /**
   * 停止 Agent
   */
  async stopAgent(agentId: string): Promise<void> {
    console.log(`[MockAgentRuntime] Stopping agent ${agentId}`);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    this.agents.set(agentId, {
      ...agent,
      status: 'stopped',
    });

    // Track runtime status for IRuntimeAdapter
    this.runtimeStatuses.set(agentId, 'stopped');
  }

  /**
   * 暂停 Agent
   */
  async pauseAgent(agentId: string): Promise<void> {
    console.log(`[MockAgentRuntime] Pausing agent ${agentId}`);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    this.agents.set(agentId, {
      ...agent,
      status: 'paused',
    });
  }

  /**
   * 恢复 Agent
   */
  async resumeAgent(agentId: string): Promise<void> {
    console.log(`[MockAgentRuntime] Resuming agent ${agentId}`);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    this.agents.set(agentId, {
      ...agent,
      status: 'idle',
    });
  }

  /**
   * 获取 Agent 状态
   */
  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent.status;
  }

  /**
   * 获取 Agent 运行状态 (IRuntimeAdapter)
   */
  async getRuntimeStatus(agentId: string): Promise<'running' | 'stopped' | 'error'> {
    return this.runtimeStatuses.get(agentId) ?? 'stopped';
  }

  /**
   * 执行任务
   */
  async executeTask(context: ExecutionContext): Promise<ExecutionResult> {
    console.log(`[MockAgentRuntime] Executing task for agent ${context.agentId}`);

    const agent = this.agents.get(context.agentId);
    if (!agent) {
      throw new Error(`Agent ${context.agentId} not found`);
    }

    if (agent.status !== 'idle' && agent.status !== 'running') {
      throw new Error(`Agent ${context.agentId} is not ready (status: ${agent.status})`);
    }

    // 更新 Agent 状态为 running
    this.agents.set(context.agentId, {
      ...agent,
      status: 'running',
    });

    // 模拟执行延迟（100-500ms）
    const delay = Math.floor(Math.random() * 400) + 100;
    await new Promise(resolve => setTimeout(resolve, delay));

    // 生成 Mock 响应
    const mockResponse = this.generateMockResponse(context);

    const result: ExecutionResult = {
      executionId: context.executionId,
      status: 'completed',
      output: mockResponse,
      startedAt: context.startedAt,
      completedAt: new Date(),
      duration: delay,
    };

    // 记录执行历史
    this.executions.set(context.executionId, {
      ...result,
      context,
    });

    // 更新指标
    this.updateMetrics(context.agentId, result);

    // 恢复 Agent 状态为 idle
    this.agents.set(context.agentId, {
      ...agent,
      status: 'idle',
    });

    return result;
  }

  /**
   * 取消执行
   */
  async cancelExecution(executionId: string): Promise<void> {
    console.log(`[MockAgentRuntime] Cancelling execution ${executionId}`);

    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    // 更新执行状态
    this.executions.set(executionId, {
      ...execution,
      status: 'cancelled',
      completedAt: new Date(),
    });
  }

  /**
   * 获取执行状态
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionResult> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    return {
      executionId: execution.executionId,
      status: execution.status,
      output: execution.output,
      error: execution.error,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      duration: execution.duration,
    };
  }

  /**
   * 获取 Agent 指标
   */
  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    const metrics = this.metrics.get(agentId);
    if (!metrics) {
      throw new Error(`Metrics for agent ${agentId} not found`);
    }
    return metrics;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * 生成 Mock 响应
   */
  private generateMockResponse(context: ExecutionContext): Record<string, unknown> {
    const { agentId, taskId, input } = context;

    // 根据输入生成不同的 Mock 响应
    const messageContent = input.messageContent as string || '';

    if (messageContent.toLowerCase().includes('hello')) {
      return {
        type: 'text',
        content: `Hello! I'm Agent ${agentId}. How can I help you today?`,
        confidence: 0.95,
      };
    }

    if (messageContent.toLowerCase().includes('status')) {
      return {
        type: 'text',
        content: `Agent ${agentId} is running normally. All systems operational.`,
        confidence: 0.98,
      };
    }

    if (messageContent.toLowerCase().includes('task')) {
      return {
        type: 'text',
        content: `I've received your task request. Task ID: ${taskId || 'N/A'}. I'll start working on it right away.`,
        confidence: 0.92,
      };
    }

    // 默认响应
    return {
      type: 'text',
      content: `Mock response from Agent ${agentId}. I received your message: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`,
      confidence: 0.85,
      metadata: {
        agentId,
        taskId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 更新指标
   */
  private updateMetrics(agentId: string, result: ExecutionResult): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return;

    const totalExecutions = metrics.totalExecutions + 1;
    const successfulExecutions = result.status === 'completed'
      ? metrics.successfulExecutions + 1
      : metrics.successfulExecutions;
    const failedExecutions = result.status === 'failed'
      ? metrics.failedExecutions + 1
      : metrics.failedExecutions;

    // 计算平均执行时间
    const totalDuration = metrics.averageDuration * metrics.totalExecutions + (result.duration || 0);
    const averageDuration = totalDuration / totalExecutions;

    this.metrics.set(agentId, {
      agentId,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageDuration,
      lastExecutionAt: result.completedAt,
    });
  }

  /**
   * 清空所有数据（仅用于测试）
   */
  clear(): void {
    this.agents.clear();
    this.executions.clear();
    this.metrics.clear();
    this.runtimeStatuses.clear();
  }

  /**
   * 获取所有 Agent 状态（仅用于测试/调试）
   */
  getAllAgents(): Map<string, AgentState> {
    return new Map(this.agents);
  }

  /**
   * 获取所有执行记录（仅用于测试/调试）
   */
  getAllExecutions(): Map<string, ExecutionRecord> {
    return new Map(this.executions);
  }
}
