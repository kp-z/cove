"use strict";
/**
 * DeviceService - Device 管理业务逻辑
 *
 * 职责：
 * - 创建和管理设备
 * - 设备查询
 * - 设备状态管理（上线、下线、维护、停用）
 * - 设备规格和网络配置管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceService = void 0;
const device_entity_1 = require("../../../domain/models/device/device.entity");
const device_errors_1 = require("./device.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class DeviceService {
    deviceRepository;
    eventBus;
    logger;
    constructor(deviceRepository, eventBus, logger) {
        this.deviceRepository = deviceRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async createDevice(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Creating new device', { name: dto.name, realmId: dto.realmId });
        // Check if device name already exists for this server
        const existing = await this.deviceRepository.findByServer(dto.realmId);
        if (existing.some(d => d.name === dto.name)) {
            throw new device_errors_1.DeviceNameAlreadyExistsError(dto.name, context.userId);
        }
        const deviceId = this.generateDeviceId();
        const device = device_entity_1.DeviceEntity.create({
            device_id: deviceId,
            name: dto.name,
            display_name: dto.displayName,
            description: dto.description,
            realm_id: dto.realmId,
            type: dto.type,
            provider: dto.provider,
            specs: dto.specs,
            network: dto.network,
            location: dto.location,
            status: 'provisioning',
            created_at: new Date(),
            updated_at: new Date(),
            meta: {},
        });
        await this.deviceRepository.save(device, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'device.created',
            aggregateId: deviceId,
            aggregateType: 'Device',
            occurredAt: new Date(),
            payload: {
                deviceId,
                name: dto.name,
                realmId: dto.realmId,
                type: dto.type,
            },
        });
        this.logger.info('Device created successfully', { deviceId });
        return device;
    }
    async getDeviceById(deviceId) {
        const device = await this.deviceRepository.findById(deviceId);
        if (!device) {
            throw new device_errors_1.DeviceNotFoundError(deviceId);
        }
        return device;
    }
    async getDevicesByServer(realmId) {
        return await this.deviceRepository.findByServer(realmId);
    }
    async getDevicesByStatus(status) {
        return await this.deviceRepository.findByStatus(status);
    }
    async getDevicesByServerAndStatus(realmId, status) {
        return await this.deviceRepository.findByServerAndStatus(realmId, status);
    }
    async getAllDevices() {
        return await this.deviceRepository.findAll();
    }
    async updateDevice(deviceId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating device', { deviceId });
        let device = await this.getDeviceById(deviceId);
        if (dto.name !== undefined) {
            // Check if new name already exists for this server
            const existing = await this.deviceRepository.findByServer(device.realm_id);
            const duplicateDevice = existing.find(d => d.name === dto.name && d.device_id !== deviceId);
            if (duplicateDevice) {
                throw new device_errors_1.DeviceNameAlreadyExistsError(dto.name, context.userId);
            }
        }
        // Handle status transitions
        if (dto.status !== undefined && dto.status !== device.status) {
            switch (dto.status) {
                case 'online':
                    device = device.markOnline();
                    break;
                case 'offline':
                    device = device.markOffline();
                    break;
                case 'maintenance':
                    device = device.enterMaintenance();
                    break;
                case 'decommissioned':
                    device = device.decommission();
                    break;
                default:
                    // For 'provisioning' and 'error', update directly
                    break;
            }
        }
        // Build update object for other fields
        const updates = {};
        if (dto.name !== undefined)
            updates.name = dto.name;
        if (dto.displayName !== undefined)
            updates.display_name = dto.displayName;
        if (dto.description !== undefined)
            updates.description = dto.description;
        if (dto.provider !== undefined)
            updates.provider = dto.provider;
        if (dto.status !== undefined && ['provisioning', 'error'].includes(dto.status)) {
            updates.status = dto.status;
        }
        // Apply updates if any
        if (Object.keys(updates).length > 0) {
            const json = device.toJSON();
            device = device_entity_1.DeviceEntity.fromJSON({
                ...json,
                ...updates,
                updated_at: new Date().toISOString(),
            });
        }
        await this.deviceRepository.update(device, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'device.updated',
            aggregateId: deviceId,
            aggregateType: 'Device',
            occurredAt: new Date(),
            payload: { deviceId, changes: dto },
        });
        this.logger.info('Device updated successfully', { deviceId });
        return device;
    }
    async updateDeviceSpecs(deviceId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating device specs', { deviceId });
        let device = await this.getDeviceById(deviceId);
        const specsUpdate = {};
        if (dto.cpuCores !== undefined)
            specsUpdate.cpu_cores = dto.cpuCores;
        if (dto.memoryGb !== undefined)
            specsUpdate.memory_gb = dto.memoryGb;
        if (dto.storageGb !== undefined)
            specsUpdate.storage_gb = dto.storageGb;
        if (dto.gpuCount !== undefined)
            specsUpdate.gpu_count = dto.gpuCount;
        if (dto.gpuModel !== undefined)
            specsUpdate.gpu_model = dto.gpuModel;
        device = device.updateSpecs(specsUpdate);
        await this.deviceRepository.update(device, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'device.specs_updated',
            aggregateId: deviceId,
            aggregateType: 'Device',
            occurredAt: new Date(),
            payload: { deviceId, specs: dto },
        });
        this.logger.info('Device specs updated successfully', { deviceId });
        return device;
    }
    async updateDeviceNetwork(deviceId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating device network', { deviceId });
        let device = await this.getDeviceById(deviceId);
        const networkUpdate = {
            hostname: dto.hostname,
            ip_address: dto.ipAddress,
            port: dto.port,
            protocol: dto.protocol,
            domain: dto.domain,
        };
        device = device.updateNetwork(networkUpdate);
        await this.deviceRepository.update(device, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'device.network_updated',
            aggregateId: deviceId,
            aggregateType: 'Device',
            occurredAt: new Date(),
            payload: { deviceId, network: dto },
        });
        this.logger.info('Device network updated successfully', { deviceId });
        return device;
    }
    async updateDeviceLocation(deviceId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating device location', { deviceId });
        let device = await this.getDeviceById(deviceId);
        const locationUpdate = {
            datacenter: dto.datacenter,
            region: dto.region,
            zone: dto.zone,
            rack: dto.rack,
        };
        device = device.updateLocation(locationUpdate);
        await this.deviceRepository.update(device, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'device.location_updated',
            aggregateId: deviceId,
            aggregateType: 'Device',
            occurredAt: new Date(),
            payload: { deviceId, location: dto },
        });
        this.logger.info('Device location updated successfully', { deviceId });
        return device;
    }
    async updateDeviceHeartbeat(deviceId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        let device = await this.getDeviceById(deviceId);
        device = device.updateHeartbeat();
        await this.deviceRepository.update(device, context.realmId);
        // No event for heartbeat updates (too frequent)
        return device;
    }
    async deleteDevice(deviceId) {
        (0, realm_context_store_1.getRealmContext)(); // Validate context exists
        this.logger.info('Deleting device', { deviceId });
        const device = await this.getDeviceById(deviceId);
        await this.deviceRepository.delete(deviceId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'device.deleted',
            aggregateId: deviceId,
            aggregateType: 'Device',
            occurredAt: new Date(),
            payload: { deviceId, realmId: device.realm_id },
        });
        this.logger.info('Device deleted successfully', { deviceId });
    }
    // --- Helper methods ---
    generateDeviceId() {
        return `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    generateEventId() {
        return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    async publishEvent(event) {
        try {
            await this.eventBus.publish(event);
        }
        catch (error) {
            this.logger.error('Failed to publish event', error, {
                eventType: event.constructor.name
            });
            // Don't throw - event publishing failure shouldn't break the operation
        }
    }
}
exports.DeviceService = DeviceService;
