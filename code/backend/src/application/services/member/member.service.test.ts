import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemberService, JoinChannelDTO, UpdateMemberRoleDTO, UpdateNotificationDTO, MemberNotFoundError, MemberNotFoundInChannelError, MemberAlreadyInChannelError, ChannelNotFoundForMemberError, UserNotFoundForMemberError } from './member.service';
import { MemberEntity, MemberRole } from '../../../domain/models/member/member.entity';
import {
  IMemberRepository,
  IChannelRepository,
  IUserRepository,
  IEventBus,
  ILogger,
} from '../../interfaces';

describe('MemberService', () => {
  let memberService: MemberService;
  let mockMemberRepository: IMemberRepository;
  let mockChannelRepository: IChannelRepository;
  let mockUserRepository: IUserRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockMemberRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findByChannel: vi.fn(),
      findByUser: vi.fn(),
      findByChannelAndUser: vi.fn(),
    } as unknown as IMemberRepository;

    mockChannelRepository = {
      exists: vi.fn(),
    } as unknown as IChannelRepository;

    mockUserRepository = {
      exists: vi.fn(),
    } as unknown as IUserRepository;

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    memberService = new MemberService(
      mockMemberRepository,
      mockChannelRepository,
      mockUserRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('joinChannel', () => {
    it('should allow user to join channel successfully', async () => {
      vi.mocked(mockChannelRepository.exists).mockResolvedValue(true);
      vi.mocked(mockUserRepository.exists).mockResolvedValue(true);
      vi.mocked(mockMemberRepository.findByChannelAndUser).mockResolvedValue(null);

      const dto: JoinChannelDTO = {
        channelId: 'channel-1',
        userId: 'user-1',
      };

      const result = await memberService.joinChannel(dto);

      expect(result).toBeInstanceOf(MemberEntity);
      expect(result.channelId).toBe(dto.channelId);
      expect(result.userId).toBe(dto.userId);
      expect(result.role).toBe('member');
      expect(result.status).toBe('active');
      expect(mockMemberRepository.save).toHaveBeenCalledWith(expect.any(MemberEntity));
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'member.joined',
          aggregateType: 'Member',
        })
      );
    });

    it('should allow user to join with custom role', async () => {
      vi.mocked(mockChannelRepository.exists).mockResolvedValue(true);
      vi.mocked(mockUserRepository.exists).mockResolvedValue(true);
      vi.mocked(mockMemberRepository.findByChannelAndUser).mockResolvedValue(null);

      const dto: JoinChannelDTO = {
        channelId: 'channel-1',
        userId: 'user-1',
        role: 'admin',
      };

      const result = await memberService.joinChannel(dto);

      expect(result.role).toBe('admin');
      expect(result.permissions).toContain('manage_members');
    });

    it('should throw ChannelNotFoundForMemberError when channel does not exist', async () => {
      vi.mocked(mockChannelRepository.exists).mockResolvedValue(false);

      const dto: JoinChannelDTO = {
        channelId: 'nonexistent',
        userId: 'user-1',
      };

      await expect(memberService.joinChannel(dto)).rejects.toThrow(
        ChannelNotFoundForMemberError
      );
    });

    it('should throw UserNotFoundForMemberError when user does not exist', async () => {
      vi.mocked(mockChannelRepository.exists).mockResolvedValue(true);
      vi.mocked(mockUserRepository.exists).mockResolvedValue(false);

      const dto: JoinChannelDTO = {
        channelId: 'channel-1',
        userId: 'nonexistent',
      };

      await expect(memberService.joinChannel(dto)).rejects.toThrow(
        UserNotFoundForMemberError
      );
    });

    it('should throw MemberAlreadyInChannelError when user already in channel', async () => {
      const existingMember = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'active',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockChannelRepository.exists).mockResolvedValue(true);
      vi.mocked(mockUserRepository.exists).mockResolvedValue(true);
      vi.mocked(mockMemberRepository.findByChannelAndUser).mockResolvedValue(existingMember);

      const dto: JoinChannelDTO = {
        channelId: 'channel-1',
        userId: 'user-1',
      };

      await expect(memberService.joinChannel(dto)).rejects.toThrow(
        MemberAlreadyInChannelError
      );
    });

    it('should allow rejoining if member has left', async () => {
      const leftMember = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'left',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        leftAt: new Date(),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockChannelRepository.exists).mockResolvedValue(true);
      vi.mocked(mockUserRepository.exists).mockResolvedValue(true);
      vi.mocked(mockMemberRepository.findByChannelAndUser).mockResolvedValue(leftMember);

      const dto: JoinChannelDTO = {
        channelId: 'channel-1',
        userId: 'user-1',
      };

      const result = await memberService.joinChannel(dto);

      expect(result).toBeInstanceOf(MemberEntity);
    });
  });

  describe('leaveChannel', () => {
    it('should allow member to leave channel', async () => {
      const member = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'active',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByChannelAndUser).mockResolvedValue(member);

      const result = await memberService.leaveChannel('channel-1', 'user-1');

      expect(result.status).toBe('left');
      expect(result.leftAt).toBeDefined();
      expect(mockMemberRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'member.left',
        })
      );
    });

    it('should throw MemberNotFoundInChannelError when member not found', async () => {
      vi.mocked(mockMemberRepository.findByChannelAndUser).mockResolvedValue(null);

      await expect(memberService.leaveChannel('channel-1', 'user-1')).rejects.toThrow(
        MemberNotFoundInChannelError
      );
    });
  });

  describe('getMemberById', () => {
    it('should return member when found', async () => {
      const member = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'active',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockMemberRepository.findById).mockResolvedValue(member);

      const result = await memberService.getMemberById('member-1');

      expect(result).toBe(member);
    });

    it('should throw MemberNotFoundError when member not found', async () => {
      vi.mocked(mockMemberRepository.findById).mockResolvedValue(null);

      await expect(memberService.getMemberById('nonexistent')).rejects.toThrow(
        MemberNotFoundError
      );
    });
  });

  describe('getChannelMembers', () => {
    it('should return all members of a channel', async () => {
      const members = [
        MemberEntity.create({
          memberId: 'member-1',
          channelId: 'channel-1',
          userId: 'user-1',
          userType: 'human',
          role: 'member',
          permissions: ['read', 'write'],
          status: 'active',
          onlineStatus: 'offline',
          joinedAt: new Date(),
          lastActiveAt: new Date(),
          statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
          notificationSettings: { enabled: true, mentionOnly: false },
          meta: {},
        }),
      ];

      vi.mocked(mockMemberRepository.findByChannel).mockResolvedValue(members);

      const result = await memberService.getChannelMembers('channel-1');

      expect(result).toEqual(members);
    });
  });

  describe('getUserChannels', () => {
    it('should return all channels a user is member of', async () => {
      const members = [
        MemberEntity.create({
          memberId: 'member-1',
          channelId: 'channel-1',
          userId: 'user-1',
          userType: 'human',
          role: 'member',
          permissions: ['read', 'write'],
          status: 'active',
          onlineStatus: 'offline',
          joinedAt: new Date(),
          lastActiveAt: new Date(),
          statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
          notificationSettings: { enabled: true, mentionOnly: false },
          meta: {},
        }),
      ];

      vi.mocked(mockMemberRepository.findByUser).mockResolvedValue(members);

      const result = await memberService.getUserChannels('user-1');

      expect(result).toEqual(members);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      const member = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'active',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockMemberRepository.findById).mockResolvedValue(member);

      const dto: UpdateMemberRoleDTO = {
        memberId: 'member-1',
        role: 'admin',
      };

      const result = await memberService.updateMemberRole(dto);

      expect(result.role).toBe('admin');
      expect(mockMemberRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'member.role_changed',
        })
      );
    });
  });

  describe('banMember', () => {
    it('should ban member successfully', async () => {
      const member = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'active',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByChannelAndUser).mockResolvedValue(member);

      const result = await memberService.banMember('channel-1', 'user-1');

      expect(result.status).toBe('banned');
      expect(result.bannedAt).toBeDefined();
      expect(mockMemberRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'member.banned',
        })
      );
    });
  });

  describe('unbanMember', () => {
    it('should unban member successfully', async () => {
      const member = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'banned',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        bannedAt: new Date(),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByChannelAndUser).mockResolvedValue(member);

      const result = await memberService.unbanMember('channel-1', 'user-1');

      expect(result.status).toBe('joined');
      expect(mockMemberRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'member.unbanned',
        })
      );
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings', async () => {
      const member = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'active',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockMemberRepository.findById).mockResolvedValue(member);

      const dto: UpdateNotificationDTO = {
        memberId: 'member-1',
        enabled: false,
        mentionOnly: true,
      };

      const result = await memberService.updateNotificationSettings(dto);

      expect(result.notificationSettings.enabled).toBe(false);
      expect(result.notificationSettings.mentionOnly).toBe(true);
      expect(mockMemberRepository.update).toHaveBeenCalled();
    });

    it('should mute member until specified date', async () => {
      const member = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'active',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockMemberRepository.findById).mockResolvedValue(member);

      const muteUntil = new Date(Date.now() + 3600000);
      const dto: UpdateNotificationDTO = {
        memberId: 'member-1',
        muteUntil,
      };

      const result = await memberService.updateNotificationSettings(dto);

      expect(result.notificationSettings.muteUntil).toEqual(muteUntil);
      expect(mockMemberRepository.update).toHaveBeenCalled();
    });
  });

  describe('recordActivity', () => {
    it('should update member last active time', async () => {
      const member = MemberEntity.create({
        memberId: 'member-1',
        channelId: 'channel-1',
        userId: 'user-1',
        userType: 'human',
        role: 'member',
        permissions: ['read', 'write'],
        status: 'active',
        onlineStatus: 'offline',
        joinedAt: new Date(),
        lastActiveAt: new Date(Date.now() - 3600000),
        statistics: { messageCount: 0, reactionCount: 0, mentionCount: 0, threadCount: 0 },
        notificationSettings: { enabled: true, mentionOnly: false },
        meta: {},
      });

      vi.mocked(mockMemberRepository.findById).mockResolvedValue(member);

      const result = await memberService.recordActivity('member-1');

      expect(result.lastActiveAt.getTime()).toBeGreaterThan(member.lastActiveAt.getTime());
      expect(mockMemberRepository.update).toHaveBeenCalled();
    });
  });

  describe('event publishing error handling', () => {
    it('should log error when event publishing fails but not throw', async () => {
      vi.mocked(mockChannelRepository.exists).mockResolvedValue(true);
      vi.mocked(mockUserRepository.exists).mockResolvedValue(true);
      vi.mocked(mockMemberRepository.findByChannelAndUser).mockResolvedValue(null);
      vi.mocked(mockEventBus.publish).mockRejectedValue(new Error('Event bus error'));

      const dto: JoinChannelDTO = {
        channelId: 'channel-1',
        userId: 'user-1',
      };

      await expect(memberService.joinChannel(dto)).resolves.toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.objectContaining({
          eventType: 'member.joined',
        })
      );
    });
  });
});
