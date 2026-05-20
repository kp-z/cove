import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { createAuditRouter } from './audit.router';
import { AuditService } from '../../../application/services/audit/audit.service';
import { AuditLogEntity } from '../../../domain/models/audit/audit-log.entity';

describe('auditRouter', () => {
  let mockAuditService: AuditService;
  let mockContext: any;
  let router: ReturnType<typeof createAuditRouter>;

  const mockAuditLog = {
    id: 'log-1',
    userId: 'user-1',
    action: 'user.login',
    resourceType: 'user',
    resourceId: 'user-1',
    details: { ip: '127.0.0.1' },
    timestamp: new Date('2026-01-01T00:00:00Z'),
    toJSON: () => ({
      id: 'log-1',
      user_id: 'user-1',
      action: 'user.login',
      resource_type: 'user',
      resource_id: 'user-1',
      details: { ip: '127.0.0.1' },
      timestamp: '2026-01-01T00:00:00.000Z',
    }),
  } as unknown as AuditLogEntity;

  beforeEach(() => {
    mockAuditService = {
      queryLogs: vi.fn(),
      getUserLogs: vi.fn(),
      getResourceLogs: vi.fn(),
      cleanupOldLogs: vi.fn(),
      log: vi.fn(),
    } as unknown as AuditService;

    mockContext = {
      userId: 'test-user-id',
      realmId: 'test-realm-id',
      userRole: 'owner',
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      req: {} as IncomingMessage,
      res: {
        setHeader: vi.fn(),
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse,
    };

    router = createAuditRouter(mockAuditService);

    vi.clearAllMocks();
  });

  describe('query', () => {
    it('should query audit logs with admin role', async () => {
      vi.mocked(mockAuditService.queryLogs).mockResolvedValue({
        logs: [mockAuditLog],
        total: 1,
      });

      const caller = router.createCaller(mockContext);
      const result = await caller.query({
        userId: 'user-1',
        action: 'user.login',
        limit: 50,
        offset: 0,
      });

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockAuditService.queryLogs).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'user.login',
        resourceType: undefined,
        resourceId: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: 50,
        offset: 0,
      });
    });

    it('should query logs with date filters', async () => {
      vi.mocked(mockAuditService.queryLogs).mockResolvedValue({
        logs: [mockAuditLog],
        total: 1,
      });

      const caller = router.createCaller(mockContext);
      await caller.query({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      });

      expect(mockAuditService.queryLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date('2026-01-01T00:00:00Z'),
          endDate: new Date('2026-01-31T23:59:59Z'),
        })
      );
    });

    it('should reject query without admin/owner role', async () => {
      const memberContext = { ...mockContext, userRole: 'member' };
      const caller = router.createCaller(memberContext);

      await expect(
        caller.query({ limit: 50, offset: 0 })
      ).rejects.toThrow();
    });

    it('should handle query errors', async () => {
      vi.mocked(mockAuditService.queryLogs).mockRejectedValue(
        new Error('Database error')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.query({ limit: 50, offset: 0 })
      ).rejects.toThrow('Database error');
    });

    it('should validate limit and offset', async () => {
      const caller = router.createCaller(mockContext);

      // Test invalid limit (too large)
      await expect(
        caller.query({ limit: 101, offset: 0 })
      ).rejects.toThrow();

      // Test invalid offset (negative)
      await expect(
        caller.query({ limit: 50, offset: -1 })
      ).rejects.toThrow();
    });
  });

  describe('getUserLogs', () => {
    it('should get user logs for own user', async () => {
      vi.mocked(mockAuditService.getUserLogs).mockResolvedValue([mockAuditLog]);

      const caller = router.createCaller(mockContext);
      const result = await caller.getUserLogs({
        userId: 'test-user-id',
        limit: 50,
      });

      expect(result.logs).toHaveLength(1);
      expect(mockAuditService.getUserLogs).toHaveBeenCalledWith(
        'test-user-id',
        50
      );
    });

    it('should allow admin to view other user logs', async () => {
      vi.mocked(mockAuditService.getUserLogs).mockResolvedValue([mockAuditLog]);

      const adminContext = { ...mockContext, userRole: 'admin' };
      const caller = router.createCaller(adminContext);

      const result = await caller.getUserLogs({
        userId: 'other-user-id',
        limit: 50,
      });

      expect(result.logs).toHaveLength(1);
      expect(mockAuditService.getUserLogs).toHaveBeenCalledWith(
        'other-user-id',
        50
      );
    });

    it('should reject member viewing other user logs', async () => {
      const memberContext = { ...mockContext, userRole: 'member' };
      const caller = router.createCaller(memberContext);

      await expect(
        caller.getUserLogs({
          userId: 'other-user-id',
          limit: 50,
        })
      ).rejects.toThrow('You can only view your own audit logs');
    });

    it('should handle service errors', async () => {
      vi.mocked(mockAuditService.getUserLogs).mockRejectedValue(
        new Error('Service error')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.getUserLogs({
          userId: 'test-user-id',
          limit: 50,
        })
      ).rejects.toThrow('Service error');
    });
  });

  describe('getResourceLogs', () => {
    it('should get resource logs with owner role', async () => {
      vi.mocked(mockAuditService.getResourceLogs).mockResolvedValue([
        mockAuditLog,
      ]);

      const caller = router.createCaller(mockContext);
      const result = await caller.getResourceLogs({
        resourceId: 'resource-1',
        limit: 50,
      });

      expect(result.logs).toHaveLength(1);
      expect(mockAuditService.getResourceLogs).toHaveBeenCalledWith(
        'resource-1',
        50
      );
    });

    it('should reject without admin/owner role', async () => {
      const memberContext = { ...mockContext, userRole: 'member' };
      const caller = router.createCaller(memberContext);

      await expect(
        caller.getResourceLogs({
          resourceId: 'resource-1',
          limit: 50,
        })
      ).rejects.toThrow();
    });

    it('should handle service errors', async () => {
      vi.mocked(mockAuditService.getResourceLogs).mockRejectedValue(
        new Error('Service error')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.getResourceLogs({
          resourceId: 'resource-1',
          limit: 50,
        })
      ).rejects.toThrow('Service error');
    });
  });

  describe('cleanup', () => {
    it('should cleanup old logs with owner role', async () => {
      vi.mocked(mockAuditService.cleanupOldLogs).mockResolvedValue(42);

      const caller = router.createCaller(mockContext);
      const result = await caller.cleanup({ daysToKeep: 90 });

      expect(result.deletedCount).toBe(42);
      expect(result.message).toContain('42');
      expect(result.message).toContain('90 days');
      expect(mockAuditService.cleanupOldLogs).toHaveBeenCalledWith(90);
    });

    it('should use default daysToKeep', async () => {
      vi.mocked(mockAuditService.cleanupOldLogs).mockResolvedValue(10);

      const caller = router.createCaller(mockContext);
      await caller.cleanup({});

      expect(mockAuditService.cleanupOldLogs).toHaveBeenCalledWith(90);
    });

    it('should reject without owner role', async () => {
      const adminContext = { ...mockContext, userRole: 'admin' };
      const caller = router.createCaller(adminContext);

      await expect(
        caller.cleanup({ daysToKeep: 90 })
      ).rejects.toThrow();
    });

    it('should validate daysToKeep range', async () => {
      const caller = router.createCaller(mockContext);

      // Test too small
      await expect(
        caller.cleanup({ daysToKeep: 0 })
      ).rejects.toThrow();

      // Test too large
      await expect(
        caller.cleanup({ daysToKeep: 366 })
      ).rejects.toThrow();
    });

    it('should handle cleanup errors', async () => {
      vi.mocked(mockAuditService.cleanupOldLogs).mockRejectedValue(
        new Error('Cleanup failed')
      );

      const caller = router.createCaller(mockContext);

      await expect(
        caller.cleanup({ daysToKeep: 90 })
      ).rejects.toThrow('Cleanup failed');
    });
  });
});
