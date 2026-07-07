/**
 * Agent 执行元数据归一化
 *
 * 背景：运行时通过 message.list 下发的 agent_execution_metadata 为 snake_case 命名
 *（input_tokens、tool_name、total_cost ...），详情面板（UsageTab/ToolsTab/StatsTab）
 * 使用的类型也为 snake_case 命名（input_tokens、tool_name、total_cost ...）。
 *
 * 本模块统一把任意来源归一化为 snake_case 结构，供详情面板安全消费。
 */

import type { AgentMetadata, TokenUsage, ToolLog } from '../../types';

function normalizeToolLog(raw: Record<string, unknown>): ToolLog {
  const meta = raw.meta as Record<string, unknown> | undefined;
  const result = raw.result as ToolLog['result'] | undefined;
  return {
    id: String(raw.id ?? ''),
    timestamp: String(raw.timestamp ?? ''),
    tool_name: String(raw.tool_name ?? ''),
    action: String(raw.action ?? ''),
    params: raw.params as Record<string, unknown> | undefined,
    status: (raw.status as ToolLog['status']) ?? 'success',
    duration: raw.duration as number | undefined,
    result,
    meta: meta
      ? {
          file_count: meta.file_count as number | undefined,
          lines_changed: meta.lines_changed as number | undefined,
          exit_code: meta.exit_code as number | undefined,
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
    input_tokens: (raw.input_tokens as number) || 0,
    output_tokens: (raw.output_tokens as number) || 0,
    total_tokens: (raw.total_tokens as number) || 0,
    cache: cache
      ? {
          creation_tokens: (cache.creation_tokens as number) || 0,
          read_tokens: (cache.read_tokens as number) || 0,
          hit_rate: cache.hit_rate as number | undefined,
        }
      : undefined,
    cost: cost
      ? {
          input_cost: (cost.input_cost as number) || 0,
          output_cost: (cost.output_cost as number) || 0,
          cache_cost: (cost.cache_cost as number) || 0,
          total_cost: (cost.total_cost as number) || 0,
        }
      : undefined,
    model: raw.model as string | undefined,
    latency: latency
      ? {
          first_token_ms: latency.first_token_ms as number | undefined,
          total_ms: latency.total_ms as number | undefined,
          tokens_per_second: latency.tokens_per_second as number | undefined,
        }
      : undefined,
  };
}

/**
 * 将任意来源的 agent 执行元数据归一化为详情面板可安全消费的 snake_case 结构。
 */
export function normalizeAgentMetadata(metadata: AgentMetadata): AgentMetadata {
  const raw = metadata as unknown as Record<string, unknown>;
  const rawToolLogs = (raw.tool_logs ?? []) as Array<Record<string, unknown>>;

  return {
    ...metadata,
    tool_logs: rawToolLogs.map(normalizeToolLog),
    usage: normalizeUsage(raw.usage as Record<string, unknown> | undefined),
  };
}
