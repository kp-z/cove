/**
 * 单条消息 token 成本计算工具
 *
 * 设计说明：
 * - 后端 API 统一使用 snake_case 字段命名（input_tokens、output_tokens 等）
 * - 若上游已提供真实成本（usage.cost.total_cost），优先使用真实值。
 * - 否则按下方价格表（每百万 token 的美元单价）估算，价格可按需调整。
 */

// 每百万 token 的美元单价（近似值，按模型名子串匹配；可根据实际计费调整）
const MODEL_PRICING_PER_MILLION: Array<{ match: string; input: number; output: number }> = [
  { match: 'claude-3-5-haiku', input: 0.8, output: 4 },
  { match: 'claude-3-5-sonnet', input: 3, output: 15 },
  { match: 'claude-3-7-sonnet', input: 3, output: 15 },
  { match: 'claude-3-opus', input: 15, output: 75 },
  { match: 'claude-3-haiku', input: 0.25, output: 1.25 },
  { match: 'claude', input: 3, output: 15 },
  { match: 'gpt-4o-mini', input: 0.15, output: 0.6 },
  { match: 'gpt-4o', input: 2.5, output: 10 },
  { match: 'gpt-4', input: 10, output: 30 },
  { match: 'gpt-3.5', input: 0.5, output: 1.5 },
];

// 缺省单价：无法识别模型时按 Sonnet 量级估算
const DEFAULT_PRICING_PER_MILLION = { input: 3, output: 15 };

/** usage 的类型定义（使用 snake_case） */
type UsageData = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  model?: string;
  cost?: {
    total_cost?: number;
  };
};

function pricingForModel(model?: string): { input: number; output: number } {
  if (!model) return DEFAULT_PRICING_PER_MILLION;
  const normalized = model.toLowerCase();
  const hit = MODEL_PRICING_PER_MILLION.find((p) => normalized.includes(p.match));
  return hit ?? DEFAULT_PRICING_PER_MILLION;
}

/**
 * 计算单条消息的美元成本。
 * @returns 美元成本；当没有任何 token 数据时返回 null（调用方据此决定是否渲染）。
 */
export function computeMessageCostUsd(usage: UsageData | undefined | null): number | null {
  if (!usage) return null;

  // 步骤1：优先使用上游提供的真实总成本
  const realCost = usage.cost?.total_cost;
  if (realCost && realCost > 0) return realCost;

  // 步骤2：根据 token 数与价格表估算
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  if (inputTokens === 0 && outputTokens === 0) return null;

  const { input, output } = pricingForModel(usage.model);
  const estimated = (inputTokens / 1_000_000) * input + (outputTokens / 1_000_000) * output;
  return estimated;
}

/**
 * 将美元成本格式化为展示字符串。
 * - 0 显示为 $0.00
 * - 小额（<0.01）保留 4 位小数，避免显示为 $0.00
 * - 其余保留 2 位小数
 */
export function formatCostUsd(cost: number): string {
  if (cost <= 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}
