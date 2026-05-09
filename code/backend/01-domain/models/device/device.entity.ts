/**
 * DeviceEntity - 设备实体（聚合根）
 *
 * 设备表示用户用于访问系统的终端设备。
 *
 * 业务规则：
 * - deviceId 不能为空
 * - userId 不能为空
 * - status 只能是 active | inactive | revoked
 * - Entity 是不可变的（更新返回新实例）
 *
 * 注意：
 * - deviceType, platform, osVersion, appVersion, userAgent, ipAddress, lastActiveAt
 *   等运行时状态已移至 Infrastructure 层的 DeviceRuntime
 */

export type DeviceStatus = 'active' | 'inactive' | 'revoked';

const VALID_DEVICE_STATUSES: readonly DeviceStatus[] = ['active', 'inactive', 'revoked'];

export interface DeviceEntityProps {
  readonly deviceId: string;
  readonly userId: string;
  readonly deviceName: string;
  readonly status: DeviceStatus;
  readonly registeredAt: Date;
  readonly revokedAt?: Date;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly trusted?: boolean;
  };
}

export interface DeviceEntityJSON {
  readonly device_id: string;
  readonly user_id: string;
  readonly device_name: string;
  readonly status: DeviceStatus;
  readonly registered_at: string;
  readonly revoked_at?: string;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly trusted?: boolean;
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
      deviceName: json.device_name,
      status: json.status,
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
  get deviceName(): string { return this.props.deviceName; }
  get status(): DeviceStatus { return this.props.status; }
  get registeredAt(): Date { return this.props.registeredAt; }
  get revokedAt(): Date | undefined { return this.props.revokedAt; }
  get meta(): DeviceEntityProps['meta'] { return this.props.meta; }

  // --- Status checks ---

  isActive(): boolean { return this.props.status === 'active'; }
  isInactive(): boolean { return this.props.status === 'inactive'; }
  isRevoked(): boolean { return this.props.status === 'revoked'; }
  isTrusted(): boolean { return this.props.meta.trusted ?? false; }

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

  addTag(tag: string): DeviceEntity {
    const tags = this.props.meta.tags ?? [];
    if (tags.includes(tag)) {
      throw new Error('Tag already exists');
    }
    return DeviceEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        tags: [...tags, tag],
      },
    });
  }

  removeTag(tag: string): DeviceEntity {
    const tags = this.props.meta.tags ?? [];
    return DeviceEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        tags: tags.filter(t => t !== tag),
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
      device_name: this.props.deviceName,
      status: this.props.status,
      registered_at: this.props.registeredAt.toISOString(),
      revoked_at: this.props.revokedAt?.toISOString(),
      meta: this.props.meta,
    };
  }
}
