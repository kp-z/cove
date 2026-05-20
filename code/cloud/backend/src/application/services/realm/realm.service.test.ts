import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealmService, CreateRealmDTO, UpdateRealmDTO, UpdateRealmSettingsDTO, UpdateRealmLimitsDTO } from './realm.service';
import { RealmEntity } from '../../../domain/models/realm/realm.entity';
import {
  RealmNotFoundError,
  RealmNameAlreadyExistsError,
  RealmNotActiveError,
  RealmAlreadyArchivedError,
  RealmNotArchivedError,
  UnauthorizedRealmAccessError,
} from './realm.errors';
import { IRealmRepository, IEventBus, ILogger } from '../../interfaces';
import { RealmContext } from '../../context/realm-context';
import { runWithContext } from '../../context/realm-context-store';

describe('RealmService', () => {
  let service: RealmService;
  let mockServerRepository: IRealmRepository;
  let mockServerMemberRepository: any;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let testContext: RealmContext;

  beforeEach(() => {
    testContext = RealmContext.create('test-server-id', 'owner-123');

    mockServerRepository = {
      find: vi.fn(),
      findByName: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    } as any;

    mockServerMemberRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findByServerAndUser: vi.fn(),
      findByServer: vi.fn(),
      findByRole: vi.fn(),
      findByStatus: vi.fn(),
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

    service = new RealmService(mockServerRepository, mockServerMemberRepository, mockEventBus, mockLogger);
  });

  describe('createRealm', () => {
    it('should create a new realm successfully', async () => {
      const dto: CreateRealmDTO = {
        name: 'test-server',
        displayName: 'Test Server',
        description: 'A test server',
        ownerId: 'owner-123',
        visibility: 'private',
      };

      vi.mocked(mockServerRepository.find).mockResolvedValue([]);

      const result = await runWithContext(testContext, async () => {
        return await service.createRealm(dto);
      });

      expect(result).toBeInstanceOf(RealmEntity);
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
      const dto: CreateRealmDTO = {
        name: 'existing-server',
        displayName: 'Existing Server',
        ownerId: 'owner-123',
      };

      const existingServer = createTestServer({ name: 'existing-server' });
      vi.mocked(mockServerRepository.find).mockResolvedValue([existingServer]);

      await expect(
        runWithContext(testContext, async () => {
          return await service.createRealm(dto);
        })
      ).rejects.toThrow(RealmNameAlreadyExistsError);
    });

    it('should create server with default settings and limits', async () => {
      const dto: CreateRealmDTO = {
        name: 'test-server',
        displayName: 'Test Server',
        ownerId: 'owner-123',
      };

      vi.mocked(mockServerRepository.find).mockResolvedValue([]);

      const result = await runWithContext(testContext, async () => {
        return await service.createRealm(dto);
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

  describe('getRealmById', () => {
    it('should return server when found', async () => {
      const mockServer = createTestServer();
      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);

      const result = await runWithContext(testContext, async () => {
        return await service.getRealmById('server-123');
      });

      expect(result).toBe(mockServer);
      expect(mockServerRepository.find).toHaveBeenCalledWith({ id: 'server-123' });
    });

    it('should throw error when server not found', async () => {
      vi.mocked(mockServerRepository.find).mockResolvedValue([]);

      await expect(
        runWithContext(testContext, async () => {
          return await service.getRealmById('nonexistent');
        })
      ).rejects.toThrow(RealmNotFoundError);
    });
  });

  describe('queryServers', () => {
    it('should return servers by owner', async () => {
      const mockServers = [createTestServer(), createTestServer()];
      vi.mocked(mockServerRepository.find).mockResolvedValue(mockServers);

      const result = await runWithContext(testContext, async () => {
        return await service.queryServers({ ownerId: 'owner-123' });
      });

      expect(result).toEqual(mockServers);
      expect(mockServerRepository.find).toHaveBeenCalledWith({ ownerId: 'owner-123' });
    });

    it('should return servers by status', async () => {
      const mockServers = [createTestServer()];
      vi.mocked(mockServerRepository.find).mockResolvedValue(mockServers);

      const result = await runWithContext(testContext, async () => {
        return await service.queryServers({ status: 'active' });
      });

      expect(result).toEqual(mockServers);
      expect(mockServerRepository.find).toHaveBeenCalledWith({ status: 'active' });
    });

    it('should return all servers when no filters', async () => {
      const mockServers = [createTestServer(), createTestServer()];
      vi.mocked(mockServerRepository.find).mockResolvedValue(mockServers);

      const result = await runWithContext(testContext, async () => {
        return await service.queryServers();
      });

      expect(result).toEqual(mockServers);
      expect(mockServerRepository.find).toHaveBeenCalledWith(undefined);
    });
  });

  describe('updateRealm', () => {
    it('should update realm successfully', async () => {
      const mockServer = createTestServer({ owner_id: 'owner-123' });
      const updatedServer = createTestServer({ name: 'updated-name', owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.find).mockResolvedValueOnce([mockServer]).mockResolvedValueOnce([]);
      vi.spyOn(mockServer, 'updateName').mockReturnValue(updatedServer);

      const dto: UpdateRealmDTO = {
        name: 'updated-name',
      };

      const result = await runWithContext(testContext, async () => {
        return await service.updateRealm('server-123', dto);
      });

      expect(result).toBe(updatedServer);
      expect(mockServer.updateName).toHaveBeenCalledWith('updated-name');
      expect(mockServerRepository.update).toHaveBeenCalledWith(updatedServer, 'server-123');
    });

    it('should throw error when user is not owner', async () => {
      const mockServer = createTestServer({ owner_id: 'other-owner' });
      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);

      const dto: UpdateRealmDTO = {
        name: 'updated-name',
      };

      await expect(
        runWithContext(testContext, async () => {
          return await service.updateRealm('server-123', dto);
        })
      ).rejects.toThrow(UnauthorizedRealmAccessError);
    });

    it('should throw error when new name already exists', async () => {
      const mockServer = createTestServer({ realm_id: 'server-123', owner_id: 'owner-123' });
      const existingServer = createTestServer({ realm_id: 'server-456', name: 'existing-name' });

      vi.mocked(mockServerRepository.find)
        .mockResolvedValueOnce([mockServer])  // First call: getRealmById
        .mockResolvedValueOnce([existingServer]);  // Second call: check name exists

      const dto: UpdateRealmDTO = {
        name: 'existing-name',
      };

      await expect(
        runWithContext(testContext, async () => {
          return await service.updateRealm('server-123', dto);
        })
      ).rejects.toThrow(RealmNameAlreadyExistsError);
    });
  });

  describe('updateRealmSettings', () => {
    it('should update realm settings successfully', async () => {
      const mockServer = createTestServer({ owner_id: 'owner-123' });
      const updatedServer = createTestServer({ owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);
      vi.spyOn(mockServer, 'updateSettings').mockReturnValue(updatedServer);

      const dto: UpdateRealmSettingsDTO = {
        allowPublicChannels: false,
        requireApproval: true,
      };

      const result = await runWithContext(testContext, async () => {
        return await service.updateRealmSettings('server-123', dto);
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
      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);

      const dto: UpdateRealmSettingsDTO = {
        allowPublicChannels: false,
      };

      await expect(
        runWithContext(testContext, async () => {
          return await service.updateRealmSettings('server-123', dto);
        })
      ).rejects.toThrow(UnauthorizedRealmAccessError);
    });
  });

  describe('updateRealmLimits', () => {
    it('should update realm limits successfully', async () => {
      const mockServer = createTestServer({ owner_id: 'owner-123' });
      const updatedServer = createTestServer({ owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);
      vi.spyOn(mockServer, 'updateLimits').mockReturnValue(updatedServer);

      const dto: UpdateRealmLimitsDTO = {
        maxMembers: 200,
        maxProjects: 100,
      };

      const result = await runWithContext(testContext, async () => {
        return await service.updateRealmLimits('server-123', dto);
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

      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);
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
      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);
      vi.spyOn(mockServer, 'isActive').mockReturnValue(false);

      await expect(
        runWithContext(testContext, async () => {
          return await service.suspendServer('server-123');
        })
      ).rejects.toThrow(RealmNotActiveError);
    });
  });

  describe('activateServer', () => {
    it('should activate realm successfully', async () => {
      const mockServer = createTestServer({ status: 'suspended', owner_id: 'owner-123' });
      const activatedServer = createTestServer({ status: 'active', owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);
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

  describe('archiveRealm', () => {
    it('should archive realm successfully', async () => {
      const mockServer = createTestServer({ status: 'active', owner_id: 'owner-123' });
      const archivedServer = createTestServer({ status: 'archived', owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);
      vi.spyOn(mockServer, 'archive').mockReturnValue(archivedServer);
      vi.spyOn(mockServer, 'isArchived').mockReturnValue(false);

      const result = await runWithContext(testContext, async () => {
        return await service.archiveRealm('server-123');
      });

      expect(result).toBe(archivedServer);
      expect(mockServer.archive).toHaveBeenCalled();
      expect(mockServerRepository.update).toHaveBeenCalledWith(archivedServer, 'server-123');
    });

    it('should throw error when server is already archived', async () => {
      const mockServer = createTestServer({ status: 'archived', owner_id: 'owner-123' });
      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);
      vi.spyOn(mockServer, 'isArchived').mockReturnValue(true);

      await expect(
        runWithContext(testContext, async () => {
          return await service.archiveRealm('server-123');
        })
      ).rejects.toThrow(RealmAlreadyArchivedError);
    });
  });

  describe('unarchiveRealm', () => {
    it('should unarchive server successfully', async () => {
      const mockServer = createTestServer({ status: 'archived', owner_id: 'owner-123' });
      const unarchivedServer = createTestServer({ status: 'active', owner_id: 'owner-123' });

      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);
      vi.spyOn(mockServer, 'unarchive').mockReturnValue(unarchivedServer);
      vi.spyOn(mockServer, 'isArchived').mockReturnValue(true);

      const result = await runWithContext(testContext, async () => {
        return await service.unarchiveRealm('server-123');
      });

      expect(result).toBe(unarchivedServer);
      expect(mockServer.unarchive).toHaveBeenCalled();
      expect(mockServerRepository.update).toHaveBeenCalledWith(unarchivedServer, 'server-123');
    });

    it('should throw error when server is not archived', async () => {
      const mockServer = createTestServer({ status: 'active', owner_id: 'owner-123' });
      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);
      vi.spyOn(mockServer, 'isArchived').mockReturnValue(false);

      await expect(
        runWithContext(testContext, async () => {
          return await service.unarchiveRealm('server-123');
        })
      ).rejects.toThrow(RealmNotArchivedError);
    });
  });

  describe('deleteRealm', () => {
    it('should delete realm successfully', async () => {
      const mockServer = createTestServer({ owner_id: 'owner-123' });
      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);

      await runWithContext(testContext, async () => {
        return await service.deleteRealm('server-123');
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
      vi.mocked(mockServerRepository.find).mockResolvedValue([mockServer]);

      await expect(
        runWithContext(testContext, async () => {
          return await service.deleteRealm('server-123');
        })
      ).rejects.toThrow(UnauthorizedRealmAccessError);
    });
  });
});

// Helper function to create test server
function createTestServer(overrides?: Partial<any>): RealmEntity {
  return RealmEntity.create({
    realm_id: 'server-123',
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
