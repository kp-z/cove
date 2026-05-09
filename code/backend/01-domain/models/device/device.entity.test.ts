import { describe, it, expect } from 'vitest';
import { DeviceEntity } from './device.entity';

describe('DeviceEntity', () => {
  const validProps = {
    deviceId: 'device-001',
    userId: 'user-001',
    deviceType: 'web' as const,
    platform: 'macos' as const,
    deviceName: 'MacBook Pro',
    deviceModel: 'MacBookPro18,1',
    osVersion: 'macOS 14.0',
    appVersion: '1.0.0',
    userAgent: 'Mozilla/5.0...',
    ipAddress: '192.168.1.100',
    status: 'active' as const,
    lastActiveAt: new Date('2026-05-07T01:00:00Z'),
    registeredAt: new Date('2026-01-01T00:00:00Z'),
    meta: {
      tags: ['primary'],
      trusted: true,
      location: 'San Francisco',
    },
  };

  describe('create', () => {
    it('should create a valid device entity', () => {
      const device = DeviceEntity.create(validProps);
      expect(device.deviceId).toBe('device-001');
      expect(device.deviceType).toBe('web');
      expect(device.status).toBe('active');
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

  describe('type checks', () => {
    it('should correctly identify device type', () => {
      const device = DeviceEntity.create(validProps);
      expect(device.isWeb()).toBe(true);
      expect(device.isMobile()).toBe(false);
      expect(device.isDesktop()).toBe(false);
      expect(device.isCLI()).toBe(false);
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

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const device = DeviceEntity.create(validProps);
      const json = device.toJSON();
      expect(json.device_id).toBe('device-001');
      expect(json.device_type).toBe('web');
    });

    it('should deserialize from JSON', () => {
      const device = DeviceEntity.create(validProps);
      const json = device.toJSON();
      const deserialized = DeviceEntity.fromJSON(json);
      expect(deserialized.deviceId).toBe(device.deviceId);
    });
  });
});
