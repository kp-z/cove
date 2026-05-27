/**
 * AgentTriggerService - Agent 触发规则服务
 *
 * 职责：
 * - 判断消息是否应该触发 agent 响应
 * - 支持多种触发规则（@mention、DM、关键词等）
 * - 可扩展的规则引擎
 *
 * 设计原则：
 * - 单一职责：只负责判断是否触发
 * - 开闭原则：易于添加新的触发规则
 */

import type { MessageEntity } from '../../../domain/models/message/message.entity';
import type { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import type { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { getRealmContext } from '../../context/realm-context-store';

export interface TriggerContext {
  message: MessageEntity;
  channel: ChannelEntity;
  agent: AgentEntity;
}

export interface TriggerResult {
  shouldTrigger: boolean;
  reason?: string;
}

export class AgentTriggerService {
  constructor() {}

  /**
   * 判断是否应该触发 agent 响应
   */
  shouldTriggerAgent(context: TriggerContext): TriggerResult {
    const { message, channel, agent } = context;

    // 规则 1: 不响应自己的消息
    if (message.senderId === agent.agentId) {
      return { shouldTrigger: false, reason: 'self_message' };
    }

    // 规则 2: DM 频道自动触发
    if (channel.type === 'dm' && this.isAgentInChannel(agent.agentId, channel)) {
      return { shouldTrigger: true, reason: 'dm_channel' };
    }

    // 规则 3: @mention 触发
    if (this.isMentioned(agent.agentId, message)) {
      return { shouldTrigger: true, reason: 'mentioned' };
    }

    // 规则 4: Agent 配置的触发规则
    if (agent.persona?.triggers?.onMention && this.isMentioned(agent.agentId, message)) {
      return { shouldTrigger: true, reason: 'trigger_config_mention' };
    }

    if (agent.persona?.triggers?.onDirectMessage && channel.type === 'dm') {
      return { shouldTrigger: true, reason: 'trigger_config_dm' };
    }

    // 默认不触发
    return { shouldTrigger: false, reason: 'no_match' };
  }

  /**
   * 检查 agent 是否在频道中
   */
  private isAgentInChannel(agentId: string, channel: ChannelEntity): boolean {
    return channel.members.some(
      (member) => member.memberId === agentId && member.memberType === 'agent'
    );
  }

  /**
   * 检查消息是否 @mention 了 agent
   */
  private isMentioned(agentId: string, message: MessageEntity): boolean {
    return message.mentions.some((mention) => mention.targetId === agentId);
  }
}
