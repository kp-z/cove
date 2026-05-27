import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealmPermissionService } from './realm-permission.service';
import { RealmPermission, RealmMemberEntity } from '../../../domain/models/realm-member/realm-member.entity';
import { UnauthorizedRealmAccessError, InsufficientPermissionError } from './realm.errors';
import { IRealmMemberRepository, ILogger } from '../../interfaces';

describe('RealmPermissionService', () => {
  let service: RealmPermissionService;
  let mockMemberRepository: IRealmMemberRepository;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockMemberRepository = {
      findByServerAndUser: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      findByServer: vi.fn(),
      findByRole: vi.fn(),
      findByStatus: vi.fn(),
      findByUser: vi.fn(),
    } as any;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    service = new RealmPermissionService(mockMemberRepository, mockLogger);
  });

  describe('requirePermission', () => {
    it('should allow owner to manage server', async () => {
      // Arrange: owner 拥有所有权限
      const ownerMember = RealmMemberEntity.create({
        member_id: 'member-1',
        realm_id: 'realm-1',
        user_id: 'user-1',
        role: 'owner',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(ownerMember);

      // Act & Assert
      await expect(
        service.requirePermission('user-1', 'realm-1', RealmPermission.SERVER_MANAGE)
      ).resolves.not.toThrow();

      expect(mockMemberRepository.findByServerAndUser).toHaveBeenCalledWith('realm-1', 'user-1');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Permission granted',
        expect.objectContaining({
          userId: 'user-1',
          realmId: 'realm-1',
          permission: RealmPermission.SERVER_MANAGE,
          userRole: 'owner',
        })
      );
    });

    it('should allow admin to invite members', async () => {
      // Arrange: admin 拥有 MEMBER_INVITE 权限
      const adminMember = RealmMemberEntity.create({
        member_id: 'member-2',
        realm_id: 'realm-1',
        user_id: 'user-2',
        role: 'admin',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(adminMember);

      // Act & Assert
      await expect(
        service.requirePermission('user-2', 'realm-1', RealmPermission.MEMBER_INVITE)
      ).resolves.not.toThrow();
    });

    it('should deny member from managing server', async () => {
      // Arrange: member 没有 SERVER_MANAGE 权限
      const memberMember = RealmMemberEntity.create({
        member_id: 'member-3',
        realm_id: 'realm-1',
        user_id: 'user-3',
        role: 'member',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(memberMember);

      // Act & Assert
      await expect(
        service.requirePermission('user-3', 'realm-1', RealmPermission.SERVER_MANAGE)
      ).rejects.toThrow(InsufficientPermissionError);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Permission denied',
        expect.objectContaining({
          userId: 'user-3',
          realmId: 'realm-1',
          permission: RealmPermission.SERVER_MANAGE,
          userRole: 'member',
        })
      );
    });

    it('should deny non-member access', async () => {
      // Arrange: 非成员
      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.requirePermission('user-4', 'realm-1', RealmPermission.MEMBER_VIEW)
      ).rejects.toThrow(UnauthorizedRealmAccessError);
    });

    it('should deny suspended member access', async () => {
      // Arrange: 被暂停的成员
      const suspendedMember = RealmMemberEntity.create({
        member_id: 'member-5',
        realm_id: 'realm-1',
        user_id: 'user-5',
        role: 'member',
        status: 'suspended',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(suspendedMember);

      // Act & Assert
      await expect(
        service.requirePermission('user-5', 'realm-1', RealmPermission.MEMBER_VIEW)
      ).rejects.toThrow(UnauthorizedRealmAccessError);
    });

    it('should use cache for repeated checks', async () => {
      // Arrange
      const ownerMember = RealmMemberEntity.create({
        member_id: 'member-1',
        realm_id: 'realm-1',
        user_id: 'user-1',
        role: 'owner',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(ownerMember);

      // Act: 第一次查询
      await service.requirePermission('user-1', 'realm-1', RealmPermission.SERVER_MANAGE);

      // Act: 第二次查询（应该使用缓存）
      await service.requirePermission('user-1', 'realm-1', RealmPermission.SERVER_MANAGE);

      // Assert: 只查询了一次数据库
      expect(mockMemberRepository.findByServerAndUser).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Permission cache hit',
        expect.objectContaining({ userId: 'user-1', realmId: 'realm-1' })
      );
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      // Arrange
      const ownerMember = RealmMemberEntity.create({
        member_id: 'member-1',
        realm_id: 'realm-1',
        user_id: 'user-1',
        role: 'owner',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(ownerMember);

      // Act
      const result = await service.hasPermission('user-1', 'realm-1', RealmPermission.SERVER_MANAGE);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      // Arrange
      const memberMember = RealmMemberEntity.create({
        member_id: 'member-3',
        realm_id: 'realm-1',
        user_id: 'user-3',
        role: 'member',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(memberMember);

      // Act
      const result = await service.hasPermission('user-3', 'realm-1', RealmPermission.SERVER_MANAGE);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user is not a member', async () => {
      // Arrange
      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(null);

      // Act
      const result = await service.hasPermission('user-4', 'realm-1', RealmPermission.MEMBER_VIEW);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specific user', async () => {
      // Arrange: 先填充缓存
      const member = RealmMemberEntity.create({
        member_id: 'member-1',
        realm_id: 'realm-1',
        user_id: 'user-1',
        role: 'owner',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(member);
      await service.requirePermission('user-1', 'realm-1', RealmPermission.SERVER_MANAGE);

      // Act: 清除特定用户缓存
      service.clearCache('user-1');

      // Assert: 下次查询应该重新查数据库
      await service.requirePermission('user-1', 'realm-1', RealmPermission.SERVER_MANAGE);
      expect(mockMemberRepository.findByServerAndUser).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      // Arrange: 填充多个用户的缓存
      const member1 = RealmMemberEntity.create({
        member_id: 'member-1',
        realm_id: 'realm-1',
        user_id: 'user-1',
        role: 'owner',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(member1);
      await service.requirePermission('user-1', 'realm-1', RealmPermission.SERVER_MANAGE);

      // Act: 清除所有缓存
      service.clearCache();

      // Assert: 下次查询应该重新查数据库
      await service.requirePermission('user-1', 'realm-1', RealmPermission.SERVER_MANAGE);
      expect(mockMemberRepository.findByServerAndUser).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cleared all permission cache',
        expect.objectContaining({ count: 1 })
      );
    });
  });

  describe('requireAnyPermission', () => {
    it('should allow when user has one of the permissions', async () => {
      // Arrange: admin 拥有 MEMBER_INVITE 但没有 SERVER_DELETE
      const adminMember = RealmMemberEntity.create({
        member_id: 'member-2',
        realm_id: 'realm-1',
        user_id: 'user-2',
        role: 'admin',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(adminMember);

      // Act & Assert
      await expect(
        service.requireAnyPermission('user-2', 'realm-1', [
          RealmPermission.SERVER_DELETE,
          RealmPermission.MEMBER_INVITE,
        ])
      ).resolves.not.toThrow();
    });

    it('should deny when user has none of the permissions', async () => {
      // Arrange: member 没有任何管理权限
      const memberMember = RealmMemberEntity.create({
        member_id: 'member-3',
        realm_id: 'realm-1',
        user_id: 'user-3',
        role: 'member',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(memberMember);

      // Act & Assert
      await expect(
        service.requireAnyPermission('user-3', 'realm-1', [
          RealmPermission.SERVER_DELETE,
          RealmPermission.SERVER_MANAGE,
        ])
      ).rejects.toThrow(InsufficientPermissionError);
    });
  });

  describe('requireAllPermissions', () => {
    it('should allow when user has all permissions', async () => {
      // Arrange: owner 拥有所有权限
      const ownerMember = RealmMemberEntity.create({
        member_id: 'member-1',
        realm_id: 'realm-1',
        user_id: 'user-1',
        role: 'owner',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(ownerMember);

      // Act & Assert
      await expect(
        service.requireAllPermissions('user-1', 'realm-1', [
          RealmPermission.SERVER_MANAGE,
          RealmPermission.MEMBER_INVITE,
        ])
      ).resolves.not.toThrow();
    });

    it('should deny when user lacks some permissions', async () => {
      // Arrange: admin 没有 SERVER_DELETE 权限
      const adminMember = RealmMemberEntity.create({
        member_id: 'member-2',
        realm_id: 'realm-1',
        user_id: 'user-2',
        role: 'admin',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      vi.mocked(mockMemberRepository.findByServerAndUser).mockResolvedValue(adminMember);

      // Act & Assert
      await expect(
        service.requireAllPermissions('user-2', 'realm-1', [
          RealmPermission.MEMBER_INVITE,
          RealmPermission.SERVER_DELETE,
        ])
      ).rejects.toThrow(InsufficientPermissionError);
    });
  });
});
