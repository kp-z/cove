/**
 * Avatar Router Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAvatarRouter } from './avatar.router';
import { AvatarService } from '../../../application/services/avatar/avatar.service';
import { TRPCError } from '@trpc/server';

describe('Avatar Router', () => {
  let avatarService: AvatarService;
  let router: ReturnType<typeof createAvatarRouter>;

  beforeEach(() => {
    // Mock AvatarService
    avatarService = {
      getPresetAvatars: vi.fn(),
      uploadAvatar: vi.fn(),
      setPresetAvatar: vi.fn(),
      deleteUploadedAvatar: vi.fn(),
    } as any;

    router = createAvatarRouter(avatarService);
  });

  describe('getPresetAvatars', () => {
    it('should return all preset avatars', async () => {
      const mockPresets = [
        {
          id: 'preset-1',
          name: 'Robot 1',
          description: 'A friendly robot avatar',
          previewUrl: 'http://localhost:3001/storage/avatars/presets/preset-1.svg',
        },
        {
          id: 'preset-2',
          name: 'Avatar 2',
          description: 'A colorful avatar',
          previewUrl: 'http://localhost:3001/storage/avatars/presets/preset-2.svg',
        },
      ];

      vi.mocked(avatarService.getPresetAvatars).mockReturnValue(mockPresets);

      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      const result = await caller.getPresetAvatars();

      expect(result.presets).toEqual(mockPresets);
      expect(avatarService.getPresetAvatars).toHaveBeenCalled();
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const mockAvatarInfo = {
        avatarUrl: 'storage/avatars/users/user-1/avatar.png',
        avatarType: 'uploaded' as const,
      };

      vi.mocked(avatarService.uploadAvatar).mockResolvedValue(mockAvatarInfo);

      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      const base64Image = Buffer.from('fake-image-data').toString('base64');

      const result = await caller.uploadAvatar({
        entityType: 'user',
        entityId: 'user-1',
        file: base64Image,
        mimeType: 'image/png',
      });

      expect(result).toEqual(mockAvatarInfo);
      expect(avatarService.uploadAvatar).toHaveBeenCalledWith({
        entityType: 'user',
        entityId: 'user-1',
        fileBuffer: expect.any(Buffer),
        mimeType: 'image/png',
      });
    });

    it('should reject upload for other users', async () => {
      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      const base64Image = Buffer.from('fake-image-data').toString('base64');

      await expect(
        caller.uploadAvatar({
          entityType: 'user',
          entityId: 'user-2', // Different user
          file: base64Image,
          mimeType: 'image/png',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should handle upload errors', async () => {
      vi.mocked(avatarService.uploadAvatar).mockRejectedValue(
        new Error('File too large')
      );

      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      const base64Image = Buffer.from('fake-image-data').toString('base64');

      await expect(
        caller.uploadAvatar({
          entityType: 'user',
          entityId: 'user-1',
          file: base64Image,
          mimeType: 'image/png',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('setPresetAvatar', () => {
    it('should set preset avatar successfully', async () => {
      const mockAvatarInfo = {
        avatarUrl: 'storage/avatars/presets/preset-1.svg',
        avatarType: 'preset' as const,
      };

      vi.mocked(avatarService.setPresetAvatar).mockResolvedValue(mockAvatarInfo);

      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      const result = await caller.setPresetAvatar({
        entityType: 'user',
        entityId: 'user-1',
        presetId: 'preset-1',
      });

      expect(result).toEqual(mockAvatarInfo);
      expect(avatarService.setPresetAvatar).toHaveBeenCalledWith({
        entityType: 'user',
        entityId: 'user-1',
        presetId: 'preset-1',
      });
    });

    it('should reject setting preset avatar for other users', async () => {
      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      await expect(
        caller.setPresetAvatar({
          entityType: 'user',
          entityId: 'user-2', // Different user
          presetId: 'preset-1',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should handle invalid preset ID', async () => {
      vi.mocked(avatarService.setPresetAvatar).mockRejectedValue(
        new Error('Invalid preset avatar ID: invalid-preset')
      );

      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      await expect(
        caller.setPresetAvatar({
          entityType: 'user',
          entityId: 'user-1',
          presetId: 'invalid-preset',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar successfully', async () => {
      vi.mocked(avatarService.deleteUploadedAvatar).mockResolvedValue(undefined);

      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      const result = await caller.deleteAvatar({
        entityType: 'user',
        entityId: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(avatarService.deleteUploadedAvatar).toHaveBeenCalledWith('user', 'user-1');
    });

    it('should reject delete for other users', async () => {
      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      await expect(
        caller.deleteAvatar({
          entityType: 'user',
          entityId: 'user-2', // Different user
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should handle delete errors', async () => {
      vi.mocked(avatarService.deleteUploadedAvatar).mockRejectedValue(
        new Error('Avatar not found')
      );

      const caller = router.createCaller({
        userId: 'user-1',
        logger: console,
      } as any);

      await expect(
        caller.deleteAvatar({
          entityType: 'user',
          entityId: 'user-1',
        })
      ).rejects.toThrow(TRPCError);
    });
  });
});
