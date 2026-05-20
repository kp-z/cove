/**
 * Realm Router Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { realmRouter } from './realm.router';
import { RealmService } from '../../../application/services/realm/realm.service';
import { RealmEntity } from '../../../domain/models/realm/realm.entity';
import { RealmNotFoundError } from '../../../application/services/realm/realm.errors';

describe('realmRouter', () => {
  let mockRealmService: any;
  let router: any;
  let caller: any;

  const mockContext = {
    realmId: 'test-realm',
    userId: 'test-user',
  };

  const defaultSettings = {
    allow_public_channels: true,
    allow_private_channels: true,
    allow_dm: true,
    require_approval: false,
    default_member_role: 'member' as const,
  };

  const defaultLimits = {
    max_members: 100,
    max_projects: 50,
    max_channels: 100,
    max_agents: 10,
    max_storage_gb: 100,
  };

  const defaultMeta = {
    tags: [],
  };

  beforeEach(() => {
    mockRealmService = {
      createRealm: vi.fn(),
      getRealmById: vi.fn(),
      queryServers: vi.fn(),
      updateRealm: vi.fn(),
      archiveRealm: vi.fn(),
      activateServer: vi.fn(),
      deleteRealm: vi.fn(),
    };

    router = realmRouter(mockRealmService as RealmService);
    caller = router.createCaller(mockContext);
  });

  describe('create', () => {
    it('should create a new realm', async () => {
      const input = {
        name: 'test-realm',
        displayName: 'Test Realm',
        description: 'A test realm',
        ownerId: 'user-1',
      };

      const mockServer = RealmEntity.create({
        realm_id: 'server-1',
        name: input.name,
        display_name: input.displayName,
        description: input.description,
        owner_id: input.ownerId,
        status: 'active',
        visibility: 'private',
        settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRealmService.createRealm.mockResolvedValue(mockServer);

      const result = await caller.create(input);

      expect(result).toHaveProperty('realm_id', 'server-1');
      expect(result).toHaveProperty('name', 'test-realm');
      expect(mockRealmService.createRealm).toHaveBeenCalledWith(input);
    });
  });

  describe('list', () => {
    it('should list all realms', async () => {
      const mockRealms = [
        RealmEntity.create({
          realm_id: 'server-1',
          name: 'server-1',
          display_name: 'Server 1',
          owner_id: 'user-1',
          status: 'active',
          visibility: 'private',
          settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
          updated_at: new Date(),
        }),
        RealmEntity.create({
          realm_id: 'server-2',
          name: 'server-2',
          display_name: 'Server 2',
          owner_id: 'user-1',
          status: 'active',
          visibility: 'private',
          settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
          updated_at: new Date(),
        }),
      ];

      mockRealmService.queryServers.mockResolvedValue(mockRealms);

      const result = await caller.list();

      expect(result.realms).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockRealmService.queryServers).toHaveBeenCalledWith(undefined);
    });

    it('should list realms by owner', async () => {
      const mockRealms = [
        RealmEntity.create({
          realm_id: 'server-1',
          name: 'server-1',
          display_name: 'Server 1',
          owner_id: 'user-1',
          status: 'active',
          visibility: 'private',
          settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
          updated_at: new Date(),
        }),
      ];

      mockRealmService.queryServers.mockResolvedValue(mockRealms);

      const result = await caller.list({ ownerId: 'user-1' });

      expect(result.realms).toHaveLength(1);
      expect(mockRealmService.queryServers).toHaveBeenCalledWith({ ownerId: 'user-1' });
    });

    it('should list realms by status', async () => {
      const mockRealms = [
        RealmEntity.create({
          realm_id: 'server-1',
          name: 'server-1',
          display_name: 'Server 1',
          owner_id: 'user-1',
          status: 'active',
          visibility: 'private',
          settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
          updated_at: new Date(),
        }),
      ];

      mockRealmService.queryServers.mockResolvedValue(mockRealms);

      const result = await caller.list({ status: 'active' });

      expect(result.realms).toHaveLength(1);
      expect(mockRealmService.queryServers).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  describe('getById', () => {
    it('should get realm by id', async () => {
      const mockServer = RealmEntity.create({
        realm_id: 'server-1',
        name: 'test-realm',
        display_name: 'Test Realm',
        owner_id: 'user-1',
        status: 'active',
        visibility: 'private',
        settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRealmService.getRealmById.mockResolvedValue(mockServer);

      const result = await caller.getById({ realmId: 'server-1' });

      expect(result).toHaveProperty('realm_id', 'server-1');
      expect(mockRealmService.getRealmById).toHaveBeenCalledWith('server-1');
    });

    it('should throw NOT_FOUND when server not found', async () => {
      mockRealmService.getRealmById.mockRejectedValue(new RealmNotFoundError('server-1'));

      await expect(caller.getById({ realmId: 'server-1' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update realm', async () => {
      const mockServer = RealmEntity.create({
        realm_id: 'server-1',
        name: 'test-realm',
        display_name: 'Updated Server',
        owner_id: 'user-1',
        status: 'active',
        visibility: 'private',
        settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRealmService.updateRealm.mockResolvedValue(mockServer);

      const result = await caller.update({
        realmId: 'server-1',
        data: { displayName: 'Updated Server' },
      });

      expect(result).toHaveProperty('display_name', 'Updated Server');
      expect(mockRealmService.updateRealm).toHaveBeenCalledWith('server-1', { displayName: 'Updated Server' });
    });
  });

  describe('update - status changes', () => {
    it('should archive realm via update', async () => {
      const mockServer = RealmEntity.create({
        realm_id: 'server-1',
        name: 'test-realm',
        display_name: 'Test Realm',
        owner_id: 'user-1',
        status: 'archived',
        visibility: 'private',
        settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRealmService.updateRealm.mockResolvedValue(mockServer);

      const result = await caller.update({
        realmId: 'server-1',
        data: { status: 'archived' },
      });

      expect(result).toHaveProperty('status', 'archived');
      expect(mockRealmService.updateRealm).toHaveBeenCalledWith('server-1', { status: 'archived' });
    });

    it('should activate realm via update', async () => {
      const mockServer = RealmEntity.create({
        realm_id: 'server-1',
        name: 'test-realm',
        display_name: 'Test Realm',
        owner_id: 'user-1',
        status: 'active',
        visibility: 'private',
        settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRealmService.updateRealm.mockResolvedValue(mockServer);

      const result = await caller.update({
        realmId: 'server-1',
        data: { status: 'active' },
      });

      expect(result).toHaveProperty('status', 'active');
      expect(mockRealmService.updateRealm).toHaveBeenCalledWith('server-1', { status: 'active' });
    });
  });

  describe('delete', () => {
    it('should delete realm', async () => {
      mockRealmService.deleteRealm.mockResolvedValue(undefined);

      const result = await caller.delete({ realmId: 'server-1' });

      expect(result).toEqual({ success: true });
      expect(mockRealmService.deleteRealm).toHaveBeenCalledWith('server-1');
    });
  });
});
