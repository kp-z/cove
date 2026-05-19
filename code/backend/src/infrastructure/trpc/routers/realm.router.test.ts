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
    realmId: 'test-server',
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
        name: 'test-server',
        displayName: 'Test Server',
        description: 'A test server',
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
      expect(result).toHaveProperty('name', 'test-server');
      expect(mockRealmService.createRealm).toHaveBeenCalledWith(input);
    });
  });

  describe('list', () => {
    it('should list all servers', async () => {
      const mockServers = [
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

      mockRealmService.queryServers.mockResolvedValue(mockServers);

      const result = await caller.list();

      expect(result.servers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockRealmService.queryServers).toHaveBeenCalledWith(undefined);
    });

    it('should list servers by owner', async () => {
      const mockServers = [
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

      mockRealmService.queryServers.mockResolvedValue(mockServers);

      const result = await caller.list({ ownerId: 'user-1' });

      expect(result.servers).toHaveLength(1);
      expect(mockRealmService.queryServers).toHaveBeenCalledWith({ ownerId: 'user-1' });
    });

    it('should list servers by status', async () => {
      const mockServers = [
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

      mockRealmService.queryServers.mockResolvedValue(mockServers);

      const result = await caller.list({ status: 'active' });

      expect(result.servers).toHaveLength(1);
      expect(mockRealmService.queryServers).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  describe('getById', () => {
    it('should get realm by id', async () => {
      const mockServer = RealmEntity.create({
        realm_id: 'server-1',
        name: 'test-server',
        display_name: 'Test Server',
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
        name: 'test-server',
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

  describe('archive', () => {
    it('should archive realm', async () => {
      const mockServer = RealmEntity.create({
        realm_id: 'server-1',
        name: 'test-server',
        display_name: 'Test Server',
        owner_id: 'user-1',
        status: 'archived',
        visibility: 'private',
        settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRealmService.archiveRealm.mockResolvedValue(mockServer);

      const result = await caller.archive({ realmId: 'server-1' });

      expect(result).toHaveProperty('status', 'archived');
      expect(mockRealmService.archiveRealm).toHaveBeenCalledWith('server-1');
    });
  });

  describe('activate', () => {
    it('should activate realm', async () => {
      const mockServer = RealmEntity.create({
        realm_id: 'server-1',
        name: 'test-server',
        display_name: 'Test Server',
        owner_id: 'user-1',
        status: 'active',
        visibility: 'private',
        settings: defaultSettings,
        limits: defaultLimits,
        meta: defaultMeta,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRealmService.activateServer.mockResolvedValue(mockServer);

      const result = await caller.activate({ realmId: 'server-1' });

      expect(result).toHaveProperty('status', 'active');
      expect(mockRealmService.activateServer).toHaveBeenCalledWith('server-1');
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
