/**
 * Agent 执行元数据归一化
 *
 * 背景：运行时通过 message.list 下发的 agent_execution_metadata 为下划线命名
 *（input_tokens、tool_name、total_cost ...），而详情面板（UsageTab/ToolsTab/StatsTab）
 * 使用的类型为驼峰命名（inputTokens、toolName、totalCost ...）。
 * 直接传入会导致字段读取为 undefined，进而出现 `undefined.toLocaleString()` 崩溃。
 *
 * 本模块统一把任意大小写来源归一化为驼峰结构，供详情面板安全消费。
 */

import type { AgentMetadata, TokenUsage, ToolLog } from '../../types';

// 兼容驼峰/下划线读取数值字段
function num(...values: Array<number | undefined>): number {
  for (const v of values) {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  return 0;
}

// 取第一个有定义的值（用于可选字段）
function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function normalizeToolLog(raw: Record<string, unknown>): ToolLog {
  const meta = raw.meta as Record<string, unknown> | undefined;
  const result = raw.result as ToolLog['result'] | undefined;
  return {
    id: String(raw.id ?? ''),
    timestamp: String(raw.timestamp ?? ''),
    toolName: String(raw.toolName ?? raw.tool_name ?? ''),
    action: String(raw.action ?? ''),
    params: raw.params as Record<string, unknown> | undefined,
    status: (raw.status as ToolLog['status']) ?? 'success',
    duration: raw.duration as number | undefined,
    result,
    meta: meta
      ? {
          fileCount: num(meta.fileCount as number, meta.file_count as number) || undefined,
          linesChanged: num(meta.linesChanged as number, meta.lines_changed as number) || undefined,
          exitCode: firstDefined(meta.exitCode as number, meta.exit_code as number),
        }
      : undefined,
  };
}

function normalizeUsage(raw: Record<string, unknown> | undefined): TokenUsage | undefined {
  if (!raw) return undefined;
  const cache = raw.cache as Record<string, unknown> | undefined;
  const cost = raw.cost as Record<string, unknown> | undefined;
  const latency = raw.latency as Record<string, unknown> | undefined;

  return {
    inputTokens: num(raw.inputTokens as number, raw.input_tokens as number),
    outputTokens: num(raw.outputTokens as number, raw.output_tokens as number),
    totalTokens: num(raw.totalTokens as number, raw.total_tokens as number),
    cache: cache
      ? {
          creationTokens: num(cache.creationTokens as number, cache.creation_tokens as number),
          readTokens: num(cache.readTokens as number, cache.read_tokens as number),
          hitRate: firstDefined(cache.hitRate as number, cache.hit_rate as number),
        }
      : undefined,
    cost: cost
      ? {
          inputCost: num(cost.inputCost as number, cost.input_cost as number),
          outputCost: num(cost.outputCost as number, cost.output_cost as number),
          cacheCost: num(cost.cacheCost as number, cost.cache_cost as number),
          totalCost: num(cost.totalCost as number, cost.total_cost as number),
        }
      : undefined,
    model: raw.model as string | undefined,
    latency: latency
      ? {
          firstTokenMs: firstDefined(latency.firstTokenMs as number, latency.first_token_ms as number),
          totalMs: firstDefined(latency.totalMs as number, latency.total_ms as number),
          tokensPerSecond: firstDefined(
            latency.tokensPerSecond as number,
            latency.tokens_per_second as number
          ),
        }
      : undefined,
  };
}

/**
 * 将任意来源的 agent 执行元数据归一化为详情面板可安全消费的驼峰结构。
 */
export function normalizeAgentMetadata(metadata: AgentMetadata): AgentMetadata {
  const raw = metadata as unknown as Record<string, unknown>;
  const rawToolLogs = (raw.toolLogs ?? raw.tool_logs ?? []) as Array<Record<string, unknown>>;

  return {
    ...metadata,
    toolLogs: rawToolLogs.map(normalizeToolLog),
    usage: normalizeUsage(raw.usage as Record<string, unknown> | undefined),
  };
}
