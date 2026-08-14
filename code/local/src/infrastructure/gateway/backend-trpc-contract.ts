/**
 * Backend tRPC Contract（契约3：跨进程契约安全）
 *
 * 本文件精确镜像 Local 实际消费的 Backend tRPC 过程的「入参/出参」类型。
 *
 * 背景：理想方案是像前端那样直接 `import type { AppRouter }` 复用后端路由类型，但
 * Local 的 tsconfig 设有严格 rootDir(./src)，跨包导入 Backend 源码会触发 TS6059 并把
 * 整个后端源码树拉入 Local 编译，破坏构建产物布局。在不引入 monorepo project references
 * 的前提下，这里以显式契约接口替代：
 *   - Local 网关的 `this.client` 以本接口为类型；
 *   - getHistory / saveResponse / pushChunk / reportFailure 等调用的入参出参在「编译期」受约束；
 *   - 任一处与后端契约漂移（字段名/类型/相位枚举不一致）都会在 Local 编译期报错。
 *
 * 维护约定：本接口必须与 `code/cloud/backend/src/infrastructure/trpc/routers/*.router.ts`
 * 中对应过程的 Zod schema 保持一致；修改后端契约时需同步本文件。
 */

import type {
  ExecutionMode,
  FeatureFlag,
  RealmConfiguration,
  AgentMetadataDto,
} from './backend-gateway.interface';
import type { AgentProgressPhase } from '../../domain/agent-runtime/execution-metadata';

/** 无入参 query 过程 */
interface QueryNoInput<TOutput> {
  query(): Promise<TOutput>;
}

/** 带入参 query 过程 */
interface Query<TInput, TOutput> {
  query(input: TInput): Promise<TOutput>;
}

/** 带入参 mutation 过程 */
interface Mutation<TInput, TOutput> {
  mutate(input: TInput): Promise<TOutput>;
}

/** message.getHistory 出参：已在服务端完成 sender_type → role 映射的 LLM 消息 */
export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** message.saveResponse 入参（对齐后端 saveResponse Zod schema 的 Local 使用子集） */
export interface SaveResponseInput {
  channelId: string;
  messageId: string;
  content: string;
  senderId: string;
  inReplyTo?: string;
  metadata?: Record<string, unknown>;
  execution?: Record<string, unknown>;
}

/** message.pushChunk 入参（契约2 类型化进度信封 { phase, data }） */
export interface PushChunkInput {
  channelId: string;
  messageId: string;
  agentId: string;
  phase: AgentProgressPhase;
  data: Record<string, unknown>;
}

/** message.reportFailure 入参 */
export interface ReportFailureInput {
  channelId: string;
  messageId: string;
  agentId?: string;
  error?: string;
}

/** message.reportAbort 入参 */
export interface ReportAbortInput {
  channelId: string;
  messageId: string;
  userMessageId: string;
  agentId?: string;
  partialContent?: string;
  reason?: string;
}

/** channel.getById 出参的 Local 使用子集 */
export interface ChannelInfo {
  id?: string;
  agentId?: string;
  agent_pool?: unknown;
  [key: string]: unknown;
}

/** agentSync.sync 入参 / 出参 */
export interface AgentSyncInput {
  deviceId?: string;
  realmId?: string;
  agents: AgentMetadataDto[];
}
export interface AgentSyncResult {
  synced: number;
  received: number;
}

/**
 * Local 消费的后端 tRPC 过程集合（仅覆盖 Local 实际调用的过程）。
 */
export interface BackendTrpcContract {
  executionMode: {
    getMode: Query<{ channelId: string }, ExecutionMode>;
  };
  featureFlag: {
    isEnabled: Query<{ name: string }, boolean>;
    list: QueryNoInput<FeatureFlag[]>;
  };
  configuration: {
    fetch: Query<{ realmId: string }, RealmConfiguration>;
    getVersion: Query<{ realmId: string }, number>;
  };
  deviceSubscription: {
    heartbeat: Mutation<{ deviceId: string; status?: unknown }, unknown>;
  };
  health: {
    check: QueryNoInput<unknown>;
  };
  message: {
    getHistory: Query<{ channelId: string; limit?: number }, HistoryMessage[]>;
    saveResponse: Mutation<SaveResponseInput, unknown>;
    pushChunk: Mutation<PushChunkInput, unknown>;
    reportFailure: Mutation<ReportFailureInput, unknown>;
    reportAbort: Mutation<ReportAbortInput, unknown>;
  };
  channel: {
    getById: Query<{ channelId: string }, ChannelInfo>;
  };
  agentSync: {
    sync: Mutation<AgentSyncInput, AgentSyncResult>;
  };
}
