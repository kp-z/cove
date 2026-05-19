import { describe, it, expect } from 'vitest';
import { DeviceEntity, DeviceStatus, DeviceType } from '../device.entity';

describe('DeviceEntity', () => {
  const validProps = {
    device_id: 'device-001',
    name: 'prod-server-01',
    display_name: 'Production Server 01',
    description: 'Main production server',
    server_id: 'server-001',
    type: 'physical' as DeviceType,
    provider: 'on-premise',
    specs: {
      cpu_cores: 16,
      memory_gb: 64,
      storage_gb: 2000,
      gpu_count: 2,
      gpu_model: 'NVIDIA A100',
    },
    network: {
      hostname: 'prod-01.example.com',
      ip_address: '10.0.1.100',
      port: 443,
      protocol: 'https' as const,
      domain: 'api.example.com',
    },
    location: {
      datacenter: 'DC-US-WEST',
      region: 'us-west-2',
      zone: 'us-west-2a',
      rack: 'R-42',
    },
    status: 'online' as DeviceStatus,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-05-18T00:00:00Z'),
    last_seen_at: new Date('2026-05-18T16:00:00Z'),
    meta: {
      tags: ['production', 'critical'],
      cost_center: 'engineering',
    },
  };

  describe('create', () => {
    it('should create a valid DeviceEntity', () => {
      const device = DeviceEntity.create(validProps);

      expect(device.device_id).toBe(validProps.device_id);
      expect(device.name).toBe(validProps.name);
      expect(device.display_name).toBe(validProps.display_name);
      expect(device.description).toBe(validProps.description);
      expect(device.server_id).toBe(validProps.server_id);
      expect(device.type).toBe(validProps.type);
      expect(device.provider).toBe(validProps.provider);
      expect(device.specs).toEqual(validProps.specs);
      expect(device.network).toEqual(validProps.network);
      expect(device.location).toEqual(validProps.location);
      expect(device.status).toBe(validProps.status);
      expect(device.created_at).toEqual(validProps.created_at);
      expect(device.updated_at).toEqual(validProps.updated_at);
      expect(device.last_seen_at).toEqual(validProps.last_seen_at);
      expect(device.meta).toEqual(validProps.meta);
    });

    it('should create with minimal required fields', () => {
      const minimalProps = {
        device_id: 'device-002',
        name: 'dev-server',
        server_id: 'server-001',
        type: 'virtual' as DeviceType,
        specs: {
          cpu_cores: 4,
          memory_gb: 16,
          storage_gb: 500,
        },
        status: 'online' as DeviceStatus,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const device = DeviceEntity.create(minimalProps);

      expect(device.device_id).toBe(minimalProps.device_id);
      expect(device.name).toBe(minimalProps.name);
      expect(device.display_name).toBeUndefined();
      expect(device.description).toBeUndefined();
      expect(device.provider).toBeUndefined();
      expect(device.network).toBeUndefined();
      expect(device.location).toBeUndefined();
      expect(device.last_seen_at).toBeUndefined();
      expect(device.meta).toBeUndefined();
    });

    it('should throw error for invalid device_id', () => {
      expect(() =>
        DeviceEntity.create({ ...validProps, device_id: '' })
      ).toThrow('Device ID cannot be empty');
    });

    it('should throw error for invalid name', () => {
      expect(() =>
        DeviceEntity.create({ ...validProps, name: '' })
      ).toThrow('Device name cannot be empty');

      expect(() =>
        DeviceEntity.create({ ...validProps, name: 'a'.repeat(101) })
      ).toThrow('Device name cannot exceed 100 characters');
    });

    it('should throw error for invalid display_name', () => {
      expect(() =>
        DeviceEntity.create({ ...validProps, display_name: 'a'.repeat(201) })
      ).toThrow('Device display name cannot exceed 200 characters');
    });

    it('should throw error for invalid server_id', () => {
      expect(() =>
        DeviceEntity.create({ ...validProps, server_id: '' })
      ).toThrow('Server ID cannot be empty');
    });

    it('should throw error for invalid type', () => {
      expect(() =>
        DeviceEntity.create({ ...validProps, type: 'invalid' as any })
      ).toThrow('Invalid device type: invalid');
    });

    it('should throw error for invalid status', () => {
      expect(() =>
        DeviceEntity.create({ ...validProps, status: 'invalid' as any })
      ).toThrow('Invalid device status: invalid');
    });

    it('should throw error for invalid specs', () => {
      expect(() =>
        DeviceEntity.create({
          ...validProps,
          specs: { ...validProps.specs, cpu_cores: 0 },
        })
      ).toThrow('CPU cores must be greater than 0');

      expect(() =>
        DeviceEntity.create({
          ...validProps,
          specs: { ...validProps.specs, memory_gb: -1 },
        })
      ).toThrow('Memory must be greater than 0');

      expect(() =>
        DeviceEntity.create({
          ...validProps,
          specs: { ...validProps.specs, storage_gb: 0 },
        })
      ).toThrow('Storage must be greater than 0');

      expect(() =>
        DeviceEntity.create({
          ...validProps,
          specs: { ...validProps.specs, gpu_count: -1 },
        })
      ).toThrow('GPU count cannot be negative');
    });
  });

  describe('status checks', () => {
    it('should check if device is online', () => {
      const device = DeviceEntity.create(validProps);
      expect(device.isOnline()).toBe(true);
      expect(device.isOffline()).toBe(false);
    });

    it('should check if device is offline', () => {
      const device = DeviceEntity.create({ ...validProps, status: 'offline' });
      expect(device.isOffline()).toBe(true);
      expect(device.isOnline()).toBe(false);
    });

    it('should check if device can run agents', () => {
      const onlineDevice = DeviceEntity.create(validProps);
      expect(onlineDevice.canRunAgents()).toBe(true);

      const offlineDevice = DeviceEntity.create({ ...validProps, status: 'offline' });
      expect(offlineDevice.canRunAgents()).toBe(false);
    });
  });

  describe('type checks', () => {
    it('should check device type', () => {
      const physicalDevice = DeviceEntity.create(validProps);
      expect(physicalDevice.isPhysical()).toBe(true);
      expect(physicalDevice.isVirtual()).toBe(false);

      const virtualDevice = DeviceEntity.create({ ...validProps, type: 'virtual' });
      expect(virtualDevice.isVirtual()).toBe(true);
      expect(virtualDevice.isPhysical()).toBe(false);

      const containerDevice = DeviceEntity.create({ ...validProps, type: 'container' });
      expect(containerDevice.isContainer()).toBe(true);

      const cloudDevice = DeviceEntity.create({ ...validProps, type: 'cloud' });
      expect(cloudDevice.isCloud()).toBe(true);
    });
  });

  describe('markOnline', () => {
    it('should mark device as online', () => {
      const device = DeviceEntity.create({ ...validProps, status: 'offline' });
      const onlineDevice = device.markOnline();

      expect(onlineDevice.status).toBe('online');
      expect(onlineDevice.last_seen_at).toBeDefined();
      expect(onlineDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    });

    it('should throw error when marking decommissioned device online', () => {
      const device = DeviceEntity.create({ ...validProps, status: 'decommissioned' });
      expect(() => device.markOnline()).toThrow('Cannot bring a decommissioned device online');
    });
  });

  describe('markOffline', () => {
    it('should mark device as offline', () => {
      const device = DeviceEntity.create(validProps);
      const offlineDevice = device.markOffline();

      expect(offlineDevice.status).toBe('offline');
      expect(offlineDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    });

    it('should throw error when marking decommissioned device offline', () => {
      const device = DeviceEntity.create({ ...validProps, status: 'decommissioned' });
      expect(() => device.markOffline()).toThrow('Cannot mark a decommissioned device as offline');
    });
  });

  describe('maintenance', () => {
    it('should enter maintenance mode', () => {
      const device = DeviceEntity.create(validProps);
      const maintenanceDevice = device.enterMaintenance();

      expect(maintenanceDevice.status).toBe('maintenance');
      expect(maintenanceDevice.isInMaintenance()).toBe(true);
      expect(maintenanceDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    });

    it('should exit maintenance mode', () => {
      const device = DeviceEntity.create({ ...validProps, status: 'maintenance' });
      const onlineDevice = device.exitMaintenance();

      expect(onlineDevice.status).toBe('online');
      expect(onlineDevice.last_seen_at).toBeDefined();
      expect(onlineDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    });

    it('should throw error when exiting maintenance on non-maintenance device', () => {
      const device = DeviceEntity.create(validProps);
      expect(() => device.exitMaintenance()).toThrow('Device is not in maintenance mode');
    });

    it('should throw error when entering maintenance on decommissioned device', () => {
      const device = DeviceEntity.create({ ...validProps, status: 'decommissioned' });
      expect(() => device.enterMaintenance()).toThrow('Cannot put a decommissioned device into maintenance');
    });
  });

  describe('reportError', () => {
    it('should report error', () => {
      const device = DeviceEntity.create(validProps);
      const errorDevice = device.reportError();

      expect(errorDevice.status).toBe('error');
      expect(errorDevice.hasError()).toBe(true);
      expect(errorDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    });

    it('should throw error when reporting error on decommissioned device', () => {
      const device = DeviceEntity.create({ ...validProps, status: 'decommissioned' });
      expect(() => device.reportError()).toThrow('Cannot report error on a decommissioned device');
    });
  });

  describe('decommission', () => {
    it('should decommission device', () => {
      const device = DeviceEntity.create(validProps);
      const decommissionedDevice = device.decommission();

      expect(decommissionedDevice.status).toBe('decommissioned');
      expect(decommissionedDevice.isDecommissioned()).toBe(true);
      expect(decommissionedDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    });

    it('should throw error when decommissioning already decommissioned device', () => {
      const device = DeviceEntity.create({ ...validProps, status: 'decommissioned' });
      expect(() => device.decommission()).toThrow('Device is already decommissioned');
    });
  });

  describe('updateHeartbeat', () => {
    it('should update heartbeat', () => {
      const device = DeviceEntity.create(validProps);
      const beforeUpdate = new Date();
      const updatedDevice = device.updateHeartbeat();

      expect(updatedDevice.last_seen_at).toBeDefined();
      // The new last_seen_at should be at or after the time we called updateHeartbeat
      expect(updatedDevice.last_seen_at!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(updatedDevice.updated_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('updateSpecs', () => {
    it('should update specs', () => {
      const device = DeviceEntity.create(validProps);
      const updatedDevice = device.updateSpecs({ cpu_cores: 32, memory_gb: 128 });

      expect(updatedDevice.specs.cpu_cores).toBe(32);
      expect(updatedDevice.specs.memory_gb).toBe(128);
      expect(updatedDevice.specs.storage_gb).toBe(validProps.specs.storage_gb);
      expect(updatedDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    });
  });

  describe('updateNetwork', () => {
    it('should update network', () => {
      const device = DeviceEntity.create(validProps);
      const newNetwork = {
        hostname: 'new-host.example.com',
        ip_address: '10.0.2.200',
        port: 8080,
        protocol: 'https' as const,
      };
      const updatedDevice = device.updateNetwork(newNetwork);

      expect(updatedDevice.network).toEqual(newNetwork);
      expect(updatedDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    });
  });

  describe('updateLocation', () => {
    it('should update location', () => {
      const device = DeviceEntity.create(validProps);
      const newLocation = {
        datacenter: 'DC-EU-CENTRAL',
        region: 'eu-central-1',
        zone: 'eu-central-1a',
      };
      const updatedDevice = device.updateLocation(newLocation);

      expect(updatedDevice.location).toEqual(newLocation);
      expect(updatedDevice.updated_at.getTime()).toBeGreaterThan(device.updated_at.getTime());
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON correctly', () => {
      const device = DeviceEntity.create(validProps);
      const json = device.toJSON();

      expect(json).toEqual({
        device_id: validProps.device_id,
        name: validProps.name,
        display_name: validProps.display_name,
        description: validProps.description,
        server_id: validProps.server_id,
        type: validProps.type,
        provider: validProps.provider,
        specs: validProps.specs,
        network: validProps.network,
        location: validProps.location,
        status: validProps.status,
        created_at: validProps.created_at.toISOString(),
        updated_at: validProps.updated_at.toISOString(),
        last_seen_at: validProps.last_seen_at.toISOString(),
        meta: validProps.meta,
      });
    });

    it('should serialize with undefined optional fields', () => {
      const minimalProps = {
        device_id: 'device-003',
        name: 'minimal-device',
        server_id: 'server-001',
        type: 'container' as DeviceType,
        specs: {
          cpu_cores: 2,
          memory_gb: 8,
          storage_gb: 100,
        },
        status: 'online' as DeviceStatus,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      };

      const device = DeviceEntity.create(minimalProps);
      const json = device.toJSON();

      expect(json.display_name).toBeUndefined();
      expect(json.description).toBeUndefined();
      expect(json.provider).toBeUndefined();
      expect(json.network).toBeUndefined();
      expect(json.location).toBeUndefined();
      expect(json.last_seen_at).toBeUndefined();
      expect(json.meta).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('should return true for devices with same device_id', () => {
      const device1 = DeviceEntity.create(validProps);
      const device2 = DeviceEntity.create(validProps);

      expect(device1.equals(device2)).toBe(true);
    });

    it('should return false for devices with different device_id', () => {
      const device1 = DeviceEntity.create(validProps);
      const device2 = DeviceEntity.create({ ...validProps, device_id: 'device-002' });

      expect(device1.equals(device2)).toBe(false);
    });
  });
});
