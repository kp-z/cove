import { randomUUID } from 'crypto';
import { IAuditLogger, AuditLogEntry, AuditLogFilters } from './audit-logger.interface';
import { IAuditLogStore } from './audit-log-store.interface';

/**
 * Audit Logger Service
 *
 * Records system actions for compliance, debugging, and security auditing
 */
export class AuditLogger implements IAuditLogger {
  constructor(private storage: IAuditLogStore) {}

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: randomUUID(),
      ...entry,
      timestamp: new Date(),
    };

    await this.storage.save(logEntry);
  }

  async query(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
    return await this.storage.query(filters);
  }
}
