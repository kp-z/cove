/**
 * DeviceEntity - 物理设备/计算资源实体
 *
 * 职责：
 * - 管理物理设备的资源配置（CPU、内存、存储、GPU）
 * - 管理设备的网络配置
 * - 跟踪设备状态和健康状况
 * - 关联到 Server（工作空间）
 */

export type DeviceType = 'physical' | 'virtual' | 'container' | 'cloud';
export type DeviceStatus = 'provisioning' | 'online' | 'offline' | 'maintenance' | 'error' | 'decommissioned';

export interface DeviceSpecs {
  cpu_cores: number;
  memory_gb: number;
  storage_gb: number;
  gpu_count?: number;
  gpu_model?: string;
}

export interface DeviceNetwork {
  hostname?: string;
  ip_address?: string;
  port?: number;
  protocol?: 'http' | 'https';
  domain?: string;
}

export interface DeviceLocation {
  datacenter?: string;
  region?: string;
  zone?: string;
  rack?: string;
}

export interface DeviceEntityProps {
  device_id: string;
  name: string;
  display_name?: string;
  description?: string;
  server_id: string;
  type: DeviceType;
  provider?: string; // e.g., 'aws', 'gcp', 'azure', 'on-premise'
  specs: DeviceSpecs;
  network?: DeviceNetwork;
  location?: DeviceLocation;
  status: DeviceStatus;
  created_at: Date;
  updated_at: Date;
  last_seen_at?: Date;
  meta?: Record<string, unknown>;
}

export interface DeviceEntityJSON {
  device_id: string;
  name: string;
  display_name?: string;
  description?: string;
  server_id: string;
  type: DeviceType;
  provider?: string;
  specs: DeviceSpecs;
  network?: DeviceNetwork;
  location?: DeviceLocation;
  status: DeviceStatus;
  created_at: string;
  updated_at: string;
  last_seen_at?: string;
  meta?: Record<string, unknown>;
}

const VALID_DEVICE_TYPES: DeviceType[] = ['physical', 'virtual', 'container', 'cloud'];
const VALID_DEVICE_STATUSES: DeviceStatus[] = ['provisioning', 'online', 'offline', 'maintenance', 'error', 'decommissioned'];

export class DeviceEntity {
  private constructor(private readonly props: DeviceEntityProps) {
    this.validate();
  }

  static create(props: DeviceEntityProps): DeviceEntity {
    return new DeviceEntity(props);
  }

  static fromJSON(json: DeviceEntityJSON): DeviceEntity {
    return DeviceEntity.create({
      device_id: json.device_id,
      name: json.name,
      display_name: json.display_name,
      description: json.description,
      server_id: json.server_id,
      type: json.type,
      provider: json.provider,
      specs: json.specs,
      network: json.network,
      location: json.location,
      status: json.status,
      created_at: new Date(json.created_at),
      updated_at: new Date(json.updated_at),
      last_seen_at: json.last_seen_at ? new Date(json.last_seen_at) : undefined,
      meta: json.meta,
    });
  }

