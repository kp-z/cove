import { AuditLogEntity, AuditAction, AuditLogDetails } from '../../../domain/models/audit/audit-log.entity';
import { AuditLogRepository, AuditLogQueryParams } from '../../interfaces/repositories/audit-log.repository.interface';
import { getRealmContext } from '../../context/realm-context-store';

export class AuditService {
  constructor(private auditLogRepository: AuditLogRepository) {}

  async log(
    userId: string,
    action: AuditAction,
    resourceType: string,
    resourceId?: string,
    details?: AuditLogDetails,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const auditLog = AuditLogEntity.create(
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent
    );

    await this.auditLogRepository.save(auditLog);
  }

  async getUserLogs(userId: string, limit?: number): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.findByUserId(userId, limit);
  }

  async getResourceLogs(resourceId: string, limit?: number): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.findByResourceId(resourceId, limit);
  }

  async queryLogs(params: AuditLogQueryParams): Promise<{ logs: AuditLogEntity[]; total: number }> {
    return this.auditLogRepository.query(params);
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    return this.auditLogRepository.deleteOlderThan(cutoffDate);
  }
}
