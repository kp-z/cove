/**
 * Channel 引用归一化工具（契约3）
 *
 * 背景：系统中 channelId 存在两种形态：
 * - 裸 channelId（如 `ch-abc`）：领域层、前端订阅、agent 事件 payload 使用。
 * - 带 realm 前缀的限定形态（如 `realm-1:ch-abc`）：消息编排器入队、跨 realm 路由使用。
 *
 * 历史上多处用 ad-hoc 的 `split(':')` 解析，导致：
 * - 订阅过滤时两侧形态不一致 → 流式事件被错误过滤丢弃；
 * - 解析逻辑散落、难以维护。
 *
 * 本模块收敛为单一来源：所有边界（事件 payload、订阅过滤、router 入参解析）
 * 统一调用这里的函数，消除散落的字符串切割。
 */

/**
 * 提取裸 channelId（去掉 `realmId:` 前缀，如果存在）。
 *
 * @param channelId 裸或带 realm 前缀的 channelId
 * @returns 裸 channelId
 *
 * @example
 * bareChannelId('realm-1:ch-abc') // => 'ch-abc'
 * bareChannelId('ch-abc')         // => 'ch-abc'
 */
export function bareChannelId(channelId: string): string {
  if (!channelId) return channelId;
  const idx = channelId.indexOf(':');
  return idx >= 0 ? channelId.slice(idx + 1) : channelId;
}

/**
 * 生成带 realm 前缀的限定 channelId。
 *
 * @param realmId realm 标识
 * @param channelId 裸 channelId（若已带前缀会先归一化为裸再拼接）
 * @returns `realmId:channelId`
 */
export function qualifiedChannelId(realmId: string, channelId: string): string {
  return `${realmId}:${bareChannelId(channelId)}`;
}

/**
 * 从带 realm 前缀的 channelId 中提取 realmId 前缀。
 *
 * @param channelId 形如 `realmId:channelId` 的限定 channelId（裸 id 则返回 fallback）
 * @param fallback 无前缀时的回退值（默认 'default'）
 * @returns realmId 前缀
 *
 * @example
 * realmIdFromChannel('realm-1:ch-abc') // => 'realm-1'
 * realmIdFromChannel('ch-abc')         // => 'default'
 */
export function realmIdFromChannel(channelId: string, fallback = 'default'): string {
  if (!channelId) return fallback;
  const idx = channelId.indexOf(':');
  return idx > 0 ? channelId.slice(0, idx) : fallback;
}

/**
 * 判断两个 channelId 是否指向同一频道（按裸 id 比较，忽略 realm 前缀差异）。
 *
 * 用于订阅过滤：事件 payload（值类型常被推断为 unknown）与订阅入参可能
 * 一个带前缀、一个不带，统一归一化后再比较，避免漏发。
 * 入参放宽为 unknown，仅在两者均为非空字符串时比较，其余一律返回 false。
 */
export function isSameChannel(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  return bareChannelId(a) === bareChannelId(b);
}