  private validate(): void {
    // Validate device_id
    if (!this.props.device_id || this.props.device_id.trim() === '') {
      throw new Error('Device ID cannot be empty');
    }

    // Validate name
    if (!this.props.name || this.props.name.trim() === '') {
      throw new Error('Device name cannot be empty');
    }
    if (this.props.name.length > 100) {
      throw new Error('Device name cannot exceed 100 characters');
    }

    // Validate display_name if provided
    if (this.props.display_name && this.props.display_name.length > 200) {
      throw new Error('Device display name cannot exceed 200 characters');
    }

    // Validate server_id
    if (!this.props.server_id || this.props.server_id.trim() === '') {
      throw new Error('Server ID cannot be empty');
    }

    // Validate type
    if (!VALID_DEVICE_TYPES.includes(this.props.type)) {
      throw new Error(`Invalid device type: ${this.props.type}. Must be one of: ${VALID_DEVICE_TYPES.join(', ')}`);
    }

    // Validate status
    if (!VALID_DEVICE_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid device status: ${this.props.status}. Must be one of: ${VALID_DEVICE_STATUSES.join(', ')}`);
    }

    // Validate specs
    if (this.props.specs.cpu_cores <= 0) {
      throw new Error('CPU cores must be greater than 0');
    }
    if (this.props.specs.memory_gb <= 0) {
      throw new Error('Memory must be greater than 0');
    }
    if (this.props.specs.storage_gb <= 0) {
      throw new Error('Storage must be greater than 0');
    }
    if (this.props.specs.gpu_count !== undefined && this.props.specs.gpu_count < 0) {
      throw new Error('GPU count cannot be negative');
    }
  }

  // --- Getters ---

  get device_id(): string { return this.props.device_id; }
  get name(): string { return this.props.name; }
  get display_name(): string | undefined { return this.props.display_name; }
  get description(): string | undefined { return this.props.description; }
  get server_id(): string { return this.props.server_id; }
  get type(): DeviceType { return this.props.type; }
  get provider(): string | undefined { return this.props.provider; }
  get specs(): DeviceSpecs { return this.props.specs; }
  get network(): DeviceNetwork | undefined { return this.props.network; }
  get location(): DeviceLocation | undefined { return this.props.location; }
  get status(): DeviceStatus { return this.props.status; }
  get created_at(): Date { return this.props.created_at; }
  get updated_at(): Date { return this.props.updated_at; }
  get last_seen_at(): Date | undefined { return this.props.last_seen_at; }
  get meta(): Record<string, unknown> | undefined { return this.props.meta; }

  // --- Status checks ---

  isOnline(): boolean { return this.props.status === 'online'; }
  isOffline(): boolean { return this.props.status === 'offline'; }
  isProvisioning(): boolean { return this.props.status === 'provisioning'; }
  isInMaintenance(): boolean { return this.props.status === 'maintenance'; }
  hasError(): boolean { return this.props.status === 'error'; }
  isDecommissioned(): boolean { return this.props.status === 'decommissioned'; }

  canRunAgents(): boolean {
    return this.props.status === 'online';
  }

  // --- Type checks ---

  isPhysical(): boolean { return this.props.type === 'physical'; }
  isVirtual(): boolean { return this.props.type === 'virtual'; }
  isContainer(): boolean { return this.props.type === 'container'; }
  isCloud(): boolean { return this.props.type === 'cloud'; }

  // --- Business methods ---

  updateStatus(status: DeviceStatus): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      status,
      updated_at: new Date(),
    });
  }

  markOnline(): DeviceEntity {
    if (this.props.status === 'decommissioned') {
      throw new Error('Cannot bring a decommissioned device online');
    }
    return DeviceEntity.create({
      ...this.props,
      status: 'online',
      last_seen_at: new Date(),
      updated_at: new Date(),
    });
  }

  markOffline(): DeviceEntity {
    if (this.props.status === 'decommissioned') {
      throw new Error('Cannot mark a decommissioned device as offline');
    }
    return DeviceEntity.create({
      ...this.props,
      status: 'offline',
      updated_at: new Date(),
    });
  }

  enterMaintenance(): DeviceEntity {
    if (this.props.status === 'decommissioned') {
      throw new Error('Cannot put a decommissioned device into maintenance');
    }
    return DeviceEntity.create({
      ...this.props,
      status: 'maintenance',
      updated_at: new Date(),
    });
  }

  exitMaintenance(): DeviceEntity {
    if (this.props.status !== 'maintenance') {
      throw new Error('Device is not in maintenance mode');
    }
    return DeviceEntity.create({
      ...this.props,
      status: 'online',
      last_seen_at: new Date(),
      updated_at: new Date(),
    });
  }

  reportError(): DeviceEntity {
    if (this.props.status === 'decommissioned') {
      throw new Error('Cannot report error on a decommissioned device');
    }
    return DeviceEntity.create({
      ...this.props,
      status: 'error',
      updated_at: new Date(),
    });
  }

  decommission(): DeviceEntity {
    if (this.props.status === 'decommissioned') {
      throw new Error('Device is already decommissioned');
    }
    return DeviceEntity.create({
      ...this.props,
      status: 'decommissioned',
      updated_at: new Date(),
    });
  }

  updateHeartbeat(): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      last_seen_at: new Date(),
      updated_at: new Date(),
    });
  }

  updateSpecs(specs: Partial<DeviceSpecs>): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      specs: {
        ...this.props.specs,
        ...specs,
      },
      updated_at: new Date(),
    });
  }

  updateNetwork(network: DeviceNetwork): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      network,
      updated_at: new Date(),
    });
  }

  updateLocation(location: DeviceLocation): DeviceEntity {
    return DeviceEntity.create({
      ...this.props,
      location,
      updated_at: new Date(),
    });
  }

  // --- Serialization ---

  toJSON(): DeviceEntityJSON {
    return {
      device_id: this.props.device_id,
      name: this.props.name,
      display_name: this.props.display_name,
      description: this.props.description,
      server_id: this.props.server_id,
      type: this.props.type,
      provider: this.props.provider,
      specs: this.props.specs,
      network: this.props.network,
      location: this.props.location,
      status: this.props.status,
      created_at: this.props.created_at.toISOString(),
      updated_at: this.props.updated_at.toISOString(),
      last_seen_at: this.props.last_seen_at?.toISOString(),
      meta: this.props.meta,
    };
  }

  // --- Equality ---

  equals(other: DeviceEntity): boolean {
    return this.props.device_id === other.props.device_id;
  }
}
