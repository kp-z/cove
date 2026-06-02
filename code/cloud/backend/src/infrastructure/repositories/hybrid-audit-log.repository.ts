import { PrismaClient } from '../../../generated/client';
import { AuditLogEntity } from '../../domain/models/audit/audit-log.entity';
import { AuditLogRepository, AuditLogQueryParams } from '../../application/interfaces/repositories/audit-log.repository.interface';

export class HybridAuditLogRepository implements AuditLogRepository {
  constructor(private prisma: PrismaClient) {}

  async save(auditLog: AuditLogEntity): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: auditLog.id,
        userId: auditLog.userId,
        action: auditLog.action,
        resourceType: auditLog.resourceType,
        resourceId: auditLog.resourceId,
        details: auditLog.details ? JSON.stringify(auditLog.details) : null,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        createdAt: auditLog.createdAt,
      },
    });
  }

  async findById(id: string): Promise<AuditLogEntity | null> {
    const record = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByUserId(userId: string, limit: number = 100): Promise<AuditLogEntity[]> {
    const records = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map(record => this.toDomain(record));
  }

  async findByResourceId(resourceId: string, limit: number = 100): Promise<AuditLogEntity[]> {
    const records = await this.prisma.auditLog.findMany({
      where: { resourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map(record => this.toDomain(record));
  }

  async query(params: AuditLogQueryParams): Promise<{ logs: AuditLogEntity[]; total: number }> {
    const where: any = {};

    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;
    if (params.resourceType) where.resourceType = params.resourceType;
    if (params.resourceId) where.resourceId = params.resourceId;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [records, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 100,
        skip: params.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: records.map(record => this.toDomain(record)),
      total,
    };
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: date,
        },
      },
    });

    return result.count;
  }

  private toDomain(record: any): AuditLogEntity {
    return new AuditLogEntity({
      id: record.id,
      userId: record.userId,
      action: record.action,
      resourceType: record.resourceType,
      resourceId: record.resourceId || undefined,
      details: record.details ? JSON.parse(record.details) : undefined,
      ipAddress: record.ipAddress || undefined,
      userAgent: record.userAgent || undefined,
      createdAt: record.createdAt,
    });
  }
}
