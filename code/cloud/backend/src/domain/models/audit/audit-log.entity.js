"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogEntity = void 0;
const crypto_1 = require("crypto");
class AuditLogEntity {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(userId, action, resourceType, resourceId, details, ipAddress, userAgent) {
        return new AuditLogEntity({
            id: (0, crypto_1.randomUUID)(),
            userId,
            action,
            resourceType,
            resourceId,
            details,
            ipAddress,
            userAgent,
            createdAt: new Date(),
        });
    }
    get id() {
        return this.props.id;
    }
    get userId() {
        return this.props.userId;
    }
    get action() {
        return this.props.action;
    }
    get resourceType() {
        return this.props.resourceType;
    }
    get resourceId() {
        return this.props.resourceId;
    }
    get details() {
        return this.props.details;
    }
    get ipAddress() {
        return this.props.ipAddress;
    }
    get userAgent() {
        return this.props.userAgent;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            action: this.action,
            resourceType: this.resourceType,
            resourceId: this.resourceId,
            details: this.details,
            ipAddress: this.ipAddress,
            userAgent: this.userAgent,
            createdAt: this.createdAt.toISOString(),
        };
    }
}
exports.AuditLogEntity = AuditLogEntity;
