/**
 * ChannelService - Channel 管理业务逻辑（协调器）
 *
 * 职责：
 * - 协调各个子服务
 * - 提供统一的 Channel 管理接口
 * - 实现 IChannelQueryService 接口
 */

import { ChannelEntity, ChannelType, ChannelStatus } from '../../../domain/models/channel/channel.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { IChannelQueryService } from '../../interfaces';
import { ChannelCrudService, CreateChannelDTO, UpdateChannelDTO } from './channel-crud.service';
import { ChannelQueryService } from './channel-query.service';
import { ChannelMemberService, AddMemberDTO, RemoveMemberDTO } from './channel-member.service';
import { ChannelLifecycleService } from './channel-lifecycle.service';
import { ChannelMessagingService, ChannelSendMessageDTO } from './channel-messaging.service';

export { CreateChannelDTO, UpdateChannelDTO, AddMemberDTO, RemoveMemberDTO, ChannelSendMessageDTO };

export class ChannelService implements IChannelQueryService {
  constructor(
    private readonly crudService: ChannelCrudService,
    private readonly queryService: ChannelQueryService,
    private readonly memberService: ChannelMemberService,
    private readonly lifecycleService: ChannelLifecycleService,
    private readonly messagingService: ChannelMessagingService
  ) {}

  async createChannel(dto: CreateChannelDTO): Promise<ChannelEntity> {
    return this.crudService.createChannel(dto);
  }

  async getChannelById(channelId: string): Promise<ChannelEntity> {
    return this.queryService.getChannelById(channelId);
  }

  async canSendMessage(channelId: string, senderId: string): Promise<{ allowed: boolean; reason?: string }> {
    return this.queryService.canSendMessage(channelId, senderId);
  }

  async getChannelsByProject(projectId: string): Promise<ChannelEntity[]> {
    return this.queryService.getChannelsByProject(projectId);
  }

  async getAllChannels(): Promise<ChannelEntity[]> {
    return this.queryService.getAllChannels();
  }

  async getChannelsByType(type: ChannelType): Promise<ChannelEntity[]> {
    return this.queryService.getChannelsByType(type);
  }

  async getChannelsByStatus(status: ChannelStatus): Promise<ChannelEntity[]> {
    return this.queryService.getChannelsByStatus(status);
  }

  async updateChannel(channelId: string, dto: UpdateChannelDTO): Promise<ChannelEntity> {
    return this.crudService.updateChannel(channelId, dto);
  }

  async addMember(dto: AddMemberDTO): Promise<ChannelEntity> {
    return this.memberService.addMember(dto);
  }

  async removeMember(dto: RemoveMemberDTO): Promise<ChannelEntity> {
    return this.memberService.removeMember(dto);
  }

  async sendMessage(dto: ChannelSendMessageDTO): Promise<MessageEntity> {
    return this.messagingService.sendMessage(dto);
  }

  async getChannelMessages(channelId: string, limit?: number): Promise<MessageEntity[]> {
    return this.messagingService.getChannelMessages(channelId, limit);
  }

  async getThreadMessages(threadId: string, limit?: number): Promise<MessageEntity[]> {
    return this.messagingService.getThreadMessages(threadId, limit);
  }

  async archiveChannel(channelId: string): Promise<ChannelEntity> {
    return this.lifecycleService.archiveChannel(channelId);
  }

  async activateChannel(channelId: string): Promise<ChannelEntity> {
    return this.lifecycleService.activateChannel(channelId);
  }

  async deleteChannel(channelId: string): Promise<void> {
    return this.crudService.deleteChannel(channelId);
  }
}
