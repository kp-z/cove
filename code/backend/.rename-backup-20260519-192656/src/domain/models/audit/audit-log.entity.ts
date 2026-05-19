import { randomUUID } from 'crypto';

export type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.activate'
  | 'user.deactivate'
  | 'user.suspend'
  | 'user.lock'
  | 'user.unlock'
  | 'user.login'
  | 'user.logout'
  | 'user.password_change'
  | 'user.password_reset'
  | 'channel.create'
  | 'channel.update'
  | 'channel.delete'
  | 'message.create'
  | 'message.update'
  | 'message.delete'
  | 'project.create'
  | 'project.update'
  | 'project.delete';

export interface AuditLogDetails {
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AuditLogProps {
  id: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: AuditLogDetails;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class AuditLogEntity {
  private props: AuditLogProps;

  constructor(props: AuditLogProps) {
    this.props = props;
  }

  static create(
    userId: string,
    action: AuditAction,
    resourceType: string,
    resourceId?: string,
    details?: AuditLogDetails,
    ipAddress?: string,
    userAgent?: string
  ): AuditLogEntity {
    return new AuditLogEntity({
      id: randomUUID(),
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

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get action(): AuditAction {
    return this.props.action;
  }

  get resourceType(): string {
    return this.props.resourceType;
  }

  get resourceId(): string | undefined {
    return this.props.resourceId;
  }

  get details(): AuditLogDetails | undefined {
    return this.props.details;
  }

  get ipAddress(): string | undefined {
    return this.props.ipAddress;
  }

  get userAgent(): string | undefined {
    return this.props.userAgent;
  }

  get createdAt(): Date {
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
