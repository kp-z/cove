/**
 * MessageStateManager
 *
 * 单一数据源 + 三类关注点分离的频道消息状态管理器。
 *
 * 设计要点（彻底消除「占位与最终正文打架」的竞态根因）：
 *   1. serverMessages —— 服务端权威正文，由 message.list 始终 upsert（覆盖），是唯一正文来源。
 *   2. pendingSends   —— 用户乐观消息（发送中），其权威 id 一旦落库即丢弃。
 *   3. agentProgress  —— 纯临时叠加层，仅承载 agent 的流式阶段/思考/工具，不存最终正文。
 *
 * getMessages 按「单一 id 空间」确定性合成：三个来源天然贡献互不相交的 id，
 * 因此无需任何「内容 + 时间戳」模糊去重，也没有跨表迁移 / 对账 / 超时删除占位的逻辑。
 */

import { Message, type MessageStatus, type MessageError } from './models';
import type { StreamingPhase } from './models/Message';
import { systemLog } from '../stores/systemEventStore';

// Agent 流式进度叠加层。注意：这里只保存「过程态」，绝不保存最终正文（正文来自 serverMessages）。
export interface AgentProgress {
  // 当前条目在 agentProgress Map 中的键。provisional 阶段为 `pending:<tempUserId>`，
  // promote 之后为权威 agentMessageId。
  key: string;
  // 服务端预分配的权威 agent 消息 id；provisional（accepted 之前）时为 undefined。
  agentMessageId?: string;
  channelId: string;
  agentId: string;
  agentName: string;
  // accepted 事件携带的服务端权威「被回复用户消息 id」。
  inReplyTo?: string;
  // 触发本次回复的本地用户消息临时 id（发送时记录，用于 promote 精确认领）。
  repliesToLocalId?: string;
  // 由 attachServerId 回填的「被回复用户消息」的服务端权威 id；
  // 即便 pendingSends 已被清理，promote 仍可凭此匹配 inReplyTo。
  repliesToServerId?: string;
  phase: StreamingPhase;
  thinking?: string;
  currentTool?: { name: string; params?: any };
  partialContent?: string;
  startedAt: Date;
  error?: MessageError;
}

export class MessageStateManager {
  // 服务端权威正文，键为 messageId（即 Message.id）。
  private serverMessages: Map<string, Message> = new Map();
  // 用户乐观消息，键为 tempId（即 Message.id）。
  private pendingSends: Map<string, Message> = new Map();
  // Agent 流式进度叠加层。
  private agentProgress: Map<string, AgentProgress> = new Map();
  // 频道订阅者。
  private subscribers: Map<string, Set<(messages: Message[]) => void>> = new Map();

  // ───────────────────────────────────────────────────────────────────────
  // 服务端权威正文
  // ───────────────────────────────────────────────────────────────────────

  /**
   * upsert 服务端权威消息（替换旧的 syncRemoteMessages）。
   *
   * 步骤：
   *   1. 始终覆盖写入 serverMessages（修复「正文已更新但前端不刷新」的旧 bug）。
   *   2. 清理已落库的乐观用户消息（按权威 id / messageId / tempId 精确匹配，无模糊匹配）。
   *   3. 清理已落库的 agent 进度叠加层（agentMessageId 已落库 → 占位由派生自动消失）。
   *   4. 通知订阅者。
   */
  upsertServerMessages(channelId: string, messages: Message[]): void {
    let droppedPending = 0;
    let droppedProgress = 0;

    messages.forEach((msg) => {
      // 步骤1：始终 upsert，确保正文/metadata 的后续补全能进入实时视图。
      this.serverMessages.set(msg.id, msg);

      // 步骤2：清理与该权威消息对应的乐观用户消息。
      for (const [tempId, pending] of this.pendingSends) {
        const matched =
          pending.id === msg.id ||
          pending.messageId === msg.id ||
          (!!pending.tempId && !!msg.tempId && pending.tempId === msg.tempId);
        if (matched) {
          this.pendingSends.delete(tempId);
          droppedPending++;
        }
      }

      // 步骤3：清理与该权威消息对应的 agent 进度叠加层（落库后占位无需再派生）。
      for (const [key, progress] of this.agentProgress) {
        if (progress.agentMessageId === msg.id) {
          this.agentProgress.delete(key);
          droppedProgress++;
        }
      }
    });

    systemLog.info(
      channelId,
      'message.synced',
      `Upserted ${messages.length} server messages (dropped ${droppedPending} pending, ${droppedProgress} progress)`,
      { totalMessages: messages.length, droppedPending, droppedProgress }
    );

    // 步骤4：通知订阅者重新合成。
    this.notifySubscribers(channelId);
  }

