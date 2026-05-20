"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const audit_log_entity_1 = require("../../../domain/models/audit/audit-log.entity");
class AuditService {
    auditLogRepository;
    constructor(auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }
    async log(userId, action, resourceType, resourceId, details, ipAddress, userAgent) {
        const auditLog = audit_log_entity_1.AuditLogEntity.create(userId, action, resourceType, resourceId, details, ipAddress, userAgent);
        await this.auditLogRepository.save(auditLog);
    }
    async getUserLogs(userId, limit) {
        return this.auditLogRepository.findByUserId(userId, limit);
    }
    async getResourceLogs(resourceId, limit) {
        return this.auditLogRepository.findByResourceId(resourceId, limit);
    }
    async queryLogs(params) {
        return this.auditLogRepository.query(params);
    }
    async cleanupOldLogs(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        return this.auditLogRepository.deleteOlderThan(cutoffDate);
    }
}
exports.AuditService = AuditService;
