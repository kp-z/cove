import { AuditLogEntity } from '../../../domain/models/audit/audit-log.entity';

export interface AuditLogQueryParams {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogRepository {
  save(auditLog: AuditLogEntity): Promise<void>;
  findById(id: string): Promise<AuditLogEntity | null>;
  findByUserId(userId: string, limit?: number): Promise<AuditLogEntity[]>;
  findByResourceId(resourceId: string, limit?: number): Promise<AuditLogEntity[]>;
  query(params: AuditLogQueryParams): Promise<{ logs: AuditLogEntity[]; total: number }>;
  deleteOlderThan(date: Date): Promise<number>;
}