  // ───────────────────────────────────────────────────────────────────────
  // 用户乐观消息生命周期
  // ───────────────────────────────────────────────────────────────────────

  /**
   * 添加一条乐观用户消息（发送时立即插入），键为 message.id（即 tempId）。
   */
  addPendingSend(message: Message): void {
    this.pendingSends.set(message.id, message);

    systemLog.info(
      message.channelId,
      'message.created_local',
      `Created pending send: ${message.content.substring(0, 50)}...`,
      { messageId: message.id, pendingCount: this.pendingSends.size }
    );

    this.notifySubscribers(message.channelId);
  }

  /**
   * 关联服务端权威 id 到乐观用户消息。
   *
   * 步骤：
   *   1. 在乐观消息上回填 messageId，使 upsertServerMessages 能精确匹配并清理。
   *   2. 若存在「回复该用户消息」的 provisional agent 进度，则把权威用户消息 id 记录到
   *      该进度的 repliesToServerId，便于 accepted(inReplyTo) 精确认领（即便乐观消息已被清理）。
   */
  attachServerId(tempId: string, messageId: string): void {
    // 步骤1：回填乐观消息的权威 id。
    const pending = this.pendingSends.get(tempId);
    if (pending) {
      this.pendingSends.set(tempId, new Message({ ...pending, messageId }));
    }

    // 步骤2：把权威用户消息 id 同步给对应的 provisional 进度（供 promote 匹配 inReplyTo）。
    for (const [key, progress] of this.agentProgress) {
      if (progress.repliesToLocalId === tempId) {
        this.agentProgress.set(key, { ...progress, repliesToServerId: messageId });
      }
    }
    // 无视觉变化，无需 notify；如需保险可调用，但此处省略以避免无谓重渲染。
  }

  /**
   * 更新乐观用户消息状态（sending / sent / failed / queued），沿用旧的 markAsFailed/markAsQueued 语义。
   */
  updatePendingStatus(tempId: string, status: MessageStatus, error?: MessageError): void {
    const pending = this.pendingSends.get(tempId);
    if (!pending) return;

    let updated: Message;
    if (status === 'failed') {
      updated = pending.markAsFailed(error!);
    } else if (status === 'queued') {
      updated = pending.markAsQueued();
    } else {
      updated = new Message({ ...pending, status });
    }
    this.pendingSends.set(tempId, updated);

    if (status === 'failed') {
      systemLog.error(
        pending.channelId,
        'message.failed',
        `Message failed: ${error?.message || 'Unknown error'}`,
        { messageId: tempId, error }
      );
    } else if (status === 'queued') {
      systemLog.info(pending.channelId, 'message.queued', 'Message queued', { messageId: tempId });
    } else if (status === 'sent') {
      systemLog.info(pending.channelId, 'message.sent', 'Message sent successfully', { messageId: tempId });
    }

    this.notifySubscribers(pending.channelId);
  }

  // ───────────────────────────────────────────────────────────────────────
  // Agent 进度叠加层
  // ───────────────────────────────────────────────────────────────────────

