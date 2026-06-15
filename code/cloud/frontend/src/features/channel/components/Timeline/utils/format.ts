/**
 * 格式化工具函数
 * 用于时间轴调试信息的数据格式化
 */

/**
 * 格式化 Token 数量（千位分隔符）
 */
export function formatTokens(tokens: number | undefined): string {
  if (tokens === undefined || tokens === null) return 'N/A';
  return tokens.toLocaleString('en-US');
}

/**
 * 格式化百分比（1位小数）
 */
export function formatPercentage(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return (value * 100).toFixed(1) + '%';
}

/**
 * 格式化成本（4位小数）
 */
export function formatCost(cost: number | undefined): string {
  if (cost === undefined || cost === null) return 'N/A';
  return '$' + cost.toFixed(4);
}

/**
 * 格式化延迟时间
 * @param ms 毫秒
 */
export function formatLatency(ms: number | undefined): string {
  if (ms === undefined || ms === null) return 'N/A';
  if (ms < 1000) {
    return Math.round(ms) + 'ms';
  }
  return (ms / 1000).toFixed(2) + 's';
}

/**
 * 格式化时间戳
 * @param iso ISO 时间字符串
 */
export function formatTimestamp(iso: string | undefined): string {
  if (!iso) return 'N/A';
  try {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * 截断长文本
 * @param text 原文本
 * @param maxLength 最大长度（默认150）
 */
export function truncateText(text: string, maxLength: number = 150): {
  truncated: string;
  isTruncated: boolean;
} {
  if (!text) return { truncated: '', isTruncated: false };
  if (text.length <= maxLength) {
    return { truncated: text, isTruncated: false };
  }
  return { truncated: text.substring(0, maxLength) + '...', isTruncated: true };
}

/**
 * 格式化时长（毫秒转为可读格式）
 */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms === null) return 'N/A';
  if (ms < 1000) {
    return Math.round(ms) + 'ms';
  }
  if (ms < 60000) {
    return (ms / 1000).toFixed(1) + 's';
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
