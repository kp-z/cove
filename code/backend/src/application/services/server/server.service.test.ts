import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServerService, CreateServerDTO, UpdateServerDTO, UpdateServerSettingsDTO, UpdateServerLimitsDTO } from './server.service';
import { ServerEntity } from '../../../domain/models/server/server.entity';
import {
  ServerNotFoundError,
  ServerNameAlreadyExistsError,
  ServerNotActiveError,
  ServerAlreadyArchivedError,
  ServerNotArchivedError,
  UnauthorizedServerAccessError,
} from './server.errors';
import { IServerRepository, IEventBus, ILogger } from '../../interfaces';
import { ServerContext } from '../../context/server-context';
import { runWithContext } from '../../context/server-context-store';

describe('ServerService', () => {
  let service: ServerService;
  let mockServerRepository: IServerRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let testContext: ServerContext;

  beforeEach(() => {
    testContext = ServerContext.create('test-server-id', 'owner-123');

    mockServerRepository = {
      findById: vi.fn(),
      findByOwner: vi.fn(),
      findByStatus: vi.fn(),
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

    service = new ServerService(mockServerRepository, mockEventBus, mockLogger);
  });

  describe('createServer', () => {
    it('should create a new server successfully', async () => {
      const dto: CreateServerDTO = {
        name: 'test-server',
        displayName: 'Test Server',
        description: 'A test server',
        ownerId: 'owner-123',
        visibility: 'private',
      };

      vi.mocked(mockServerRepository.findAll).mockResolvedValue([]);

      const result = await runWithContext(testContext, async () => {
        return await service.createServer(dto);
      });

      expect(result).toBeInstanceOf(ServerEntity);
      expect(result.name).toBe(dto.name);
      expect(result.display_name).toBe(dto.displayName);
      expect(result.owner_id).toBe(dto.ownerId);
      expect(result.status).toBe('active');
      expect(mockServerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            name: dto.name,
            display_name: dto.displayName,
            owner_id: dto.ownerId,
            status: 'active',
          }),
        }),
        expect.any(String)
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'server.created',
        })
      );
    });

    it('should throw error when server name already exists', async () => {
      const dto: CreateServerDTO = {
        name: 'existing-server',
        displayName: 'Existing Server',
        ownerId: 'owner-123',
      };

      const existingServer = createTestServer({ name: 'existing-server' });
      vi.mocked(mockServerRepository.findAll).mockResolvedValue([existingServer]);

      await expect(
        runWithContext(testContext, async () => {
          return await service.createServer(dto);
        })
      ).rejects.toThrow(ServerNameAlreadyExistsError);
    });

    it('should create server with default settings and limits', async () => {
      const dto: CreateServerDTO = {
        name: 'test-server',
        displayName: 'Test Server',
        ownerId: 'owner-123',
      };

      vi.mocked(mockServerRepository.findAll).mockResolvedValue([]);

      const result = await runWithContext(testContext, async () => {
        return await service.createServer(dto);
      });

      expect(result.settings.allow_public_channels).toBe(true);
      expect(result.settings.allow_private_channels).toBe(true);
      expect(result.settings.allow_dm).toBe(true);
      expect(result.settings.require_approval).toBe(false);
      expect(result.settings.default_member_role).toBe('member');
      expect(result.limits.max_members).toBe(100);
      expect(result.limits.max_projects).toBe(50);
      expect(result.limits.max_channels).toBe(100);
      expect(result.limits.max_agents).toBe(10);
      expect(result.limits.max_storage_gb).toBe(10);
    });
  });

  describe('getServerById', () => {
    it('should return server when found', async () => {
      const mockServer = createTestServer();
      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);

      const result = await runWithContext(testContext, async () => {
        return await service.getServerById('server-123');
      });

      expect(result).toBe(mockServer);
      expect(mockServerRepository.findById).toHaveBeenCalledWith('server-123');
    });

    it('should throw error when server not found', async () => {
      vi.mocked(mockServerRepository.findById).mockResolvedValue(null);

      await expect(
        runWithContext(testContext, async () => {
          return await service.getServerById('nonexistent');
        })
      ).rejects.toThrow(ServerNotFoundError);
    });
  });

  describe('getServersByOwner', () => {
    it('should return servers by owner', async () => {
      const mockServers = [createTestServer(), createTestServer()];
      vi.mocked(mockServerRepository.findByOwner).mockResolvedValue(mockServers);

      const result = await runWithContext(testContext, async () => {
        return await service.getServersByOwner('owner-123');
      });

      expect(result).toEqual(mockServers);
      expect(mockServerRepository.findByOwner).toHaveBeenCalledWith('owner-123');
    });
  });

  describe('updateServer', () => {
    it('should update server successfully', async () => {
      const mockServer = createTestServer({ owner_id: 'owner-123' });
      const updatedServer = createTestServer({ name: 'updated-name', owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.mocked(mockServerRepository.findAll).mockResolvedValue([]);
      vi.spyOn(mockServer, 'updateName').mockReturnValue(updatedServer);

      const dto: UpdateServerDTO = {
        name: 'updated-name',
      };

      const result = await runWithContext(testContext, async () => {
        return await service.updateServer('server-123', dto);
      });

      expect(result).toBe(updatedServer);
      expect(mockServer.updateName).toHaveBeenCalledWith('updated-name');
      expect(mockServerRepository.update).toHaveBeenCalledWith(updatedServer, 'server-123');
    });

    it('should throw error when user is not owner', async () => {
      const mockServer = createTestServer({ owner_id: 'other-owner' });
      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);

      const dto: UpdateServerDTO = {
        name: 'updated-name',
      };

      await expect(
        runWithContext(testContext, async () => {
          return await service.updateServer('server-123', dto);
        })
      ).rejects.toThrow(UnauthorizedServerAccessError);
    });

    it('should throw error when new name already exists', async () => {
      const mockServer = createTestServer({ server_id: 'server-123', owner_id: 'owner-123' });
      const existingServer = createTestServer({ server_id: 'server-456', name: 'existing-name' });

      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.mocked(mockServerRepository.findAll).mockResolvedValue([existingServer]);

      const dto: UpdateServerDTO = {
        name: 'existing-name',
      };

      await expect(
        runWithContext(testContext, async () => {
          return await service.updateServer('server-123', dto);
        })
      ).rejects.toThrow(ServerNameAlreadyExistsError);
    });
  });

  describe('updateServerSettings', () => {
    it('should update server settings successfully', async () => {
      const mockServer = createTestServer({ owner_id: 'owner-123' });
      const updatedServer = createTestServer({ owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.spyOn(mockServer, 'updateSettings').mockReturnValue(updatedServer);

      const dto: UpdateServerSettingsDTO = {
        allowPublicChannels: false,
        requireApproval: true,
      };

      const result = await runWithContext(testContext, async () => {
        return await service.updateServerSettings('server-123', dto);
      });

      expect(result).toBe(updatedServer);
      expect(mockServer.updateSettings).toHaveBeenCalledWith({
        allow_public_channels: false,
        require_approval: true,
      });
      expect(mockServerRepository.update).toHaveBeenCalledWith(updatedServer, 'server-123');
    });

    it('should throw error when user is not owner', async () => {
      const mockServer = createTestServer({ owner_id: 'other-owner' });
      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);

      const dto: UpdateServerSettingsDTO = {
        allowPublicChannels: false,
      };

      await expect(
        runWithContext(testContext, async () => {
          return await service.updateServerSettings('server-123', dto);
        })
      ).rejects.toThrow(UnauthorizedServerAccessError);
    });
  });

  describe('updateServerLimits', () => {
    it('should update server limits successfully', async () => {
      const mockServer = createTestServer({ owner_id: 'owner-123' });
      const updatedServer = createTestServer({ owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.spyOn(mockServer, 'updateLimits').mockReturnValue(updatedServer);

      const dto: UpdateServerLimitsDTO = {
        maxMembers: 200,
        maxProjects: 100,
      };

      const result = await runWithContext(testContext, async () => {
        return await service.updateServerLimits('server-123', dto);
      });

      expect(result).toBe(updatedServer);
      expect(mockServer.updateLimits).toHaveBeenCalledWith({
        max_members: 200,
        max_projects: 100,
      });
      expect(mockServerRepository.update).toHaveBeenCalledWith(updatedServer, 'server-123');
    });
  });

  describe('suspendServer', () => {
    it('should suspend server successfully', async () => {
      const mockServer = createTestServer({ status: 'active', owner_id: 'owner-123' });
      const suspendedServer = createTestServer({ status: 'suspended', owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.spyOn(mockServer, 'suspend').mockReturnValue(suspendedServer);
      vi.spyOn(mockServer, 'isActive').mockReturnValue(true);

      const result = await runWithContext(testContext, async () => {
        return await service.suspendServer('server-123');
      });

      expect(result).toBe(suspendedServer);
      expect(mockServer.suspend).toHaveBeenCalled();
      expect(mockServerRepository.update).toHaveBeenCalledWith(suspendedServer, 'server-123');
    });

    it('should throw error when server is not active', async () => {
      const mockServer = createTestServer({ status: 'suspended', owner_id: 'owner-123' });
      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.spyOn(mockServer, 'isActive').mockReturnValue(false);

      await expect(
        runWithContext(testContext, async () => {
          return await service.suspendServer('server-123');
        })
      ).rejects.toThrow(ServerNotActiveError);
    });
  });

  describe('activateServer', () => {
    it('should activate server successfully', async () => {
      const mockServer = createTestServer({ status: 'suspended', owner_id: 'owner-123' });
      const activatedServer = createTestServer({ status: 'active', owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.spyOn(mockServer, 'activate').mockReturnValue(activatedServer);
      vi.spyOn(mockServer, 'isSuspended').mockReturnValue(true);

      const result = await runWithContext(testContext, async () => {
        return await service.activateServer('server-123');
      });

      expect(result).toBe(activatedServer);
      expect(mockServer.activate).toHaveBeenCalled();
      expect(mockServerRepository.update).toHaveBeenCalledWith(activatedServer, 'server-123');
    });
  });

  describe('archiveServer', () => {
    it('should archive server successfully', async () => {
      const mockServer = createTestServer({ status: 'active', owner_id: 'owner-123' });
      const archivedServer = createTestServer({ status: 'archived', owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.spyOn(mockServer, 'archive').mockReturnValue(archivedServer);
      vi.spyOn(mockServer, 'isArchived').mockReturnValue(false);

      const result = await runWithContext(testContext, async () => {
        return await service.archiveServer('server-123');
      });

      expect(result).toBe(archivedServer);
      expect(mockServer.archive).toHaveBeenCalled();
      expect(mockServerRepository.update).toHaveBeenCalledWith(archivedServer, 'server-123');
    });

    it('should throw error when server is already archived', async () => {
      const mockServer = createTestServer({ status: 'archived', owner_id: 'owner-123' });
      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.spyOn(mockServer, 'isArchived').mockReturnValue(true);

      await expect(
        runWithContext(testContext, async () => {
          return await service.archiveServer('server-123');
        })
      ).rejects.toThrow(ServerAlreadyArchivedError);
    });
  });

  describe('unarchiveServer', () => {
    it('should unarchive server successfully', async () => {
      const mockServer = createTestServer({ status: 'archived', owner_id: 'owner-123' });
      const unarchivedServer = createTestServer({ status: 'active', owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.spyOn(mockServer, 'unarchive').mockReturnValue(unarchivedServer);
      vi.spyOn(mockServer, 'isArchived').mockReturnValue(true);

      const result = await runWithContext(testContext, async () => {
        return await service.unarchiveServer('server-123');
      });

      expect(result).toBe(unarchivedServer);
      expect(mockServer.unarchive).toHaveBeenCalled();
      expect(mockServerRepository.update).toHaveBeenCalledWith(unarchivedServer, 'server-123');
    });

    it('should throw error when server is not archived', async () => {
      const mockServer = createTestServer({ status: 'active', owner_id: 'owner-123' });
      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);
      vi.spyOn(mockServer, 'isArchived').mockReturnValue(false);

      await expect(
        runWithContext(testContext, async () => {
          return await service.unarchiveServer('server-123');
        })
      ).rejects.toThrow(ServerNotArchivedError);
    });
  });

  describe('deleteServer', () => {
    it('should delete server successfully', async () => {
      const mockServer = createTestServer({ owner_id: 'owner-123' });
      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);

      await runWithContext(testContext, async () => {
        return await service.deleteServer('server-123');
      });

      expect(mockServerRepository.delete).toHaveBeenCalledWith('server-123');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'server.deleted',
        })
      );
    });

    it('should throw error when user is not owner', async () => {
      const mockServer = createTestServer({ owner_id: 'other-owner' });
      vi.mocked(mockServerRepository.findById).mockResolvedValue(mockServer);

      await expect(
        runWithContext(testContext, async () => {
          return await service.deleteServer('server-123');
        })
      ).rejects.toThrow(UnauthorizedServerAccessError);
    });
  });
});

// Helper function to create test server
function createTestServer(overrides?: Partial<any>): ServerEntity {
  return ServerEntity.create({
    server_id: 'server-123',
    name: 'test-server',
    display_name: 'Test Server',
    description: 'A test server',
    owner_id: 'owner-123',
    status: 'active',
    visibility: 'private',
    settings: {
      allow_public_channels: true,
      allow_private_channels: true,
      allow_dm: true,
      require_approval: false,
      default_member_role: 'member',
    },
    limits: {
      max_members: 100,
      max_projects: 50,
      max_channels: 100,
      max_agents: 10,
      max_storage_gb: 10,
    },
    created_at: new Date(),
    updated_at: new Date(),
    meta: {},
    ...overrides,
  });
}
