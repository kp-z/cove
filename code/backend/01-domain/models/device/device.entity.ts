/**
 * DeviceEntity - 设备实体（聚合根）
 *
 * 设备表示用户用于访问系统的终端设备（Web、Mobile、Desktop、CLI）。
 *
 * 业务规则：
 * - deviceId 不能为空
 * - userId 不能为空
 * - deviceType 只能是 web | mobile | desktop | cli
 * - status 只能是 active | inactive | revoked
 * - Entity 是不可变的（更新返回新实例）
 */

export type DeviceType = 'web' | 'mobile' | 'desktop' | 'cli';
export type DeviceStatus = 'active' | 'inactive' | 'revoked';
export type DevicePlatform = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'web';

const VALID_DEVICE_TYPES: readonly DeviceType[] = ['web', 'mobile', 'desktop', 'cli'];
const VALID_DEVICE_STATUSES: readonly DeviceStatus[] = ['active', 'inactive', 'revoked'];

export interface DeviceEntityProps {
  readonly deviceId: string;
  readonly userId: string;
  readonly deviceType: DeviceType;
  readonly platform: DevicePlatform;
  readonly deviceName: string;
  readonly deviceModel?: string;
  readonly osVersion?: string;
  readonly appVersion?: string;
  readonly userAgent?: string;
  readonly ipAddress?: string;
  readonly status: DeviceStatus;
  readonly lastActiveAt: Date;
  readonly registeredAt: Date;
  readonly revokedAt?: Date;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly trusted?: boolean;
    readonly location?: string;
  };
}

export interface DeviceEntityJSON {
  readonly device_id: string;
  readonly user_id: string;
  readonly device_type: DeviceType;
  readonly platform: DevicePlatform;
  readonly device_name: string;
  readonly device_model?: string;
  readonly os_version?: string;
  readonly app_version?: string;
  readonly user_agent?: string;
  readonly ip_address?: string;
  readonly status: DeviceStatus;
  readonly last_active_at: string;
  readonly registered_at: string;
  readonly revoked_at?: string;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly trusted?: boolean;
    readonly location?: string;
  };
}

export class DeviceEntity {
  private constructor(private readonly props: DeviceEntityProps) {
    this.validate();
  }

  static create(props: DeviceEntityProps): DeviceEntity {
    return new DeviceEntity(props);
  }

  static fromJSON(json: DeviceEntityJSON): DeviceEntity {
    return DeviceEntity.create({
      deviceId: json.device_id,
      userId: json.user_id,
      deviceType: json.device_type,
      platform: json.platform,
      deviceName: json.device_name,
      deviceModel: json.device_model,
      osVersion: json.os_version,
      appVersion: json.app_version,
      userAgent: json.user_agent,
      ipAddress: json.ip_address,
      status: json.status,
      lastActiveAt: new Date(json.last_active_at),
      registeredAt: new Date(json.registered_at),
      revokedAt: json.revoked_at ? new Date(json.revoked_at) : undefined,
      meta: json.meta,
    });
  }

  private validate(): void {
    if (!this.props.deviceId || this.props.deviceId.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }
    if (!this.props.userId || this.props.userId.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
    if (!VALID_DEVICE_TYPES.includes(this.props.deviceType)) {
      throw new Error(`Invalid device type: ${this.props.deviceType}. Must be one of: ${VALID_DEVICE_TYPES.join(', ')}`);
    }
    if (!VALID_DEVICE_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid device status: ${this.props.status}. Must be one of: ${VALID_DEVICE_STATUSES.join(', ')}`);
    }
    if (!this.props.deviceName || this.props.deviceName.trim() === '') {
      throw new Error('Device name cannot be empty');
    }
  }

  // --- Getters ---

  get deviceId(): string { return this.props.deviceId; }
  get userId(): string { return this.props.userId; }
  get deviceType(): DeviceType { return this.props.deviceType; }
  get platform(): DevicePlatform { return this.props.platform; }
  get deviceName(): string { return this.props.deviceName; }
  get deviceModel(): string | undefined { return this.props.deviceModel; }
  get osVersion(): string | undefined { return this.props.osVersion; }
  get appVersion(): string | undefined { return this.props.appVersion; }
  get userAgent(): string | undefined { return this.props.userAgent; }
  get ipAddress(): string | undefined { return this.props.ipAddress; }
  get status(): DeviceStatus { return this.props.status; }
  get lastActiveAt(): Date { return this.props.lastActiveAt; }
  get registeredAt(): Date { return this.props.registeredAt; }
  get revokedAt(): Date | undefined { return this.props.revokedAt; }
  get meta(): DeviceEntityProps['meta'] { return this.props.meta; }

  // --- Status checks ---

  isActive(): boolean { return this.props.status === 'active'; }
  isInactive(): boolean { return this.props.status === 'inactive'; }
  isRevoked(): boolean { return this.props.status === 'revoked'; }
  isTrusted(): boolean { return this.props.meta.trusted ?? false; }

  // --- Type checks ---

  isWeb(): boolean { return this.props.deviceType === 'web'; }
  isMobile(): boolean { return this.props.deviceType === 'mobile'; }
  isDesktop(): boolean { return this.props.deviceType === 'desktop'; }
  isCLI(): boolean { return this.props.deviceType === 'cli'; }

  // --- Immutable updates ---

  updateStatus(status: DeviceStatus): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      status,
    });
  }

  activate(): DeviceEntity {
    if (this.props.status === 'revoked') {
      throw new Error('Revoked devices cannot be activated');
    }
    return DeviceEntity.create({
      ...this.props,
      status: 'active',
      lastActiveAt: new Date(),
    });
  }

  deactivate(): DeviceEntity {
    if (this.props.status === 'revoked') {
      throw new Error('Revoked devices cannot be deactivated');
    }
    return DeviceEntity.create({
      ...this.props,
      status: 'inactive',
    });
  }

  revoke(): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      status: 'revoked',
      revokedAt: new Date(),
    });
  }

  updateLastActive(): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      lastActiveAt: new Date(),
    });
  }

  updateDeviceName(deviceName: string): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      deviceName,
    });
  }

  markAsTrusted(): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        trusted: true,
      },
    });
  }

  markAsUntrusted(): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        trusted: false,
      },
    });
  }

  // --- Equality (by ID) ---

  equals(other: DeviceEntity): boolean {
    return this.props.deviceId === other.props.deviceId;
  }

  // --- Serialization ---

  toJSON(): DeviceEntityJSON {
    return {
      device_id: this.props.deviceId,
      user_id: this.props.userId,
      device_type: this.props.deviceType,
      platform: this.props.platform,
      device_name: this.props.deviceName,
      device_model: this.props.deviceModel,
      os_version: this.props.osVersion,
      app_version: this.props.appVersion,
      user_agent: this.props.userAgent,
      ip_address: this.props.ipAddress,
      status: this.props.status,
      last_active_at: this.props.lastActiveAt.toISOString(),
      registered_at: this.props.registeredAt.toISOString(),
      revoked_at: this.props.revokedAt?.toISOString(),
      meta: this.props.meta,
    };
  }
}
