"use strict";
/**
 * DeviceEntity - 物理设备/计算资源实体
 *
 * 职责：
 * - 管理物理设备的资源配置（CPU、内存、存储、GPU）
 * - 管理设备的网络配置
 * - 跟踪设备状态和健康状况
 * - 关联到 Realm（工作空间）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceEntity = void 0;
const VALID_DEVICE_TYPES = ['physical', 'virtual', 'container', 'cloud'];
const VALID_DEVICE_STATUSES = ['provisioning', 'online', 'offline', 'maintenance', 'error', 'decommissioned'];
class DeviceEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new DeviceEntity(props);
    }
    static fromJSON(json) {
        return DeviceEntity.create({
            device_id: json.device_id,
            name: json.name,
            display_name: json.display_name,
            description: json.description,
            realm_id: json.realm_id,
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
    validate() {
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
        // Validate realm_id
        if (!this.props.realm_id || this.props.realm_id.trim() === '') {
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
    get device_id() { return this.props.device_id; }
    get name() { return this.props.name; }
    get display_name() { return this.props.display_name; }
    get description() { return this.props.description; }
    get realm_id() { return this.props.realm_id; }
    get type() { return this.props.type; }
    get provider() { return this.props.provider; }
    get specs() { return this.props.specs; }
    get network() { return this.props.network; }
    get location() { return this.props.location; }
    get status() { return this.props.status; }
    get created_at() { return this.props.created_at; }
    get updated_at() { return this.props.updated_at; }
    get last_seen_at() { return this.props.last_seen_at; }
    get meta() { return this.props.meta; }
    // --- Status checks ---
    isOnline() { return this.props.status === 'online'; }
    isOffline() { return this.props.status === 'offline'; }
    isProvisioning() { return this.props.status === 'provisioning'; }
    isInMaintenance() { return this.props.status === 'maintenance'; }
    hasError() { return this.props.status === 'error'; }
    isDecommissioned() { return this.props.status === 'decommissioned'; }
    canRunAgents() {
        return this.props.status === 'online';
    }
    // --- Type checks ---
    isPhysical() { return this.props.type === 'physical'; }
    isVirtual() { return this.props.type === 'virtual'; }
    isContainer() { return this.props.type === 'container'; }
    isCloud() { return this.props.type === 'cloud'; }
    // --- Business methods ---
    updateStatus(status) {
        return DeviceEntity.create({
            ...this.props,
            status,
            updated_at: new Date(),
        });
    }
    markOnline() {
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
    markOffline() {
        if (this.props.status === 'decommissioned') {
            throw new Error('Cannot mark a decommissioned device as offline');
        }
        return DeviceEntity.create({
            ...this.props,
            status: 'offline',
            updated_at: new Date(),
        });
    }
    enterMaintenance() {
        if (this.props.status === 'decommissioned') {
            throw new Error('Cannot put a decommissioned device into maintenance');
        }
        return DeviceEntity.create({
            ...this.props,
            status: 'maintenance',
            updated_at: new Date(),
        });
    }
    exitMaintenance() {
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
    reportError() {
        if (this.props.status === 'decommissioned') {
            throw new Error('Cannot report error on a decommissioned device');
        }
        return DeviceEntity.create({
            ...this.props,
            status: 'error',
            updated_at: new Date(),
        });
    }
    decommission() {
        if (this.props.status === 'decommissioned') {
            throw new Error('Device is already decommissioned');
        }
        return DeviceEntity.create({
            ...this.props,
            status: 'decommissioned',
            updated_at: new Date(),
        });
    }
    updateHeartbeat() {
        return DeviceEntity.create({
            ...this.props,
            last_seen_at: new Date(),
            updated_at: new Date(),
        });
    }
    updateSpecs(specs) {
        return DeviceEntity.create({
            ...this.props,
            specs: {
                ...this.props.specs,
                ...specs,
            },
            updated_at: new Date(),
        });
    }
    updateNetwork(network) {
        return DeviceEntity.create({
            ...this.props,
            network,
            updated_at: new Date(),
        });
    }
    updateLocation(location) {
        return DeviceEntity.create({
            ...this.props,
            location,
            updated_at: new Date(),
        });
    }
    // --- Serialization ---
    toJSON() {
        return {
            device_id: this.props.device_id,
            name: this.props.name,
            display_name: this.props.display_name,
            description: this.props.description,
            realm_id: this.props.realm_id,
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
    equals(other) {
        return this.props.device_id === other.props.device_id;
    }
}
exports.DeviceEntity = DeviceEntity;
