import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceService, CreateDeviceDTO, UpdateDeviceDTO, UpdateDeviceSpecsDTO, UpdateDeviceNetworkDTO, UpdateDeviceLocationDTO } from './device.service';
import { DeviceEntity, DeviceSpecs } from '../../../domain/models/device/device.entity';
import {
  DeviceNotFoundError,
  DeviceNameAlreadyExistsError,
} from './device.errors';
import { IDeviceRepository, IEventBus, ILogger } from '../../interfaces';
import { ServerContext } from '../../context/server-context';
import { runWithContext } from '../../context/server-context-store';

describe('DeviceService', () => {
  let service: DeviceService;
  let mockDeviceRepository: IDeviceRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let testContext: ServerContext;

  beforeEach(() => {
    testContext = ServerContext.create('test-server-id', 'user-123');

    mockDeviceRepository = {
      findById: vi.fn(),
      findByServer: vi.fn(),
      findByStatus: vi.fn(),
      findByServerAndStatus: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    } as any;

    mockEventBus = {
      publish: vi.fn(),
    } as any;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as any;

    service = new DeviceService(mockDeviceRepository, mockEventBus, mockLogger);
  });

  describe('createDevice', () => {
    it('should create a new device successfully', async () => {
      const specs: DeviceSpecs = {
        cpu_cores: 8,
        memory_gb: 16,
        storage_gb: 512,
      };

      const dto: CreateDeviceDTO = {
        name: 'test-device',
        displayName: 'Test Device',
        description: 'A test device',
        serverId: 'server-123',
        type: 'physical',
        provider: 'on-premise',
        specs,
      };

      vi.mocked(mockDeviceRepository.findByServer).mockResolvedValue([]);

      const result = await runWithContext(testContext, async () => {
        return await service.createDevice(dto);
      });

      expect(result).toBeInstanceOf(DeviceEntity);
      expect(result.name).toBe(dto.name);
      expect(result.display_name).toBe(dto.displayName);
      expect(result.server_id).toBe(dto.serverId);
      expect(result.type).toBe(dto.type);
      expect(result.status).toBe('provisioning');
      expect(mockDeviceRepository.save).toHaveBeenCalledWith(
        expect.any(DeviceEntity),
        testContext.serverId
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.created',
        })
      );
    });

    it('should throw error when device name already exists for the server', async () => {
      const specs: DeviceSpecs = {
        cpu_cores: 8,
        memory_gb: 16,
        storage_gb: 512,
      };

      const dto: CreateDeviceDTO = {
        name: 'existing-device',
        serverId: 'server-123',
        type: 'physical',
        specs,
      };

      const existingDevice = createTestDevice({ name: 'existing-device', server_id: 'server-123' });
      vi.mocked(mockDeviceRepository.findByServer).mockResolvedValue([existingDevice]);

      await expect(
        runWithContext(testContext, async () => {
          return await service.createDevice(dto);
        })
      ).rejects.toThrow(DeviceNameAlreadyExistsError);
    });
  });

  describe('getDeviceById', () => {
    it('should return device when found', async () => {
      const device = createTestDevice();
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.getDeviceById('device-123');
      });

      expect(result).toBe(device);
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith('device-123');
    });

    it('should throw DeviceNotFoundError when device not found', async () => {
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(null);

      await expect(
        runWithContext(testContext, async () => {
          return await service.getDeviceById('nonexistent');
        })
      ).rejects.toThrow(DeviceNotFoundError);
    });
  });

  describe('getDevicesByServer', () => {
    it('should return all devices for a server', async () => {
      const devices = [createTestDevice(), createTestDevice()];
      vi.mocked(mockDeviceRepository.findByServer).mockResolvedValue(devices);

      const result = await runWithContext(testContext, async () => {
        return await service.getDevicesByServer('server-123');
      });

      expect(result).toEqual(devices);
      expect(mockDeviceRepository.findByServer).toHaveBeenCalledWith('server-123');
    });
  });

  describe('getDevicesByStatus', () => {
    it('should return devices by status', async () => {
      const devices = [createTestDevice({ status: 'online' })];
      vi.mocked(mockDeviceRepository.findByStatus).mockResolvedValue(devices);

      const result = await runWithContext(testContext, async () => {
        return await service.getDevicesByStatus('online');
      });

      expect(result).toEqual(devices);
      expect(mockDeviceRepository.findByStatus).toHaveBeenCalledWith('online');
    });
  });

  describe('updateDevice', () => {
    it('should update device successfully', async () => {
      const device = createTestDevice({ name: 'old-name' });
      const dto: UpdateDeviceDTO = {
        name: 'new-name',
        displayName: 'New Display Name',
      };

      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);
      vi.mocked(mockDeviceRepository.findByServer).mockResolvedValue([]);

      const result = await runWithContext(testContext, async () => {
        return await service.updateDevice('device-123', dto);
      });

      expect(result.name).toBe(dto.name);
      expect(result.display_name).toBe(dto.displayName);
      expect(mockDeviceRepository.update).toHaveBeenCalledWith(
        expect.any(DeviceEntity),
        testContext.serverId
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.updated',
        })
      );
    });

    it('should throw error when new name already exists', async () => {
      const device = createTestDevice({ device_id: 'device-123', name: 'old-name', server_id: 'server-123' });
      const existingDevice = createTestDevice({ device_id: 'device-456', name: 'existing-name', server_id: 'server-123' });
      const dto: UpdateDeviceDTO = {
        name: 'existing-name',
      };

      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);
      vi.mocked(mockDeviceRepository.findByServer).mockResolvedValue([device, existingDevice]);

      await expect(
        runWithContext(testContext, async () => {
          return await service.updateDevice('device-123', dto);
        })
      ).rejects.toThrow(DeviceNameAlreadyExistsError);
    });
  });

  describe('updateDeviceSpecs', () => {
    it('should update device specs successfully', async () => {
      const device = createTestDevice();
      const dto: UpdateDeviceSpecsDTO = {
        cpuCores: 16,
        memoryGb: 32,
      };

      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.updateDeviceSpecs('device-123', dto);
      });

      expect(result.specs.cpu_cores).toBe(16);
      expect(result.specs.memory_gb).toBe(32);
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.specs_updated',
        })
      );
    });
  });

  describe('updateDeviceNetwork', () => {
    it('should update device network successfully', async () => {
      const device = createTestDevice();
      const dto: UpdateDeviceNetworkDTO = {
        hostname: 'device.example.com',
        ipAddress: '192.168.1.100',
        port: 8080,
      };

      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.updateDeviceNetwork('device-123', dto);
      });

      expect(result.network?.hostname).toBe(dto.hostname);
      expect(result.network?.ip_address).toBe(dto.ipAddress);
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.network_updated',
        })
      );
    });
  });

  describe('updateDeviceLocation', () => {
    it('should update device location successfully', async () => {
      const device = createTestDevice();
      const dto: UpdateDeviceLocationDTO = {
        datacenter: 'DC1',
        region: 'us-west',
        zone: 'zone-a',
      };

      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.updateDeviceLocation('device-123', dto);
      });

      expect(result.location?.datacenter).toBe(dto.datacenter);
      expect(result.location?.region).toBe(dto.region);
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.location_updated',
        })
      );
    });
  });

  describe('markDeviceOnline', () => {
    it('should mark device as online', async () => {
      const device = createTestDevice({ status: 'offline' });
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.markDeviceOnline('device-123');
      });

      expect(result.status).toBe('online');
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.online',
        })
      );
    });
  });

  describe('markDeviceOffline', () => {
    it('should mark device as offline', async () => {
      const device = createTestDevice({ status: 'online' });
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.markDeviceOffline('device-123');
      });

      expect(result.status).toBe('offline');
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.offline',
        })
      );
    });
  });

  describe('enterDeviceMaintenance', () => {
    it('should put device into maintenance mode', async () => {
      const device = createTestDevice({ status: 'online' });
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.enterDeviceMaintenance('device-123');
      });

      expect(result.status).toBe('maintenance');
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.maintenance_started',
        })
      );
    });
  });

  describe('exitDeviceMaintenance', () => {
    it('should exit device from maintenance mode', async () => {
      const device = createTestDevice({ status: 'maintenance' });
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.exitDeviceMaintenance('device-123');
      });

      expect(result.status).toBe('online');
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.maintenance_ended',
        })
      );
    });
  });

  describe('reportDeviceError', () => {
    it('should report device error', async () => {
      const device = createTestDevice({ status: 'online' });
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.reportDeviceError('device-123');
      });

      expect(result.status).toBe('error');
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.error_reported',
        })
      );
    });
  });

  describe('decommissionDevice', () => {
    it('should decommission device', async () => {
      const device = createTestDevice({ status: 'offline' });
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.decommissionDevice('device-123');
      });

      expect(result.status).toBe('decommissioned');
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.decommissioned',
        })
      );
    });
  });

  describe('updateDeviceHeartbeat', () => {
    it('should update device heartbeat', async () => {
      const device = createTestDevice();
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      const result = await runWithContext(testContext, async () => {
        return await service.updateDeviceHeartbeat('device-123');
      });

      expect(result.last_seen_at).toBeDefined();
      expect(mockDeviceRepository.update).toHaveBeenCalled();
      // No event should be published for heartbeat
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('deleteDevice', () => {
    it('should delete device successfully', async () => {
      const device = createTestDevice();
      vi.mocked(mockDeviceRepository.findById).mockResolvedValue(device);

      await runWithContext(testContext, async () => {
        await service.deleteDevice('device-123');
      });

      expect(mockDeviceRepository.delete).toHaveBeenCalledWith('device-123');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.deleted',
        })
      );
    });
  });
});

// Helper function to create test devices
function createTestDevice(overrides?: Partial<any>): DeviceEntity {
  return DeviceEntity.create({
    device_id: 'device-123',
    name: 'test-device',
    display_name: 'Test Device',
    description: 'A test device',
    server_id: 'server-123',
    type: 'physical',
    provider: 'on-premise',
    specs: {
      cpu_cores: 8,
      memory_gb: 16,
      storage_gb: 512,
    },
    status: 'online',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });
}
