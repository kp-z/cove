/**
 * RealmRepository Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RealmRepository } from './realm.repository';
import { RealmEntity, RealmStatus, RealmVisibility } from '../../domain/models/realm/realm.entity';
import { TestDatabaseHelper } from './test-database.helper';

const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('RealmRepository', () => {
  let testDb: TestDatabaseHelper;
  let repository: RealmRepository;

  beforeEach(async () => {
    testDb = new TestDatabaseHelper();
    await testDb.setup();
    repository = new RealmRepository(testDb.prisma, mockLogger);

    // Create test user for realm ownership
    await testDb.prisma.user.create({
      data: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
        status: 'active',
        profilePath: '/metadata/user-1.json',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await testDb.teardown();
  });

  const createTestRealm = (overrides?: Partial<any>): RealmEntity => {
    return RealmEntity.create({
      realm_id: 'realm-1',
      name: 'test-realm',
      display_name: 'Test Realm',
      description: 'Test realm description',
      owner_id: 'user-1',
      status: 'active' as RealmStatus,
      visibility: 'public' as RealmVisibility,
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
        max_channels: 200,
        max_agents: 20,
        max_storage_gb: 100,
      },
      meta: {
        tags: ['test'],
        icon: 'icon.png',
      },
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    });
  };

  describe('save', () => {
    it('should save a new realm', async () => {
      const realm = createTestRealm();

      await repository.save(realm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found).toHaveLength(1);
      expect(found[0].realm_id).toBe('realm-1');
      expect(found[0].name).toBe('test-realm');
      expect(found[0].display_name).toBe('Test Realm');
      expect(found[0].description).toBe('Test realm description');
      expect(found[0].owner_id).toBe('user-1');
      expect(found[0].status).toBe('active');
      expect(found[0].visibility).toBe('public');
    });

    it('should save realm settings correctly', async () => {
      const realm = createTestRealm();

      await repository.save(realm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].settings).toEqual({
        allow_public_channels: true,
        allow_private_channels: true,
        allow_dm: true,
        require_approval: false,
        default_member_role: 'member',
      });
    });

    it('should save realm limits correctly', async () => {
      const realm = createTestRealm();

      await repository.save(realm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].limits).toEqual({
        max_members: 100,
        max_projects: 50,
        max_channels: 200,
        max_agents: 20,
        max_storage_gb: 100,
      });
    });

    it('should save realm meta correctly', async () => {
      const realm = createTestRealm();

      await repository.save(realm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].meta).toEqual({
        tags: ['test'],
        icon: 'icon.png',
      });
    });
  });

  describe('update', () => {
    it('should update an existing realm', async () => {
      const realm = createTestRealm();
      await repository.save(realm, 'realm-1');

      const updatedRealm = realm.updateDisplayName('Updated Realm').updateDescription('Updated description');

      await repository.update(updatedRealm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].display_name).toBe('Updated Realm');
      expect(found[0].description).toBe('Updated description');
    });

    it('should update realm status', async () => {
      const realm = createTestRealm();
      await repository.save(realm, 'realm-1');

      const suspendedRealm = realm.updateStatus('suspended');

      await repository.update(suspendedRealm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].status).toBe('suspended');
    });

    it('should update realm settings', async () => {
      const realm = createTestRealm();
      await repository.save(realm, 'realm-1');

      const updatedRealm = realm.updateSettings({
        ...realm.settings,
        require_approval: true,
        allow_dm: false,
      });

      await repository.update(updatedRealm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].settings.require_approval).toBe(true);
      expect(found[0].settings.allow_dm).toBe(false);
    });
  });

  describe('find', () => {
    beforeEach(async () => {
      // Create multiple realms for testing
      const realm1 = createTestRealm({ realm_id: 'realm-1', name: 'realm-1' });
      const realm2 = createTestRealm({
        realm_id: 'realm-2',
        name: 'realm-2',
        status: 'suspended' as RealmStatus,
      });
      const realm3 = createTestRealm({
        realm_id: 'realm-3',
        name: 'realm-3',
        owner_id: 'user-1',
      });

      await repository.save(realm1, 'realm-1');
      await repository.save(realm2, 'realm-2');
      await repository.save(realm3, 'realm-3');
    });

    it('should find realm by id', async () => {
      const found = await repository.find({ id: 'realm-1' });

      expect(found).toHaveLength(1);
      expect(found[0].realm_id).toBe('realm-1');
    });

    it('should return empty array if realm not found', async () => {
      const found = await repository.find({ id: 'non-existent' });

      expect(found).toHaveLength(0);
    });

    it('should find realms by owner', async () => {
      const found = await repository.find({ ownerId: 'user-1' });

      expect(found.length).toBeGreaterThanOrEqual(3);
      expect(found.every(r => r.owner_id === 'user-1')).toBe(true);
    });

    it('should find realms by status', async () => {
      const found = await repository.find({ status: 'suspended' });

      expect(found).toHaveLength(1);
      expect(found[0].realm_id).toBe('realm-2');
      expect(found[0].status).toBe('suspended');
    });

    it('should find all realms when no filters provided', async () => {
      const found = await repository.find();

      expect(found.length).toBeGreaterThanOrEqual(3);
    });

    it('should combine multiple filters', async () => {
      const found = await repository.find({
        ownerId: 'user-1',
        status: 'active',
      });

      expect(found.length).toBeGreaterThanOrEqual(2);
      expect(found.every(r => r.owner_id === 'user-1' && r.status === 'active')).toBe(true);
    });
  });

  describe('findByName', () => {
    it('should find realm by name', async () => {
      const realm = createTestRealm();
      await repository.save(realm, 'realm-1');

      const found = await repository.findByName('test-realm');

      expect(found).not.toBeNull();
      expect(found!.realm_id).toBe('realm-1');
      expect(found!.name).toBe('test-realm');
    });

    it('should return null if realm not found', async () => {
      const found = await repository.findByName('non-existent');

      expect(found).toBeNull();
    });

    it('should be case-sensitive', async () => {
      const realm = createTestRealm();
      await repository.save(realm, 'realm-1');

      const found = await repository.findByName('TEST-REALM');

      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a realm', async () => {
      const realm = createTestRealm();
      await repository.save(realm, 'realm-1');

      await repository.delete('realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found).toHaveLength(0);
    });

    it('should throw error when deleting non-existent realm', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true if realm exists', async () => {
      const realm = createTestRealm();
      await repository.save(realm, 'realm-1');

      const exists = await repository.exists('realm-1');

      expect(exists).toBe(true);
    });

    it('should return false if realm does not exist', async () => {
      const exists = await repository.exists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('Realm Visibility', () => {
    it('should save and retrieve public realm', async () => {
      const realm = createTestRealm({ visibility: 'public' as RealmVisibility });
      await repository.save(realm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].visibility).toBe('public');
    });

    it('should save and retrieve private realm', async () => {
      const realm = createTestRealm({ visibility: 'private' as RealmVisibility });
      await repository.save(realm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].visibility).toBe('private');
    });
  });

  describe('Realm Status Transitions', () => {
    it('should handle status transitions correctly', async () => {
      const realm = createTestRealm({ status: 'active' as RealmStatus });
      await repository.save(realm, 'realm-1');

      // Active -> Suspended
      let updated = realm.updateStatus('suspended');
      await repository.update(updated, 'realm-1');
      let found = await repository.find({ id: 'realm-1' });
      expect(found[0].status).toBe('suspended');

      // Suspended -> Archived
      updated = found[0].updateStatus('archived');
      await repository.update(updated, 'realm-1');
      found = await repository.find({ id: 'realm-1' });
      expect(found[0].status).toBe('archived');
    });
  });

  describe('Edge Cases', () => {
    it('should handle realm without description', async () => {
      const realm = createTestRealm({ description: undefined });
      await repository.save(realm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].description).toBeUndefined();
    });

    it('should handle realm with empty meta', async () => {
      const realm = createTestRealm({ meta: {} });
      await repository.save(realm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].meta).toEqual({});
    });

    it('should handle realm with minimal limits', async () => {
      const realm = createTestRealm({
        limits: {
          max_members: 1,
          max_projects: 0,
          max_channels: 0,
          max_agents: 0,
          max_storage_gb: 1,
        },
      });
      await repository.save(realm, 'realm-1');

      const found = await repository.find({ id: 'realm-1' });
      expect(found[0].limits.max_members).toBe(1);
      expect(found[0].limits.max_projects).toBe(0);
    });
  });
});
