/**
 * IAgentRuntime - Agent Runtime 接口
 *
 * Application Layer 通过此接口与 Agent Runtime 交互。
 * 遵循依赖倒置原则，不直接依赖 Infrastructure 层的具体实现。
 */

export type AgentStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'error';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface RuntimeConfig {
  readonly maxConcurrentExecutions?: number;
  readonly executionTimeout?: number;
  readonly retryAttempts?: number;
  readonly retryDelay?: number;
  readonly enableLogging?: boolean;
  readonly enableMetrics?: boolean;
}

export interface ExecutionContext {
  readonly executionId: string;
  readonly agentId: string;
  readonly taskId?: string;
  readonly input: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
  readonly startedAt: Date;
}

export interface ExecutionResult {
  readonly executionId: string;
  readonly status: ExecutionStatus;
  readonly output?: Record<string, unknown>;
  readonly error?: string;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly duration?: number;
}

export interface AgentMetrics {
  readonly agentId: string;
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly averageDuration: number;
  readonly lastExecutionAt?: Date;
}

export interface IAgentRuntime {
  /**
   * 启动 Agent
   * @param agentId - Agent ID
   * @param config - 运行时配置
   */
  startAgent(agentId: string, config?: RuntimeConfig): Promise<void>;

  /**
   * 停止 Agent
   * @param agentId - Agent ID
   */
  stopAgent(agentId: string): Promise<void>;

  /**
   * 暂停 Agent
   * @param agentId - Agent ID
   */
  pauseAgent(agentId: string): Promise<void>;

  /**
   * 恢复 Agent
   * @param agentId - Agent ID
   */
  resumeAgent(agentId: string): Promise<void>;

  /**
   * 获取 Agent 状态
   * @param agentId - Agent ID
   * @returns Agent 状态
   */
  getAgentStatus(agentId: string): Promise<AgentStatus>;

  /**
   * 执行任务
   * @param context - 执行上下文
   * @returns 执行结果
   */
  executeTask(context: ExecutionContext): Promise<ExecutionResult>;

  /**
   * 取消执行
   * @param executionId - 执行 ID
   */
  cancelExecution(executionId: string): Promise<void>;

  /**
   * 获取执行状态
   * @param executionId - 执行 ID
   * @returns 执行结果
   */
  getExecutionStatus(executionId: string): Promise<ExecutionResult>;

  /**
   * 获取 Agent 指标
   * @param agentId - Agent ID
   * @returns Agent 指标
   */
  getAgentMetrics(agentId: string): Promise<AgentMetrics>;

  /**
   * 健康检查
   * @returns 是否健康
   */
  healthCheck(): Promise<boolean>;
}
