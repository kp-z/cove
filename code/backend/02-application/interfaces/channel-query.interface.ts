import { ChannelEntity } from '../../01-domain/models/channel/channel.entity';

export interface IChannelQueryService {
  canSendMessage(channelId: string, senderId: string): Promise<{ allowed: boolean; reason?: string }>;
  getChannelById(channelId: string): Promise<ChannelEntity>;
}
