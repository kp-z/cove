import { describe, it, expect } from 'vitest';
import { DeviceEntity } from './device.entity';

describe('DeviceEntity', () => {
  const validProps = {
    deviceId: 'device-001',
    userId: 'user-001',
    deviceName: 'MacBook Pro',
    status: 'active' as const,
    registeredAt: new Date('2026-01-01T00:00:00Z'),
    meta: {
      tags: ['primary'],
      trusted: true,
    },
  };

  describe('create', () => {
    it('should create a valid device entity', () => {
      const device = DeviceEntity.create(validProps);
      expect(device.deviceId).toBe('device-001');
      expect(device.deviceName).toBe('MacBook Pro');
      expect(device.status).toBe('active');
      expect(device.isTrusted()).toBe(true);
    });

    it('should throw error if deviceId is empty', () => {
      expect(() =>
        DeviceEntity.create({ ...validProps, deviceId: '' })
      ).toThrow('Device ID cannot be empty');
    });

    it('should throw error if userId is empty', () => {
      expect(() =>
        DeviceEntity.create({ ...validProps, userId: '' })
      ).toThrow('User ID cannot be empty');
    });

    it('should throw error if deviceName is empty', () => {
      expect(() =>
        DeviceEntity.create({ ...validProps, deviceName: '' })
      ).toThrow('Device name cannot be empty');
    });

    it('should create device with minimal meta', () => {
      const device = DeviceEntity.create({
        ...validProps,
        meta: {},
      });
      expect(device.isTrusted()).toBe(false);
    });
  });

  describe('status checks', () => {
    it('should correctly identify status', () => {
      const device = DeviceEntity.create(validProps);
      expect(device.isActive()).toBe(true);
      expect(device.isInactive()).toBe(false);
      expect(device.isRevoked()).toBe(false);
      expect(device.isTrusted()).toBe(true);
    });
  });

  describe('status transitions', () => {
    it('should activate device', () => {
      const device = DeviceEntity.create({
        ...validProps,
        status: 'inactive',
      });
      const updated = device.activate();
      expect(updated.status).toBe('active');
    });

    it('should deactivate device', () => {
      const device = DeviceEntity.create(validProps);
      const updated = device.deactivate();
      expect(updated.status).toBe('inactive');
    });

    it('should revoke device', () => {
      const device = DeviceEntity.create(validProps);
      const updated = device.revoke();
      expect(updated.status).toBe('revoked');
      expect(updated.revokedAt).toBeDefined();
    });

    it('should not activate revoked device', () => {
      const device = DeviceEntity.create({
        ...validProps,
        status: 'revoked',
      });
      expect(() => device.activate()).toThrow('Revoked devices cannot be activated');
    });

    it('should not deactivate revoked device', () => {
      const device = DeviceEntity.create({
        ...validProps,
        status: 'revoked',
      });
      expect(() => device.deactivate()).toThrow('Revoked devices cannot be deactivated');
    });
  });

  describe('trust management', () => {
    it('should mark as trusted', () => {
      const device = DeviceEntity.create({
        ...validProps,
        meta: { ...validProps.meta, trusted: false },
      });
      const updated = device.markAsTrusted();
      expect(updated.isTrusted()).toBe(true);
    });

    it('should mark as untrusted', () => {
      const device = DeviceEntity.create(validProps);
      const updated = device.markAsUntrusted();
      expect(updated.isTrusted()).toBe(false);
    });
  });

  describe('tag management', () => {
    it('should add tag', () => {
      const device = DeviceEntity.create(validProps);
      const updated = device.addTag('work');
      expect(updated.meta.tags).toEqual(['primary', 'work']);
    });

    it('should not add duplicate tag', () => {
      const device = DeviceEntity.create(validProps);
      expect(() => device.addTag('primary')).toThrow('Tag already exists');
    });

    it('should remove tag', () => {
      const device = DeviceEntity.create(validProps);
      const updated = device.removeTag('primary');
      expect(updated.meta.tags).toEqual([]);
    });
  });

  describe('immutability', () => {
    it('should return new instance when updating device name', () => {
      const device = DeviceEntity.create(validProps);
      const updated = device.updateDeviceName('New Device');
      expect(updated.deviceName).toBe('New Device');
      expect(device.deviceName).toBe('MacBook Pro');
      expect(updated).not.toBe(device);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const device = DeviceEntity.create(validProps);
      const json = device.toJSON();
      expect(json.device_id).toBe('device-001');
      expect(json.user_id).toBe('user-001');
      expect(json.device_name).toBe('MacBook Pro');
      expect(json.status).toBe('active');
      expect(json.meta.trusted).toBe(true);
    });

    it('should deserialize from JSON', () => {
      const device = DeviceEntity.create(validProps);
      const json = device.toJSON();
      const deserialized = DeviceEntity.fromJSON(json);
      expect(deserialized.deviceId).toBe(device.deviceId);
      expect(deserialized.deviceName).toBe(device.deviceName);
      expect(deserialized.status).toBe(device.status);
    });

    it('should handle revoked device serialization', () => {
      const device = DeviceEntity.create(validProps).revoke();
      const json = device.toJSON();
      expect(json.status).toBe('revoked');
      expect(json.revoked_at).toBeDefined();

      const deserialized = DeviceEntity.fromJSON(json);
      expect(deserialized.isRevoked()).toBe(true);
      expect(deserialized.revokedAt).toBeDefined();
    });
  });
});
