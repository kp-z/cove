import { ChannelEntity } from '../../domain/models/channel/channel.entity';

export interface IChannelQueryService {
  canSendMessage(channelId: string, senderId: string): Promise<{ allowed: boolean; reason?: string }>;
  getChannelById(channelId: string): Promise<ChannelEntity>;
}
