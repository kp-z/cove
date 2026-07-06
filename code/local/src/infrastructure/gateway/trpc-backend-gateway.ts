/**
 * tRPC Backend Gateway Implementation
 *
 * Implements BackendGateway using tRPC client to communicate with Cloud Backend.
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { BackendGateway, ExecutionMode, FeatureFlag, RealmConfiguration, AgentMetadataDto } from './backend-gateway.interface';
import type { ExecutionMetadata, AgentProgressPhase } from '../../domain/agent-runtime/execution-metadata';
import type { BackendTrpcContract } from './backend-trpc-contract';
import { bareChannelId } from '../../common/channel-ref';
import type { ILogger } from '../logger';

export class TrpcBackendGateway implements BackendGateway {
  // 契约3：跨进程契约安全。
  // 理想做法是直接 import Backend 的 AppRouter 类型（如前端那样），但 Local 的 tsconfig
  // 设有严格 rootDir(./src)，跨包 import 会触发 TS6059 并把整个 Backend 源码树拉入 Local
  // 编译，破坏既有构建产物布局。因此改为显式的 BackendTrpcContract：精确镜像 Local 实际
  // 消费的后端过程入参/出参，使 getHistory/saveResponse/pushChunk 等调用在「编译期」即受约束，
  // 任一处契约漂移都会在 Local 编译期报错，而非运行期才暴露（达成契约3 的目标）。
  private client: BackendTrpcContract;
  private readonly logger: ILogger;

  constructor(
    private backendUrl: string,
    private realmId?: string,
    private deviceId?: string,
    logger?: ILogger
  ) {
    this.logger = logger ?? {
      debug: () => {},
      info:  () => {},
      warn:  () => {},
      error: () => {},
      setLevel: () => {},
      scope: () => this.logger,
    };

    // tRPC proxy client 运行时是 Proxy，支持任意路径；以 BackendTrpcContract 约束编译期类型。
    this.client = createTRPCProxyClient<any>({
      links: [
        httpBatchLink({
          url: `${backendUrl}/trpc`,
          headers: () => {
            const headers: Record<string, string> = {};
            if (this.realmId) {
              headers['x-realm-id'] = this.realmId;
            }
            if (this.deviceId) {
              headers['x-user-id'] = this.deviceId;
            }
            return headers;
          },
        }),
      ],
    }) as unknown as BackendTrpcContract;
  }

  async getExecutionMode(channelId: string): Promise<ExecutionMode> {
    try {
      const result = await this.client.executionMode.getMode.query({ channelId });
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to get execution mode', error as Error);
      return { mode: 'local', reason: 'Backend unavailable' };
    }
  }

  async isFeatureFlagEnabled(flagName: string): Promise<boolean> {
    try {
      const result = await this.client.featureFlag.isEnabled.query({ name: flagName });
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to check feature flag', error as Error, { flag: flagName });
      return false;
    }
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const result = await this.client.featureFlag.list.query();
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to get feature flags', error as Error);
      return [];
    }
  }

  async fetchRealmConfiguration(realmId: string): Promise<RealmConfiguration> {
    try {
      const result = await this.client.configuration.fetch.query({ realmId });
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to fetch realm configuration', error as Error, { realmId });
      throw error;
    }
  }

  async getConfigVersion(realmId: string): Promise<number> {
    try {
      const result = await this.client.configuration.getVersion.query({ realmId });
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to get config version', error as Error, { realmId });
      throw error;
    }
  }

  async reportHealth(health: {
    deviceId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // 使用 deviceSubscription.heartbeat 替代 device.reportHealth
      await this.client.deviceSubscription.heartbeat.mutate({
        deviceId: health.deviceId,
        status: health.metrics,
      });
    } catch (error) {
      this.logger.warn('⚠️  Failed to report health', { error: (error as Error).message });
      // Don't throw - health reporting is best-effort
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.health.check.query();
      return true;
    } catch (error) {
      this.logger.warn('⚠️  Backend health check failed', { error: (error as Error).message });
      return false;
    }
  }

  async getMessageHistory(channelId: string): Promise<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>> {
    try {
      // 契约3：后端 message.getHistory 已在服务端完成 sender_type → role 映射，
      // 直接返回 { role, content }。配合 BackendTrpcContract 的类型约束，此处无需再做
      // 形状猜测/二次映射；若后端出参契约漂移，将在编译期暴露。
      const result = await this.client.message.getHistory.query({ channelId });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      this.logger.error('❌ Failed to get message history', error as Error, { channelId });
      return [];
    }
  }

  async saveAgentResponse(response: {
    channelId: string;
    messageId: string;
    content: string;
    agentId?: string;
    execution?: ExecutionMetadata;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // 契约3：统一通过 channel-ref helper 去除 realm 前缀，消除散落的 split(':')
      const channelId = bareChannelId(response.channelId);

      // 契约 L5：senderId 优先使用调用方透传的 agentId（来自 task.metadata.agentId），
      // 仅在缺失时才回退到 channel.getById 反查，最后兜底 'system'。
      let senderId = response.agentId;
      if (!senderId) {
        try {
          const channelInfo = await this.client.channel.getById.query({ channelId });
          senderId = channelInfo.agentId || channelInfo.id || 'system';
        } catch (err) {
          this.logger.warn('⚠️  Could not get channel info, using fallback senderId');
          senderId = 'system';
        }
      }

      // 契约 L4：将 Local 的 ExecutionMetadata 映射为后端期望的「顶层 execution」结构。
      const execution = this.mapExecutionMetadata(response.execution);

      await this.client.message.saveResponse.mutate({
        channelId,
        messageId: response.messageId,
        content: response.content,
        metadata: response.metadata,
        execution,
        senderId,
      });
    } catch (error) {
      this.logger.error('❌ Failed to save agent response', error as Error, { messageId: response.messageId });
      throw error;
    }
  }

  /**
   * 将 Local 的 ExecutionMetadata 映射为后端 message.saveResponse 的 execution 入参结构。
   *
   * 后端 schema 关注 thinking / toolUse / usage / adapter 四类结构化信息，
   * 此处仅映射这些字段，其余（streaming/performance）后端未消费，省略以保持精简。
   *
   * @param metadata Local 收集到的执行元数据
   * @returns 后端 execution 结构；无元数据时返回 undefined
   */
  private mapExecutionMetadata(metadata?: ExecutionMetadata): Record<string, unknown> | undefined {
    if (!metadata) {
      return undefined;
    }

    // 步骤1：思考过程
    const thinking = metadata.thinking
      ? {
          content: metadata.thinking.content,
          chunks: metadata.thinking.chunks,
          firstTokenMs: metadata.thinking.firstTokenMs,
        }
      : undefined;

    // 步骤2：工具调用（Local 无独立 startedAt，回退到执行起始时间戳）
    // 注：tool.result 兼容两种形状——纯字符串（适配器直接透传的原始输出）
    // 与结构化对象（历史 success/error/output 形状），需归一化后再映射到后端字段。
    const toolUse =
      metadata.toolUses && metadata.toolUses.length > 0
        ? {
            logs: metadata.toolUses.map((tool) => {
              const resultText = typeof tool.result === 'string' ? tool.result : undefined;
              const resultObj = typeof tool.result === 'object' ? tool.result : undefined;
              const output = resultObj?.output ?? (tool.status !== 'error' ? resultText : undefined);
              const error = resultObj?.error ?? (tool.status === 'error' ? resultText : undefined);

              return {
                id: tool.id,
                toolName: tool.toolName,
                action: tool.action,
                status: tool.status,
                startedAt: metadata.timestamp,
                durationMs: tool.duration,
                input: tool.params,
                output: output ? { output } : undefined,
                error,
              };
            }),
            totalTools: metadata.toolUses.length,
            successCount: metadata.toolUses.filter((t) => t.status === 'success').length,
            errorCount: metadata.toolUses.filter((t) => t.status === 'error').length,
          }
        : undefined;

    // 步骤3：Token 用量
    const usage = metadata.usage
      ? {
          inputTokens: metadata.usage.inputTokens,
          outputTokens: metadata.usage.outputTokens,
          totalTokens: metadata.usage.totalTokens,
          cacheReadTokens: metadata.usage.cache?.readTokens,
          cacheCreationTokens: metadata.usage.cache?.creationTokens,
        }
      : undefined;

    // 步骤4：适配器信息
    const adapter = metadata.adapter
      ? {
          name: metadata.adapter,
          model: metadata.usage?.model,
        }
      : undefined;

    return { thinking, toolUse, usage, adapter };
  }

  async pushResponseChunk(progress: {
    channelId: string;
    messageId: string;
    agentId: string;
    phase: AgentProgressPhase;
    data: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.client.message.pushChunk.mutate(progress);
    } catch (error) {
      this.logger.warn('⚠️  Failed to push response chunk', { error: (error as Error).message });
      // Don't throw - chunk pushing is best-effort
    }
  }

  async reportAgentFailure(failure: {
    channelId: string;
    messageId: string;
    agentId?: string;
    error?: string;
  }): Promise<void> {
    try {
      await this.client.message.reportFailure.mutate(failure);
    } catch (error) {
      this.logger.warn('⚠️  Failed to report agent failure', { error: (error as Error).message });
      // Don't throw - failure reporting is best-effort（避免二次失败掩盖原始错误）
    }
  }

  async syncAgentMetadata(payload: {
    deviceId?: string;
    realmId?: string;
    agents: AgentMetadataDto[];
  }): Promise<{ synced: number; received: number }> {
    try {
      return await this.client.agentSync.sync.mutate(payload);
    } catch (error) {
      this.logger.error('❌ Failed to sync agent metadata', error as Error);
      // 同步失败不应阻断设备启动，返回 0 同步数兜底
      return { synced: 0, received: payload.agents.length };
    }
  }
}
