/**
 * MessageMentionService - 消息提及处理领域服务
 *
 * 负责解析消息中的 @mention，提取被提及的用户和 Agent。
 */

export interface Mention {
  readonly type: 'user' | 'agent' | 'channel' | 'task';
  readonly id: string;
  readonly name: string;
  readonly position: number;
}

export interface MentionParseResult {
  readonly mentions: readonly Mention[];
  readonly mentionedUserIds: readonly string[];
  readonly mentionedAgentIds: readonly string[];
  readonly mentionedChannelIds: readonly string[];
}

export class MessageMentionService {
  private readonly mentionPattern = /@(\w+)/g;

  /**
   * 解析消息内容，提取所有 @mention
   */
  parseMentions(
    content: string,
    availableUsers: Map<string, string>,
    availableAgents: Map<string, string>
  ): MentionParseResult {
    const mentions: Mention[] = [];
    const mentionedUserIds = new Set<string>();
    const mentionedAgentIds = new Set<string>();
    const mentionedChannelIds = new Set<string>();

    let match: RegExpExecArray | null;
    const userPattern = /@(\w+)/g;
    while ((match = userPattern.exec(content)) !== null) {
      const name = match[1];
      if (!name) continue;
      const position = match.index;

      const userId = availableUsers.get(name);
      if (userId) {
        mentions.push({ type: 'user', id: userId, name, position });
        mentionedUserIds.add(userId);
        continue;
      }

      const agentId = availableAgents.get(name);
      if (agentId) {
        mentions.push({ type: 'agent', id: agentId, name, position });
        mentionedAgentIds.add(agentId);
      }
    }

    const channelPattern = /#([\w-]+)/g;
    while ((match = channelPattern.exec(content)) !== null) {
      const channelName = match[1];
      if (!channelName) continue;
      const position = match.index;
      mentions.push({ type: 'channel', id: channelName, name: channelName, position });
      mentionedChannelIds.add(channelName);
    }

    return {
      mentions,
      mentionedUserIds: Array.from(mentionedUserIds),
      mentionedAgentIds: Array.from(mentionedAgentIds),
      mentionedChannelIds: Array.from(mentionedChannelIds),
    };
  }

  mentionsUser(content: string, userName: string): boolean {
    const pattern = new RegExp(`@${userName}\\b`, 'i');
    return pattern.test(content);
  }

  hasMentions(content: string): boolean {
    return /@\w+/.test(content);
  }
}
