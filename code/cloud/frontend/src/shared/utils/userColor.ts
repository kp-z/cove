/**
 * 用户颜色生成工具
 * 基于 senderId 生成一致的颜色，用于区分不同用户
 * 参考 Discord 的用户名颜色系统
 */

export const USER_COLORS = [
  'rgb(88, 101, 242)',   // Blurple (Discord 标志性颜色)
  'rgb(94, 129, 244)',   // Blue
  'rgb(139, 92, 246)',   // Purple
  'rgb(236, 72, 153)',   // Pink
  'rgb(245, 158, 11)',   // Amber
  'rgb(16, 185, 129)',   // Green
  'rgb(6, 182, 212)',    // Cyan
  'rgb(239, 68, 68)',    // Red
  'rgb(249, 115, 22)',   // Orange
  'rgb(168, 85, 247)',   // Violet
] as const;

/**
 * 根据 senderId 生成一致的颜色
 * @param senderId - 用户或 Agent 的 ID
 * @returns RGB 颜色字符串
 */
export function getUserColor(senderId: string): string {
  if (!senderId) {
    return USER_COLORS[0];
  }

  // 使用简单的哈希函数生成索引
  const hash = senderId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
}

/**
 * 获取颜色的半透明版本（用于 hover 背景等）
 * @param color - RGB 颜色字符串
 * @param opacity - 透明度 (0-1)
 * @returns RGBA 颜色字符串
 */
export function getColorWithOpacity(color: string, opacity: number): string {
  // 从 rgb(r, g, b) 提取数值
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return color;

  const [, r, g, b] = match;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
