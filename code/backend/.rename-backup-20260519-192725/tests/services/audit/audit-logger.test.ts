import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogger } from '../../../src/application/services/audit/audit-logger.service';
import { IAuditLogStore } from '../../../src/application/services/audit/audit-log-store.interface';
import { AuditLogEntry } from '../../../src/application/services/audit/audit-logger.interface';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let mockStore: IAuditLogStore;

  beforeEach(() => {
    mockStore = {
      save: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
    };
    auditLogger = new AuditLogger(mockStore);
  });

  describe('log', () => {
    it('should create audit log entry with id and timestamp', async () => {
      const entry = {
        action: 'adapter.create',
        actor_id: 'user-123',
        resource_type: 'adapter',
        resource_id: 'adapter-456',
        changes: { type: 'anthropic-api' },
      };

      await auditLogger.log(entry);

      expect(mockStore.save).toHaveBeenCalledTimes(1);
      const savedEntry = (mockStore.save as any).mock.calls[0][0] as AuditLogEntry;

      expect(savedEntry.id).toBeDefined();
      expect(savedEntry.timestamp).toBeInstanceOf(Date);
      expect(savedEntry.action).toBe('adapter.create');
      expect(savedEntry.actor_id).toBe('user-123');
      expect(savedEntry.resource_type).toBe('adapter');
      expect(savedEntry.resource_id).toBe('adapter-456');
      expect(savedEntry.changes).toEqual({ type: 'anthropic-api' });
    });

    it('should handle entry without changes', async () => {
      const entry = {
        action: 'adapter.delete',
        actor_id: 'user-123',
        resource_type: 'adapter',
        resource_id: 'adapter-456',
      };

      await auditLogger.log(entry);

      expect(mockStore.save).toHaveBeenCalledTimes(1);
      const savedEntry = (mockStore.save as any).mock.calls[0][0] as AuditLogEntry;
      expect(savedEntry.changes).toBeUndefined();
    });
  });

  describe('query', () => {
    it('should delegate to store', async () => {
      const filters = {
        actor_id: 'user-123',
        resource_type: 'adapter',
      };

      const mockResults: AuditLogEntry[] = [
        {
          id: '1',
          action: 'adapter.create',
          actor_id: 'user-123',
          resource_type: 'adapter',
          resource_id: 'adapter-456',
          timestamp: new Date(),
        },
      ];

      (mockStore.query as any).mockResolvedValue(mockResults);

      const results = await auditLogger.query(filters);

      expect(mockStore.query).toHaveBeenCalledWith(filters);
      expect(results).toEqual(mockResults);
    });
  });
});
