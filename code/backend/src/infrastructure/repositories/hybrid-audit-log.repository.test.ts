import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { HybridAuditLogRepository } from './hybrid-audit-log.repository';
import { AuditLogEntity } from '../../domain/models/audit/audit-log.entity';
import { TestDatabaseHelper } from './test-database.helper';

describe('HybridAuditLogRepository', () => {
  let testDb: TestDatabaseHelper;
  let prisma: PrismaClient;
  let repository: HybridAuditLogRepository;

  beforeEach(async () => {
    testDb = new TestDatabaseHelper();
    prisma = await testDb.setup();
    repository = new HybridAuditLogRepository(prisma);
  });

  afterEach(async () => {
    await testDb.teardown();
  });

  describe('save', () => {
    it('should save audit log with all fields', async () => {
      const auditLog = AuditLogEntity.create(
        'user-1',
        'user.create',
        'User',
        'user-123',
        {
          before: { status: 'inactive' },
          after: { status: 'active' },
          metadata: { reason: 'registration' },
        },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      await repository.save(auditLog);

      const found = await repository.findById(auditLog.id);
      expect(found).not.toBeNull();
      expect(found!.userId).toBe('user-1');
      expect(found!.action).toBe('user.create');
      expect(found!.resourceType).toBe('User');
      expect(found!.resourceId).toBe('user-123');
      expect(found!.details).toEqual({
        before: { status: 'inactive' },
        after: { status: 'active' },
        metadata: { reason: 'registration' },
      });
      expect(found!.ipAddress).toBe('192.168.1.1');
      expect(found!.userAgent).toBe('Mozilla/5.0');
    });

    it('should save audit log with minimal fields', async () => {
      const auditLog = AuditLogEntity.create(
        'user-1',
        'user.login',
        'User'
      );

      await repository.save(auditLog);

      const found = await repository.findById(auditLog.id);
      expect(found).not.toBeNull();
      expect(found!.userId).toBe('user-1');
      expect(found!.action).toBe('user.login');
      expect(found!.resourceType).toBe('User');
      expect(found!.resourceId).toBeUndefined();
      expect(found!.details).toBeUndefined();
      expect(found!.ipAddress).toBeUndefined();
      expect(found!.userAgent).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should return audit log by id', async () => {
      const auditLog = AuditLogEntity.create(
        'user-1',
        'channel.create',
        'Channel',
        'channel-1'
      );
      await repository.save(auditLog);

      const found = await repository.findById(auditLog.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(auditLog.id);
      expect(found!.action).toBe('channel.create');
    });

    it('should return null if audit log not found', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return audit logs for a user', async () => {
      const log1 = AuditLogEntity.create('user-1', 'user.login', 'User');
      const log2 = AuditLogEntity.create('user-1', 'channel.create', 'Channel', 'ch-1');
      const log3 = AuditLogEntity.create('user-2', 'user.login', 'User');

      await repository.save(log1);
      await repository.save(log2);
      await repository.save(log3);

      const logs = await repository.findByUserId('user-1');

      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.userId === 'user-1')).toBe(true);
    });

    it('should return logs in descending order by createdAt', async () => {
      const log1 = AuditLogEntity.create('user-1', 'user.login', 'User');
      await new Promise(resolve => setTimeout(resolve, 10));
      const log2 = AuditLogEntity.create('user-1', 'channel.create', 'Channel');

      await repository.save(log1);
      await repository.save(log2);

      const logs = await repository.findByUserId('user-1');

      expect(logs[0].id).toBe(log2.id); // Most recent first
      expect(logs[1].id).toBe(log1.id);
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        const log = AuditLogEntity.create('user-1', 'user.login', 'User');
        await repository.save(log);
      }

      const logs = await repository.findByUserId('user-1', 3);

      expect(logs).toHaveLength(3);
    });

    it('should return empty array if no logs for user', async () => {
      const logs = await repository.findByUserId('non-existent-user');
      expect(logs).toEqual([]);
    });
  });

  describe('findByResourceId', () => {
    it('should return audit logs for a resource', async () => {
      const log1 = AuditLogEntity.create('user-1', 'channel.create', 'Channel', 'ch-1');
      const log2 = AuditLogEntity.create('user-2', 'channel.update', 'Channel', 'ch-1');
      const log3 = AuditLogEntity.create('user-1', 'channel.create', 'Channel', 'ch-2');

      await repository.save(log1);
      await repository.save(log2);
      await repository.save(log3);

      const logs = await repository.findByResourceId('ch-1');

      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.resourceId === 'ch-1')).toBe(true);
    });

    it('should return logs in descending order by createdAt', async () => {
      const log1 = AuditLogEntity.create('user-1', 'channel.create', 'Channel', 'ch-1');
      await new Promise(resolve => setTimeout(resolve, 10));
      const log2 = AuditLogEntity.create('user-2', 'channel.update', 'Channel', 'ch-1');

      await repository.save(log1);
      await repository.save(log2);

      const logs = await repository.findByResourceId('ch-1');

      expect(logs[0].id).toBe(log2.id); // Most recent first
      expect(logs[1].id).toBe(log1.id);
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        const log = AuditLogEntity.create('user-1', 'channel.update', 'Channel', 'ch-1');
        await repository.save(log);
      }

      const logs = await repository.findByResourceId('ch-1', 3);

      expect(logs).toHaveLength(3);
    });

    it('should return empty array if no logs for resource', async () => {
      const logs = await repository.findByResourceId('non-existent-resource');
      expect(logs).toEqual([]);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Create test data
      const log1 = AuditLogEntity.create('user-1', 'user.create', 'User', 'user-123');
      const log2 = AuditLogEntity.create('user-1', 'channel.create', 'Channel', 'ch-1');
      const log3 = AuditLogEntity.create('user-2', 'user.update', 'User', 'user-456');
      const log4 = AuditLogEntity.create('user-2', 'message.create', 'Message', 'msg-1');

      await repository.save(log1);
      await repository.save(log2);
      await repository.save(log3);
      await repository.save(log4);
    });

    it('should query by userId', async () => {
      const result = await repository.query({ userId: 'user-1' });

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.logs.every(log => log.userId === 'user-1')).toBe(true);
    });

    it('should query by action', async () => {
      const result = await repository.query({ action: 'user.create' });

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.logs[0].action).toBe('user.create');
    });

    it('should query by resourceType', async () => {
      const result = await repository.query({ resourceType: 'User' });

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.logs.every(log => log.resourceType === 'User')).toBe(true);
    });

    it('should query by resourceId', async () => {
      const result = await repository.query({ resourceId: 'ch-1' });

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.logs[0].resourceId).toBe('ch-1');
    });

    it('should query by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const result = await repository.query({
        startDate: yesterday,
        endDate: tomorrow,
      });

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should query with multiple filters', async () => {
      const result = await repository.query({
        userId: 'user-1',
        resourceType: 'Channel',
      });

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.logs[0].userId).toBe('user-1');
      expect(result.logs[0].resourceType).toBe('Channel');
    });

    it('should respect limit and offset', async () => {
      const result1 = await repository.query({ limit: 2, offset: 0 });
      expect(result1.logs).toHaveLength(2);

      const result2 = await repository.query({ limit: 2, offset: 2 });
      expect(result2.logs).toHaveLength(2);

      // Ensure different results
      expect(result1.logs[0].id).not.toBe(result2.logs[0].id);
    });

    it('should return empty result if no matches', async () => {
      const result = await repository.query({ userId: 'non-existent-user' });

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use default limit of 100', async () => {
      // Create more than 100 logs
      for (let i = 0; i < 105; i++) {
        const log = AuditLogEntity.create('user-test', 'user.login', 'User');
        await repository.save(log);
      }

      const result = await repository.query({ userId: 'user-test' });

      expect(result.logs).toHaveLength(100);
      expect(result.total).toBe(105);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete logs older than specified date', async () => {
      const oldDate = new Date('2020-01-01');
      const recentDate = new Date();

      // Create old log
      const oldLog = new AuditLogEntity({
        id: 'old-log',
        userId: 'user-1',
        action: 'user.login',
        resourceType: 'User',
        createdAt: oldDate,
      });

      // Create recent log
      const recentLog = AuditLogEntity.create('user-1', 'user.login', 'User');

      await repository.save(oldLog);
      await repository.save(recentLog);

      const cutoffDate = new Date('2021-01-01');
      const deletedCount = await repository.deleteOlderThan(cutoffDate);

      expect(deletedCount).toBe(1);

      const oldFound = await repository.findById('old-log');
      const recentFound = await repository.findById(recentLog.id);

      expect(oldFound).toBeNull();
      expect(recentFound).not.toBeNull();
    });

    it('should return 0 if no logs to delete', async () => {
      const log = AuditLogEntity.create('user-1', 'user.login', 'User');
      await repository.save(log);

      const cutoffDate = new Date('2020-01-01');
      const deletedCount = await repository.deleteOlderThan(cutoffDate);

      expect(deletedCount).toBe(0);
    });

    it('should delete multiple old logs', async () => {
      const oldDate = new Date('2020-01-01');

      for (let i = 0; i < 5; i++) {
        const oldLog = new AuditLogEntity({
          id: `old-log-${i}`,
          userId: 'user-1',
          action: 'user.login',
          resourceType: 'User',
          createdAt: oldDate,
        });
        await repository.save(oldLog);
      }

      const cutoffDate = new Date('2021-01-01');
      const deletedCount = await repository.deleteOlderThan(cutoffDate);

      expect(deletedCount).toBe(5);
    });
  });
});
