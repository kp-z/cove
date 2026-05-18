/**
 * HybridDeviceRepository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HybridDeviceRepository } from './hybrid-device.repository';
import { DeviceEntity } from '../../domain/models/device/device.entity';
import { PrismaClient } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { ILogger } from '../../application/interfaces/logger.interface';

describe('HybridDeviceRepository', () => {
  let repository: HybridDeviceRepository;
  let mockPrisma: any;
  let mockStorage: any;
  let mockLogger: any;

  const mockSpecs = {
    cpu_cores: 8,
    memory_gb: 16,
    storage_gb: 512,
  };

  beforeEach(() => {
    mockPrisma = {
      device: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    };

    mockStorage = {
      loadJson: vi.fn(),
      saveJsonAtomic: vi.fn(),
      deleteFile: vi.fn(),
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    repository = new HybridDeviceRepository(
      mockPrisma as unknown as PrismaClient,
      mockStorage as unknown as StorageService,
      mockLogger as unknown as ILogger
    );
  });

  describe('findById', () => {
    it('should find device by id and serverId', async () => {
      const dbRecord = {
        id: 'device-1',
        serverId: 'server-1',
        name: 'test-device',
        displayName: 'Test Device',
        type: 'physical',
        status: 'online',
        platform: 'darwin',
        configPath: 'devices/device-1.json',
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const content = {
        specs: mockSpecs,
        provider: 'on-premise',
      };

      mockPrisma.device.findFirst.mockResolvedValue(dbRecord);
      mockStorage.loadJson.mockResolvedValue(content);

      const result = await repository.findById('device-1', 'server-1');

      expect(result).toBeInstanceOf(DeviceEntity);
      expect(result?.device_id).toBe('device-1');
      expect(result?.name).toBe('test-device');
      expect(mockPrisma.device.findFirst).toHaveBeenCalledWith({
        where: { id: 'device-1', serverId: 'server-1' },
      });
    });

    it('should return null if device not found', async () => {
      mockPrisma.device.findFirst.mockResolvedValue(null);

      const result = await repository.findById('nonexistent', 'server-1');

      expect(result).toBeNull();
    });
  });

  describe('findByServer', () => {
    it('should find all devices for a server', async () => {
      const dbRecords = [
        {
          id: 'device-1',
          serverId: 'server-1',
          name: 'device-1',
          displayName: 'Device 1',
          type: 'physical',
          status: 'online',
          platform: 'darwin',
          configPath: 'devices/device-1.json',
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'device-2',
          serverId: 'server-1',
          name: 'device-2',
          displayName: 'Device 2',
          type: 'virtual',
          status: 'offline',
          platform: 'linux',
          configPath: 'devices/device-2.json',
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.device.findMany.mockResolvedValue(dbRecords);
      mockStorage.loadJson.mockResolvedValue({ specs: mockSpecs });

      const result = await repository.findByServer('server-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(DeviceEntity);
      expect(result[1]).toBeInstanceOf(DeviceEntity);
    });
  });

  describe('findByStatus', () => {
    it('should find devices by status', async () => {
      const dbRecords = [
        {
          id: 'device-1',
          serverId: 'server-1',
          name: 'device-1',
          displayName: 'Device 1',
          type: 'physical',
          status: 'online',
          platform: 'darwin',
          configPath: 'devices/device-1.json',
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.device.findMany.mockResolvedValue(dbRecords);
      mockStorage.loadJson.mockResolvedValue({ specs: mockSpecs });

      const result = await repository.findByStatus('online', 'server-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('online');
      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: { serverId: 'server-1', status: 'online' },
      });
    });
  });

  describe('findByType', () => {
    it('should find devices by type', async () => {
      const dbRecords = [
        {
          id: 'device-1',
          serverId: 'server-1',
          name: 'device-1',
          displayName: 'Device 1',
          type: 'physical',
          status: 'online',
          platform: 'darwin',
          configPath: 'devices/device-1.json',
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.device.findMany.mockResolvedValue(dbRecords);
      mockStorage.loadJson.mockResolvedValue({ specs: mockSpecs });

      const result = await repository.findByType('physical', 'server-1');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('physical');
      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: { serverId: 'server-1', type: 'physical' },
      });
    });
  });

  describe('exists', () => {
    it('should return true if device exists', async () => {
      mockPrisma.device.count.mockResolvedValue(1);

      const result = await repository.exists('device-1', 'server-1');

      expect(result).toBe(true);
      expect(mockPrisma.device.count).toHaveBeenCalledWith({
        where: { id: 'device-1', serverId: 'server-1' },
      });
    });

    it('should return false if device does not exist', async () => {
      mockPrisma.device.count.mockResolvedValue(0);

      const result = await repository.exists('nonexistent', 'server-1');

      expect(result).toBe(false);
    });
  });

  describe('save', () => {
    it('should save device to database and storage', async () => {
      const device = DeviceEntity.create({
        device_id: 'device-1',
        server_id: 'server-1',
        name: 'test-device',
        display_name: 'Test Device',
        type: 'physical',
        status: 'provisioning',
        specs: mockSpecs,
        provider: 'on-premise',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockStorage.saveJsonAtomic.mockResolvedValue('devices/device-1.json');
      mockPrisma.device.create.mockResolvedValue({});

      await repository.save(device, 'server-1');

      expect(mockStorage.saveJsonAtomic).toHaveBeenCalled();
      expect(mockPrisma.device.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update device in database and storage', async () => {
      const device = DeviceEntity.create({
        device_id: 'device-1',
        server_id: 'server-1',
        name: 'test-device',
        display_name: 'Updated Device',
        type: 'physical',
        status: 'online',
        specs: mockSpecs,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockStorage.saveJsonAtomic.mockResolvedValue('devices/device-1.json');
      mockPrisma.device.update.mockResolvedValue({});

      await repository.update(device, 'server-1');

      expect(mockStorage.saveJsonAtomic).toHaveBeenCalled();
      expect(mockPrisma.device.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete device from database', async () => {
      mockPrisma.device.delete.mockResolvedValue({});

      await repository.delete('device-1', 'server-1');

      expect(mockPrisma.device.delete).toHaveBeenCalledWith({
        where: { id: 'device-1' },
      });
    });
  });
});
