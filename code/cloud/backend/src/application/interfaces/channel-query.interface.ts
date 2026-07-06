import { ChannelEntity } from '../../domain/models/channel/channel.entity';

export interface IChannelQueryService {
  canSendMessage(channelId: string, senderId: string): Promise<{ allowed: boolean; reason?: string }>;
  getChannelById(channelId: string): Promise<ChannelEntity>;

  /**
   * 消息发送后调用，刷新 Channel 的活跃时间戳（meta.updated_at）与消息计数。
   * 复用 ChannelEntity.incrementMessageCount()，供人类/Agent 两条发送路径共同调用。
   * @param channelId - Channel ID
   */
  incrementMessageCount(channelId: string): Promise<void>;
}
