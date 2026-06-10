/**
 * 单条消息 token 成本计算工具
 *
 * 设计说明：
 * - Agent 执行元数据中的 usage 可能来自不同序列化路径，token 字段既可能是
 *   驼峰（inputTokens）也可能是下划线（input_tokens），这里统一做兼容读取。
 * - 若上游已提供真实成本（usage.cost.totalCost / total_cost），优先使用真实值。
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

/** usage 的最小兼容形态（字段可能为驼峰或下划线） */
type LooseUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  model?: string;
  cost?: {
    totalCost?: number;
    total_cost?: number;
  };
};

// 兼容驼峰/下划线读取数值字段
function num(...values: Array<number | undefined>): number {
  for (const v of values) {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  return 0;
}

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
export function computeMessageCostUsd(usage: LooseUsage | undefined | null): number | null {
  if (!usage) return null;

  // 步骤1：优先使用上游提供的真实总成本
  const realCost = num(usage.cost?.totalCost, usage.cost?.total_cost);
  if (realCost > 0) return realCost;

  // 步骤2：根据 token 数与价格表估算
  const inputTokens = num(usage.inputTokens, usage.input_tokens);
  const outputTokens = num(usage.outputTokens, usage.output_tokens);
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