  /**
   * 发送时建立一个 provisional（pending）的 agent 进度叠加层，键为 `pending:<repliesToLocalId>`。
   * 让用户瞬间看到「对方正在回复」的占位气泡。纯人类频道不调用此方法。
   */
  startAgentProgress(
    channelId: string,
    params: { repliesToLocalId: string; agentId: string; agentName: string }
  ): void {
    const key = `pending:${params.repliesToLocalId}`;
    const progress: AgentProgress = {
      key,
      channelId,
      agentId: params.agentId,
      agentName: params.agentName || 'Agent',
      repliesToLocalId: params.repliesToLocalId,
      phase: 'pending',
      startedAt: new Date(),
    };
    this.agentProgress.set(key, progress);

    systemLog.info(
      channelId,
      'message.created_local',
      `Started agent progress placeholder: ${key}`,
      { key, agentId: params.agentId }
    );

    this.notifySubscribers(channelId);
  }

  /**
   * accepted 事件到达时，把 provisional 进度「提升」为以权威 agentMessageId 为键的 accepted 进度。
   *
   * 匹配策略（由精确到兜底）：
   *   1. 精确：其 repliesToServerId === inReplyTo（attachServerId 已回填），
   *      或回退到 pendingSends[repliesToLocalId].messageId === inReplyTo。
   *   2. 兜底：本频道内唯一的 provisional（`pending:*`）进度。
   * 找不到则直接以权威 id 新建一个 accepted 进度。idempotent：若已落库 / 已存在则忽略。
   */
  promoteAgentProgress(params: {
    agentMessageId: string;
    inReplyTo?: string;
    agentId: string;
    agentName: string;
    channelId: string;
  }): void {
    const { agentMessageId, inReplyTo, agentId, agentName, channelId } = params;

    // 幂等：权威消息已落库，或权威 id 进度已存在，则无需 promote。
    if (this.serverMessages.has(agentMessageId) || this.agentProgress.has(agentMessageId)) {
      return;
    }

    // 候选：本频道内所有 provisional 进度。
    const provisional = Array.from(this.agentProgress.values()).filter(
      (p) => p.channelId === channelId && p.key.startsWith('pending:')
    );

    // 策略1：通过 inReplyTo 精确认领。
    let target: AgentProgress | undefined;
    if (inReplyTo) {
      target = provisional.find((p) => {
        if (p.repliesToServerId === inReplyTo) return true;
        if (p.repliesToLocalId) {
          const repliedUser = this.pendingSends.get(p.repliesToLocalId);
          if (repliedUser?.messageId === inReplyTo || repliedUser?.id === inReplyTo) return true;
        }
        return false;
      });
    }

    // 策略2：兜底——优先按 agentId 收窄，否则取唯一/最早的 provisional 进度。
    if (!target && provisional.length > 0) {
      const byAgent = provisional.filter((p) => p.agentId === agentId);
      target = (byAgent.length > 0 ? byAgent : provisional).sort(
        (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
      )[0];
    }

    if (target) {
      // 重键：删除旧 provisional key，按权威 agentMessageId 重建，保留 startedAt。
      this.agentProgress.delete(target.key);
      this.agentProgress.set(agentMessageId, {
        ...target,
        key: agentMessageId,
        agentMessageId,
        agentId,
        agentName: agentName || target.agentName,
        inReplyTo: inReplyTo ?? target.inReplyTo,
        phase: 'accepted',
      });

      systemLog.info(
        channelId,
        'message.synced',
        `Promoted progress ${target.key} → ${agentMessageId}`,
        { from: target.key, to: agentMessageId, inReplyTo }
      );
    } else {
      // 找不到 provisional（占位已超时清理 / 非本端触发），直接以权威 id 新建 accepted 进度。
      this.agentProgress.set(agentMessageId, {
        key: agentMessageId,
        agentMessageId,
        channelId,
        agentId,
        agentName: agentName || 'Agent',
        inReplyTo,
        phase: 'accepted',
        startedAt: new Date(),
      });

      systemLog.info(
        channelId,
        'message.synced',
        `Created fresh accepted progress: ${agentMessageId}`,
        { to: agentMessageId, inReplyTo }
      );
    }

    this.notifySubscribers(channelId);
  }

  /**
   * 合并更新 agent 进度叠加层（phase / thinking / currentTool / partialContent）。
   */
  updateAgentProgress(agentMessageId: string, partial: Partial<AgentProgress>): void {
    const progress = this.agentProgress.get(agentMessageId);
    if (!progress) return;

    this.agentProgress.set(agentMessageId, { ...progress, ...partial });
    this.notifySubscribers(progress.channelId);
  }

  /**
   * 向 agent 进度的 partialContent 追加正文增量（流式逐字相位用；本期默认不启用逐字流式）。
   */
  appendAgentProgressContent(agentMessageId: string, chunk: string): void {
    const progress = this.agentProgress.get(agentMessageId);
    if (!progress) return;

    this.agentProgress.set(agentMessageId, {
      ...progress,
      partialContent: (progress.partialContent ?? '') + chunk,
    });
    this.notifySubscribers(progress.channelId);
  }

  /**
   * 仅更新 agent 进度的阶段。
   */
  setAgentProgressPhase(agentMessageId: string, phase: StreamingPhase): void {
    const progress = this.agentProgress.get(agentMessageId);
    if (!progress) return;

    this.agentProgress.set(agentMessageId, { ...progress, phase });

    if (phase === 'thinking' || phase === 'responding') {
      systemLog.info(progress.channelId, 'message.streaming_phase', `Streaming phase: ${phase}`, {
        messageId: agentMessageId,
        phase,
      });
    } else if (phase === 'completed') {
      systemLog.info(progress.channelId, 'message.streaming_complete', 'Streaming completed', {
        messageId: agentMessageId,
      });
    }

    this.notifySubscribers(progress.channelId);
  }

  /**
   * 将 agent 进度标记为失败（phase = 'failed' + error）。
   */
  failAgentProgress(agentMessageId: string, error: MessageError): void {
    const progress = this.agentProgress.get(agentMessageId);
    if (!progress) return;

    this.agentProgress.set(agentMessageId, { ...progress, phase: 'failed', error });

    systemLog.error(progress.channelId, 'message.failed', `Agent failed: ${error.message}`, {
      messageId: agentMessageId,
      error,
    });

    this.notifySubscribers(progress.channelId);
  }

  /**
   * 超时兜底：若 provisional 占位长时间仍停留在 pending（agent 始终未被触发 / 无 accepted），
   * 则按 provisional key 清理它。若期间已被 promote 认领（key 已变为权威 id），此处查不到 → 空操作。
   */
  removeProvisionalIfPending(key: string): void {
    const progress = this.agentProgress.get(key);
    if (!progress) return;
    if (progress.phase !== 'pending') return;

    this.agentProgress.delete(key);
    systemLog.info(progress.channelId, 'state.cleanup', `Removed stale pending progress: ${key}`, {
      key,
    });
    this.notifySubscribers(progress.channelId);
  }

  // ───────────────────────────────────────────────────────────────────────
  // 确定性合成
  // ───────────────────────────────────────────────────────────────────────

  /**
   * 合成频道的消息列表（单一 id 空间，无模糊去重）。
   *
   * 步骤：
   *   1. 输出该频道全部 serverMessages（权威正文，原样）。
   *   2. 对每个「agentMessageId 尚未落库」的 agent 进度，派生一个占位 Message（实时「正在回复」气泡）。
   *      —— 防闪烁：若进度已 completed 但正文尚未落库，则以 'responding' 渲染（保留打字指示），
   *         待 upsert 落库后占位自动消失、原地显示真实正文。
   *   3. 输出「权威 messageId 尚未落库」的乐观用户消息。
   *   4. 按时间戳升序稳定排序（时间相同按 id 兜底）。
   *   5. 回复锚定：把回复型消息紧贴其父消息之后重排，确保 agent 占位/回复永远在被回复消息之下。
   */
  getMessages(channelId: string): Message[] {
    const result: Message[] = [];

    // 步骤1：服务端权威正文。
    for (const msg of this.serverMessages.values()) {
      if (msg.channelId === channelId) {
        result.push(msg);
      }
    }

    // 步骤2：派生 agent 占位（仅当其权威 id 尚未落库）。
    for (const progress of this.agentProgress.values()) {
      if (progress.channelId !== channelId) continue;
      // 已落库则跳过（由 serverMessages 负责正文，占位自动消失）。
      if (progress.agentMessageId && this.serverMessages.has(progress.agentMessageId)) continue;

      const id = progress.agentMessageId ?? progress.key;
      // 防闪烁：completed 但未落库时，先以 responding 渲染，避免空气泡一闪。
      const effectivePhase: StreamingPhase =
        progress.phase === 'completed' ? 'responding' : progress.phase;

      // 锚定用：占位「被回复的用户消息」标识符。按生命周期由「权威」到「本地」回退：
      //   1. inReplyTo            —— accepted 事件携带的服务端权威 id（最准）。
      //   2. repliesToServerId    —— attachServerId 回填的服务端用户消息 id。
      //   3. repliesToLocalId     —— 发送时记录的本地 tempId（mutate 返回前的极早期窗口兜底）。
      //   配合 anchorRepliesAfterParents 的「多别名索引」，无论取到本地 tempId 还是服务端 id，
      //   都能命中同一条用户消息，从而把占位稳定锚定在其「正下方」（覆盖乐观窗口→落库全程）。
      const replyAnchorId =
        progress.inReplyTo ?? progress.repliesToServerId ?? progress.repliesToLocalId;

      result.push(
        new Message({
          id,
          messageId: id,
          channelId,
          senderId: progress.agentId,
          senderName: progress.agentName,
          senderType: 'agent',
          content: progress.partialContent ?? '',
          inReplyTo: replyAnchorId,
          timestamp: progress.startedAt,
          source: 'local',
          status: progress.phase === 'failed' ? 'failed' : 'streaming',
          streamingPhase: effectivePhase,
          streamingData: {
            thinking: progress.thinking,
            currentTool: progress.currentTool,
            partialContent: progress.partialContent,
          },
          retryCount: 0,
          error: progress.error,
        })
      );
    }

    // 步骤3：尚未落库的乐观用户消息。
    for (const pending of this.pendingSends.values()) {
      if (pending.channelId !== channelId) continue;
      if (pending.messageId && this.serverMessages.has(pending.messageId)) continue;
      result.push(pending);
    }

    // 步骤4：稳定排序。按时间戳升序（最旧在前）；时间戳相同时按 id 兜底排序，
    //        保证多次合成结果顺序完全确定，避免无谓抖动 / 重排。
    const sorted = result.sort((a, b) => {
      const dt = a.timestamp.getTime() - b.timestamp.getTime();
      if (dt !== 0) return dt;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    // 步骤5：回复锚定。把「回复型」消息（带 inReplyTo 且其父消息在本列表中）紧挨父消息之后重排，
    //        从根因上消除「agent 占位/回复因绝对时间戳早于用户消息服务端时间戳而排到其上方」的问题。
    return this.anchorRepliesAfterParents(sorted);
  }

  /**
   * 回复锚定：把每条「回复型」消息紧贴其被回复消息之后，回复内部保持已排序的相对顺序。
   *
   * 设计：纯重排（不改时间戳、不增删消息），因此保持单一真相源、不引入新的竞态 / 模糊去重。
   * 步骤：
   *   1. 建立「父消息 id → 子回复列表」分组（仅当父消息确实存在于本列表时才视为回复，否则按根处理）。
   *   2. 以已排序的根消息为序做深度优先展开，父消息后紧跟其回复。
   *   3. 兜底：任何因数据异常（如回复成环）而未被访问到的消息，按原顺序补回，确保「绝不丢消息」。
   *
   * @param messages 已按时间戳稳定排序的消息列表
   * @returns 回复紧贴父消息后的稳定有序列表
   */
  private anchorRepliesAfterParents(messages: Message[]): Message[] {
    // 步骤1：构建「任意别名 → 主 id」索引 + 「父 → 子回复」分组。
    //   关键：乐观用户消息同时拥有 id(tempId) / messageId(服务端权威 id) / tempId 多个别名，
    //   而 agent 占位的 inReplyTo 在不同生命周期可能取到其中任意一个（本地 tempId 或 服务端 id）。
    //   若仅按 m.id 建索引，乐观窗口内占位锚不到用户消息 → 退化为按时间戳排序，
    //   导致占位排到刚发送的用户消息「上方」（切频道重拉后才恢复）。故必须按全部别名建索引。
    const aliasToPrimary = new Map<string, string>();
    for (const m of messages) {
      aliasToPrimary.set(m.id, m.id);
      if (m.messageId && !aliasToPrimary.has(m.messageId)) aliasToPrimary.set(m.messageId, m.id);
      if (m.tempId && !aliasToPrimary.has(m.tempId)) aliasToPrimary.set(m.tempId, m.id);
    }

    const childrenByParent = new Map<string, Message[]>();
    const roots: Message[] = [];

    for (const m of messages) {
      // 把 inReplyTo 解析为父消息的「主 id」（兼容 tempId / messageId 别名）。
      const primaryParent = m.inReplyTo ? aliasToPrimary.get(m.inReplyTo) : undefined;
      // 仅当父消息真实在场且不是自引用时，才视为「回复」并归入对应父分组。
      if (primaryParent && primaryParent !== m.id) {
        const bucket = childrenByParent.get(primaryParent);
        if (bucket) {
          bucket.push(m);
        } else {
          childrenByParent.set(primaryParent, [m]);
        }
      } else {
        roots.push(m);
      }
    }

    // 步骤2：深度优先展开（父后紧跟回复）。visited 防止异常成环导致的无限递归。
    const out: Message[] = [];
    const visited = new Set<string>();
    const visit = (m: Message): void => {
      if (visited.has(m.id)) return;
      visited.add(m.id);
      out.push(m);
      const kids = childrenByParent.get(m.id);
      if (kids) {
        for (const kid of kids) visit(kid);
      }
    };
    for (const root of roots) visit(root);

    // 步骤3：兜底补回未访问到的消息（理论上仅在回复成环等异常时发生），确保绝不丢消息。
    if (out.length !== messages.length) {
      for (const m of messages) {
        if (!visited.has(m.id)) out.push(m);
      }
    }

    return out;
  }

  // ───────────────────────────────────────────────────────────────────────
  // 订阅
  // ───────────────────────────────────────────────────────────────────────

  subscribe(channelId: string, callback: (messages: Message[]) => void): () => void {
    if (!this.subscribers.has(channelId)) {
      this.subscribers.set(channelId, new Set());
    }
    this.subscribers.get(channelId)!.add(callback);

    // 立即触发一次。
    callback(this.getMessages(channelId));

    return () => {
      this.subscribers.get(channelId)?.delete(callback);
    };
  }

  private notifySubscribers(channelId: string): void {
    const callbacks = this.subscribers.get(channelId);
    if (!callbacks) {
      systemLog.warn(channelId, 'state.subscribers_notified', 'No subscribers found', { channelId });
      return;
    }

    const messages = this.getMessages(channelId);
    systemLog.info(
      channelId,
      'state.subscribers_notified',
      `Notified ${callbacks.size} subscribers with ${messages.length} messages`,
      { subscribersCount: callbacks.size, messagesCount: messages.length }
    );
    callbacks.forEach((cb) => cb(messages));
  }
}

// 单例实例
export const messageStateManager = new MessageStateManager();
