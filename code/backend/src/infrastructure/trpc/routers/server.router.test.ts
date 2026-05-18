/**
 * Server Router Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { serverRouter } from './server.router';
import { ServerService } from '../../../application/services/server/server.service';
import { ServerEntity } from '../../../domain/models/server/server.entity';
import { ServerNotFoundError } from '../../../application/services/server/server.errors';

describe('serverRouter', () => {
  let mockServerService: any;
  let router: any;
  let caller: any;

  const mockContext = {
    serverId: 'test-server',
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
    mockServerService = {
      createServer: vi.fn(),
      getServerById: vi.fn(),
      getServersByOwner: vi.fn(),
      getServersByStatus: vi.fn(),
      getAllServers: vi.fn(),
      updateServer: vi.fn(),
      archiveServer: vi.fn(),
      activateServer: vi.fn(),
      deleteServer: vi.fn(),
    };

    router = serverRouter(mockServerService as ServerService);
    caller = router.createCaller(mockContext);
  });

  describe('create', () => {
    it('should create a new server', async () => {
      const input = {
        name: 'test-server',
        displayName: 'Test Server',
        description: 'A test server',
        ownerId: 'user-1',
      };

      const mockServer = ServerEntity.create({
        server_id: 'server-1',
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

      mockServerService.createServer.mockResolvedValue(mockServer);

      const result = await caller.create(input);

      expect(result).toHaveProperty('server_id', 'server-1');
      expect(result).toHaveProperty('name', 'test-server');
      expect(mockServerService.createServer).toHaveBeenCalledWith(input);
    });
  });

  describe('list', () => {
    it('should list all servers', async () => {
      const mockServers = [
        ServerEntity.create({
          server_id: 'server-1',
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
        ServerEntity.create({
          server_id: 'server-2',
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

      mockServerService.getAllServers.mockResolvedValue(mockServers);

      const result = await caller.list();

      expect(result.servers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockServerService.getAllServers).toHaveBeenCalled();
    });

    it('should list servers by owner', async () => {
      const mockServers = [
        ServerEntity.create({
          server_id: 'server-1',
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

      mockServerService.getServersByOwner.mockResolvedValue(mockServers);

      const result = await caller.list({ ownerId: 'user-1' });

      expect(result.servers).toHaveLength(1);
      expect(mockServerService.getServersByOwner).toHaveBeenCalledWith('user-1');
    });

    it('should list servers by status', async () => {
      const mockServers = [
        ServerEntity.create({
          server_id: 'server-1',
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

      mockServerService.getServersByStatus.mockResolvedValue(mockServers);

      const result = await caller.list({ status: 'active' });

      expect(result.servers).toHaveLength(1);
      expect(mockServerService.getServersByStatus).toHaveBeenCalledWith('active');
    });
  });

  describe('getById', () => {
    it('should get server by id', async () => {
      const mockServer = ServerEntity.create({
        server_id: 'server-1',
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

      mockServerService.getServerById.mockResolvedValue(mockServer);

      const result = await caller.getById({ serverId: 'server-1' });

      expect(result).toHaveProperty('server_id', 'server-1');
      expect(mockServerService.getServerById).toHaveBeenCalledWith('server-1');
    });

    it('should throw NOT_FOUND when server not found', async () => {
      mockServerService.getServerById.mockRejectedValue(new ServerNotFoundError('server-1'));

      await expect(caller.getById({ serverId: 'server-1' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update server', async () => {
      const mockServer = ServerEntity.create({
        server_id: 'server-1',
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

      mockServerService.updateServer.mockResolvedValue(mockServer);

      const result = await caller.update({
        serverId: 'server-1',
        data: { displayName: 'Updated Server' },
      });

      expect(result).toHaveProperty('display_name', 'Updated Server');
      expect(mockServerService.updateServer).toHaveBeenCalledWith('server-1', { displayName: 'Updated Server' });
    });
  });

  describe('archive', () => {
    it('should archive server', async () => {
      const mockServer = ServerEntity.create({
        server_id: 'server-1',
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

      mockServerService.archiveServer.mockResolvedValue(mockServer);

      const result = await caller.archive({ serverId: 'server-1' });

      expect(result).toHaveProperty('status', 'archived');
      expect(mockServerService.archiveServer).toHaveBeenCalledWith('server-1');
    });
  });

  describe('activate', () => {
    it('should activate server', async () => {
      const mockServer = ServerEntity.create({
        server_id: 'server-1',
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

      mockServerService.activateServer.mockResolvedValue(mockServer);

      const result = await caller.activate({ serverId: 'server-1' });

      expect(result).toHaveProperty('status', 'active');
      expect(mockServerService.activateServer).toHaveBeenCalledWith('server-1');
    });
  });

  describe('delete', () => {
    it('should delete server', async () => {
      mockServerService.deleteServer.mockResolvedValue(undefined);

      const result = await caller.delete({ serverId: 'server-1' });

      expect(result).toEqual({ success: true });
      expect(mockServerService.deleteServer).toHaveBeenCalledWith('server-1');
    });
  });
});
