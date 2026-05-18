/**
 * Device Router Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deviceRouter } from './device.router';
import { DeviceService } from '../../../application/services/device/device.service';
import { DeviceEntity } from '../../../domain/models/device/device.entity';
import { DeviceNotFoundError } from '../../../application/services/device/device.errors';

describe('deviceRouter', () => {
  let mockDeviceService: any;
  let router: any;
  let caller: any;

  const mockContext = {
    serverId: 'test-server',
    userId: 'test-user',
  };

  const mockSpecs = {
    cpu_cores: 8,
    memory_gb: 16,
    storage_gb: 512,
  };

  beforeEach(() => {
    mockDeviceService = {
      registerDevice: vi.fn(),
      getDeviceById: vi.fn(),
      getDevicesByServer: vi.fn(),
      getDevicesByStatus: vi.fn(),
      getDevicesByType: vi.fn(),
      updateDevice: vi.fn(),
      markOnline: vi.fn(),
      markOffline: vi.fn(),
      markMaintenance: vi.fn(),
      decommissionDevice: vi.fn(),
      deleteDevice: vi.fn(),
    };

    router = deviceRouter(mockDeviceService as DeviceService);
    caller = router.createCaller(mockContext);
  });

  describe('register', () => {
    it('should register a new device', async () => {
      const input = {
        name: 'test-device',
        displayName: 'Test Device',
        description: 'A test device',
        type: 'physical' as const,
        provider: 'on-premise',
        specs: mockSpecs,
      };

      const mockDevice = DeviceEntity.create({
        device_id: 'device-1',
        server_id: 'test-server',
        name: input.name,
        display_name: input.displayName,
        description: input.description,
        type: input.type,
        provider: input.provider,
        specs: input.specs,
        status: 'provisioning',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockDeviceService.registerDevice.mockResolvedValue(mockDevice);

      const result = await caller.register(input);

      expect(result).toHaveProperty('device_id', 'device-1');
      expect(result).toHaveProperty('name', 'test-device');
      expect(mockDeviceService.registerDevice).toHaveBeenCalledWith(input);
    });
  });

  describe('list', () => {
    it('should list all devices', async () => {
      const mockDevices = [
        DeviceEntity.create({
          device_id: 'device-1',
          server_id: 'test-server',
          name: 'device-1',
          display_name: 'Device 1',
          type: 'physical',
          specs: mockSpecs,
          status: 'online',
          created_at: new Date(),
          updated_at: new Date(),
        }),
        DeviceEntity.create({
          device_id: 'device-2',
          server_id: 'test-server',
          name: 'device-2',
          display_name: 'Device 2',
          type: 'virtual',
          specs: mockSpecs,
          status: 'offline',
          created_at: new Date(),
          updated_at: new Date(),
        }),
      ];

      mockDeviceService.getDevicesByServer.mockResolvedValue(mockDevices);

      const result = await caller.list();

      expect(result.devices).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockDeviceService.getDevicesByServer).toHaveBeenCalled();
    });

    it('should list devices by status', async () => {
      const mockDevices = [
        DeviceEntity.create({
          device_id: 'device-1',
          server_id: 'test-server',
          name: 'device-1',
          display_name: 'Device 1',
          type: 'physical',
          specs: mockSpecs,
          status: 'online',
          created_at: new Date(),
          updated_at: new Date(),
        }),
      ];

      mockDeviceService.getDevicesByStatus.mockResolvedValue(mockDevices);

      const result = await caller.list({ status: 'online' });

      expect(result.devices).toHaveLength(1);
      expect(mockDeviceService.getDevicesByStatus).toHaveBeenCalledWith('online');
    });

    it('should list devices by type', async () => {
      const mockDevices = [
        DeviceEntity.create({
          device_id: 'device-1',
          server_id: 'test-server',
          name: 'device-1',
          display_name: 'Device 1',
          type: 'physical',
          specs: mockSpecs,
          status: 'online',
          created_at: new Date(),
          updated_at: new Date(),
        }),
      ];

      mockDeviceService.getDevicesByType.mockResolvedValue(mockDevices);

      const result = await caller.list({ type: 'physical' });

      expect(result.devices).toHaveLength(1);
      expect(mockDeviceService.getDevicesByType).toHaveBeenCalledWith('physical');
    });
  });

  describe('getById', () => {
    it('should get device by id', async () => {
      const mockDevice = DeviceEntity.create({
        device_id: 'device-1',
        server_id: 'test-server',
        name: 'test-device',
        display_name: 'Test Device',
        type: 'physical',
        specs: mockSpecs,
        status: 'online',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockDeviceService.getDeviceById.mockResolvedValue(mockDevice);

      const result = await caller.getById({ deviceId: 'device-1' });

      expect(result).toHaveProperty('device_id', 'device-1');
      expect(mockDeviceService.getDeviceById).toHaveBeenCalledWith('device-1');
    });

    it('should throw NOT_FOUND when device not found', async () => {
      mockDeviceService.getDeviceById.mockRejectedValue(new DeviceNotFoundError('device-1'));

      await expect(caller.getById({ deviceId: 'device-1' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update device', async () => {
      const mockDevice = DeviceEntity.create({
        device_id: 'device-1',
        server_id: 'test-server',
        name: 'test-device',
        display_name: 'Updated Device',
        type: 'physical',
        specs: mockSpecs,
        status: 'online',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockDeviceService.updateDevice.mockResolvedValue(mockDevice);

      const result = await caller.update({
        deviceId: 'device-1',
        data: { displayName: 'Updated Device' },
      });

      expect(result).toHaveProperty('display_name', 'Updated Device');
      expect(mockDeviceService.updateDevice).toHaveBeenCalledWith('device-1', { displayName: 'Updated Device' });
    });
  });

  describe('markOnline', () => {
    it('should mark device online', async () => {
      const mockDevice = DeviceEntity.create({
        device_id: 'device-1',
        server_id: 'test-server',
        name: 'test-device',
        display_name: 'Test Device',
        type: 'physical',
        specs: mockSpecs,
        status: 'online',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockDeviceService.markOnline.mockResolvedValue(mockDevice);

      const result = await caller.markOnline({ deviceId: 'device-1' });

      expect(result).toHaveProperty('status', 'online');
      expect(mockDeviceService.markOnline).toHaveBeenCalledWith('device-1');
    });
  });

  describe('markOffline', () => {
    it('should mark device offline', async () => {
      const mockDevice = DeviceEntity.create({
        device_id: 'device-1',
        server_id: 'test-server',
        name: 'test-device',
        display_name: 'Test Device',
        type: 'physical',
        specs: mockSpecs,
        status: 'offline',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockDeviceService.markOffline.mockResolvedValue(mockDevice);

      const result = await caller.markOffline({ deviceId: 'device-1' });

      expect(result).toHaveProperty('status', 'offline');
      expect(mockDeviceService.markOffline).toHaveBeenCalledWith('device-1');
    });
  });

  describe('markMaintenance', () => {
    it('should mark device in maintenance', async () => {
      const mockDevice = DeviceEntity.create({
        device_id: 'device-1',
        server_id: 'test-server',
        name: 'test-device',
        display_name: 'Test Device',
        type: 'physical',
        specs: mockSpecs,
        status: 'maintenance',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockDeviceService.markMaintenance.mockResolvedValue(mockDevice);

      const result = await caller.markMaintenance({ deviceId: 'device-1' });

      expect(result).toHaveProperty('status', 'maintenance');
      expect(mockDeviceService.markMaintenance).toHaveBeenCalledWith('device-1');
    });
  });

  describe('decommission', () => {
    it('should decommission device', async () => {
      const mockDevice = DeviceEntity.create({
        device_id: 'device-1',
        server_id: 'test-server',
        name: 'test-device',
        display_name: 'Test Device',
        type: 'physical',
        specs: mockSpecs,
        status: 'decommissioned',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockDeviceService.decommissionDevice.mockResolvedValue(mockDevice);

      const result = await caller.decommission({ deviceId: 'device-1' });

      expect(result).toHaveProperty('status', 'decommissioned');
      expect(mockDeviceService.decommissionDevice).toHaveBeenCalledWith('device-1');
    });
  });

  describe('delete', () => {
    it('should delete device', async () => {
      mockDeviceService.deleteDevice.mockResolvedValue(undefined);

      const result = await caller.delete({ deviceId: 'device-1' });

      expect(result).toEqual({ success: true });
      expect(mockDeviceService.deleteDevice).toHaveBeenCalledWith('device-1');
    });
  });
});
