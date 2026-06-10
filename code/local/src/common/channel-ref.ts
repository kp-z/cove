/**
 * Channel 引用归一化工具（契约3 — Local 侧）
 *
 * 与 Backend 的 `code/cloud/backend/src/common/channel-ref.ts` 语义保持一致：
 * channelId 存在「裸」（如 `ch-abc`）与「带 realm 前缀」（如 `realm-1:ch-abc`）两种形态。
 * Local 各边界（saveResponse、pushChunk 等）统一通过本 helper 归一化，
 * 消除散落的 ad-hoc `split(':')`。
 *
 * 注：因 Local tsconfig 的 rootDir(./src) 限制无法直接复用 Backend 模块，故在此镜像实现；
 * 两端逻辑必须保持一致。
 */

/**
 * 提取裸 channelId（去掉 `realmId:` 前缀，如果存在）。
 *
 * @param channelId 裸或带 realm 前缀的 channelId
 * @returns 裸 channelId
 */
export function bareChannelId(channelId: string): string {
  if (!channelId) return channelId
  const idx = channelId.indexOf(':')
  return idx >= 0 ? channelId.slice(idx + 1) : channelId
}

/**
 * 从带 realm 前缀的 channelId 中提取 realmId 前缀。
 *
 * @param channelId 形如 `realmId:channelId`（裸 id 则返回 fallback）
 * @param fallback 无前缀时的回退值
 * @returns realmId 前缀
 */
export function realmIdFromChannel(channelId: string, fallback = 'default'): string {
  if (!channelId) return fallback
  const idx = channelId.indexOf(':')
  return idx > 0 ? channelId.slice(0, idx) : fallback
}
