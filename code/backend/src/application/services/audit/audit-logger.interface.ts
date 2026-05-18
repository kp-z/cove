/**
 * Audit Log Entry
 *
 * Represents a single audit log entry for tracking system changes
 */
export interface AuditLogEntry {
  id: string;
  action: string;           // e.g., "adapter.create", "adapter.update", "adapter.delete"
  actor_id: string;         // User or agent ID who performed the action
  resource_type: string;    // e.g., "adapter", "agent", "channel"
  resource_id: string;      // ID of the resource being acted upon
  changes?: Record<string, any>;  // Optional details about what changed
  timestamp: Date;
}

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  actor_id?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit Logger Interface
 *
 * Records and queries audit logs for compliance and debugging
 */
export interface IAuditLogger {
  /**
   * Log an audit entry
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * Query audit logs with filters
   */
  query(filters: AuditLogFilters): Promise<AuditLogEntry[]>;
}
