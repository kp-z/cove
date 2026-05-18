/**
 * Audit Log Store Interface
 *
 * Persistence layer for audit logs
 */

import { AuditLogEntry, AuditLogFilters } from './audit-logger.interface';

export interface IAuditLogStore {
  /**
   * Save an audit log entry
   */
  save(entry: AuditLogEntry): Promise<void>;

  /**
   * Query audit logs with filters
   */
  query(filters: AuditLogFilters): Promise<AuditLogEntry[]>;
}
