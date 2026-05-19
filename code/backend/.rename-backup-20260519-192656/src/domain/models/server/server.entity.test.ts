import { describe, it, expect } from 'vitest';
import { ServerEntity, ServerStatus, ServerVisibility } from './server.entity';

describe('ServerEntity', () => {
  const validProps = {
    server_id: 'server-001',
    name: 'my-workspace',
    display_name: 'My Workspace',
    description: 'A collaborative workspace for the team',
    owner_id: 'user-001',
    visibility: 'private' as ServerVisibility,
    settings: {
      allow_public_channels: true,
      allow_private_channels: true,
      allow_direct_messages: true,
      require_approval_for_new_members: false,
      default_channel_id: 'channel-general',
      default_member_role: 'member' as const,
    },
    limits: {
      max_members: 100,
      max_projects: 50,
      max_channels: 200,
      max_agents: 20,
      max_storage_gb: 1000,
    },
    status: 'active' as ServerStatus,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-05-18T00:00:00Z'),
    meta: {
      tags: ['production', 'team-workspace'],
      plan: 'enterprise',
      billing_email: 'billing@example.com',
    },
  };

  describe('create', () => {
    it('should create a valid ServerEntity', () => {
      const server = ServerEntity.create(validProps);

      expect(server.server_id).toBe(validProps.server_id);
      expect(server.name).toBe(validProps.name);
      expect(server.display_name).toBe(validProps.display_name);
      expect(server.description).toBe(validProps.description);
      expect(server.owner_id).toBe(validProps.owner_id);
      expect(server.visibility).toBe(validProps.visibility);
      expect(server.status).toBe(validProps.status);
      expect(server.settings).toEqual(validProps.settings);
      expect(server.limits).toEqual(validProps.limits);
      expect(server.created_at).toEqual(validProps.created_at);
      expect(server.updated_at).toEqual(validProps.updated_at);
      expect(server.meta).toEqual(validProps.meta);
    });

    it('should create with minimal required fields', () => {
      const minimalProps = {
        server_id: 'server-002',
        name: 'minimal-workspace',
        display_name: 'Minimal Workspace',
        owner_id: 'user-002',
        visibility: 'private' as ServerVisibility,
        settings: {
          allow_public_channels: true,
          allow_private_channels: true,
          allow_direct_messages: true,
          require_approval_for_new_members: false,
          default_member_role: 'member' as const,
        },
        limits: {
          max_members: 50,
          max_projects: 10,
          max_channels: 100,
          max_agents: 5,
          max_storage_gb: 100,
        },
        status: 'active' as ServerStatus,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const server = ServerEntity.create(minimalProps);

      expect(server.server_id).toBe(minimalProps.server_id);
      expect(server.name).toBe(minimalProps.name);
      expect(server.display_name).toBe(minimalProps.display_name);
      expect(server.description).toBeUndefined();
      expect(server.meta).toBeUndefined();
    });

    it('should throw error for invalid server_id', () => {
      expect(() =>
        ServerEntity.create({ ...validProps, server_id: '' })
      ).toThrow('Server ID cannot be empty');
    });

    it('should throw error for invalid name', () => {
      expect(() =>
        ServerEntity.create({ ...validProps, name: '' })
      ).toThrow('Server name cannot be empty');

      expect(() =>
        ServerEntity.create({ ...validProps, name: 'a'.repeat(51) })
      ).toThrow('Server name cannot exceed 50 characters');
    });

    it('should throw error for invalid display_name', () => {
      expect(() =>
        ServerEntity.create({ ...validProps, display_name: '' })
      ).toThrow('Server display name cannot be empty');

      expect(() =>
        ServerEntity.create({ ...validProps, display_name: 'a'.repeat(101) })
      ).toThrow('Server display name cannot exceed 100 characters');
    });

    it('should throw error for invalid owner_id', () => {
      expect(() =>
        ServerEntity.create({ ...validProps, owner_id: '' })
      ).toThrow('Owner ID cannot be empty');
    });

    it('should throw error for invalid visibility', () => {
      expect(() =>
        ServerEntity.create({ ...validProps, visibility: 'invalid' as any })
      ).toThrow('Invalid server visibility: invalid');
    });

    it('should throw error for invalid status', () => {
      expect(() =>
        ServerEntity.create({ ...validProps, status: 'invalid' as any })
      ).toThrow('Invalid server status: invalid');
    });

    it('should throw error for invalid limits', () => {
      expect(() =>
        ServerEntity.create({
          ...validProps,
          limits: { ...validProps.limits, max_members: 0 },
        })
      ).toThrow('Max members must be greater than 0');

      expect(() =>
        ServerEntity.create({
          ...validProps,
          limits: { ...validProps.limits, max_projects: -1 },
        })
      ).toThrow('Max projects cannot be negative');

      expect(() =>
        ServerEntity.create({
          ...validProps,
          limits: { ...validProps.limits, max_storage_gb: 0 },
        })
      ).toThrow('Max storage must be greater than 0');
    });
  });

  describe('updateStatus', () => {
    it('should update status', () => {
      const server = ServerEntity.create(validProps);
      const updated = server.updateStatus('suspended');

      expect(updated.status).toBe('suspended');
      expect(updated.updated_at.getTime()).toBeGreaterThan(server.updated_at.getTime());
    });
  });

  describe('suspend', () => {
    it('should suspend an active server', () => {
      const server = ServerEntity.create(validProps);
      const suspended = server.suspend();

      expect(suspended.status).toBe('suspended');
      expect(suspended.updated_at.getTime()).toBeGreaterThan(server.updated_at.getTime());
    });

    it('should throw error when suspending a non-active server', () => {
      const server = ServerEntity.create({ ...validProps, status: 'archived' });

      expect(() => server.suspend()).toThrow('Only active servers can be suspended');
    });
  });

  describe('activate', () => {
    it('should activate a suspended server', () => {
      const server = ServerEntity.create({ ...validProps, status: 'suspended' });
      const activated = server.activate();

      expect(activated.status).toBe('active');
      expect(activated.updated_at.getTime()).toBeGreaterThan(server.updated_at.getTime());
    });

    it('should throw error when activating a non-suspended server', () => {
      const server = ServerEntity.create({ ...validProps, status: 'active' });

      expect(() => server.activate()).toThrow('Only suspended servers can be activated');
    });
  });

  describe('archive', () => {
    it('should archive an active server', () => {
      const server = ServerEntity.create(validProps);
      const archived = server.archive();

      expect(archived.status).toBe('archived');
      expect(archived.updated_at.getTime()).toBeGreaterThan(server.updated_at.getTime());
    });

    it('should archive a suspended server', () => {
      const server = ServerEntity.create({ ...validProps, status: 'suspended' });
      const archived = server.archive();

      expect(archived.status).toBe('archived');
    });

    it('should throw error when archiving an already archived server', () => {
      const server = ServerEntity.create({ ...validProps, status: 'archived' });

      expect(() => server.archive()).toThrow('Server is already archived');
    });
  });

  describe('unarchive', () => {
    it('should unarchive an archived server', () => {
      const server = ServerEntity.create({ ...validProps, status: 'archived' });
      const unarchived = server.unarchive();

      expect(unarchived.status).toBe('active');
      expect(unarchived.updated_at.getTime()).toBeGreaterThan(server.updated_at.getTime());
    });

    it('should throw error when unarchiving a non-archived server', () => {
      const server = ServerEntity.create({ ...validProps, status: 'active' });

      expect(() => server.unarchive()).toThrow('Only archived servers can be unarchived');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON correctly', () => {
      const server = ServerEntity.create(validProps);
      const json = server.toJSON();

      expect(json).toEqual({
        server_id: validProps.server_id,
        name: validProps.name,
        display_name: validProps.display_name,
        description: validProps.description,
        owner_id: validProps.owner_id,
        visibility: validProps.visibility,
        settings: validProps.settings,
        limits: validProps.limits,
        status: validProps.status,
        created_at: validProps.created_at.toISOString(),
        updated_at: validProps.updated_at.toISOString(),
        meta: validProps.meta,
      });
    });

    it('should serialize with undefined optional fields', () => {
      const minimalProps = {
        server_id: 'server-003',
        name: 'minimal',
        display_name: 'Minimal',
        owner_id: 'user-003',
        visibility: 'private' as ServerVisibility,
        settings: {
          allow_public_channels: true,
          allow_private_channels: true,
          allow_direct_messages: true,
          require_approval_for_new_members: false,
          default_member_role: 'member' as const,
        },
        limits: {
          max_members: 50,
          max_projects: 10,
          max_channels: 100,
          max_agents: 5,
          max_storage_gb: 100,
        },
        status: 'active' as ServerStatus,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      };

      const server = ServerEntity.create(minimalProps);
      const json = server.toJSON();

      expect(json.description).toBeUndefined();
      expect(json.meta).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('should return true for servers with same server_id', () => {
      const server1 = ServerEntity.create(validProps);
      const server2 = ServerEntity.create(validProps);

      expect(server1.equals(server2)).toBe(true);
    });

    it('should return false for servers with different server_id', () => {
      const server1 = ServerEntity.create(validProps);
      const server2 = ServerEntity.create({ ...validProps, server_id: 'server-002' });

      expect(server1.equals(server2)).toBe(false);
    });
  });
});
