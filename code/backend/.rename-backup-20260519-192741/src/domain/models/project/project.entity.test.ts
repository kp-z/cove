import { describe, it, expect } from 'vitest';
import { ProjectEntity } from './project.entity';

describe('ProjectEntity', () => {
  const validProps = {
    projectId: 'proj-001',
    name: 'Cove',
    displayName: 'Cove 平台',
    description: 'AI Agent 协作平台',
    status: 'active' as const,
    visibility: 'private' as const,
    ownerId: 'user-001',
    createdAt: new Date('2026-04-01T00:00:00Z'),
  };

  describe('creation', () => {
    it('should create a project with valid properties', () => {
      const project = ProjectEntity.create(validProps);

      expect(project.projectId).toBe('proj-001');
      expect(project.name).toBe('Cove');
      expect(project.displayName).toBe('Cove 平台');
      expect(project.status).toBe('active');
      expect(project.visibility).toBe('private');
    });

    it('should throw error for empty projectId', () => {
      expect(() => {
        ProjectEntity.create({ ...validProps, projectId: '' });
      }).toThrow('Project ID cannot be empty');
    });

    it('should throw error for empty name', () => {
      expect(() => {
        ProjectEntity.create({ ...validProps, name: '' });
      }).toThrow('Project name cannot be empty');
    });

    it('should throw error for invalid status', () => {
      expect(() => {
        ProjectEntity.create({ ...validProps, status: 'deleted' as any });
      }).toThrow('Invalid project status');
    });

    it('should throw error for invalid visibility', () => {
      expect(() => {
        ProjectEntity.create({ ...validProps, visibility: 'secret' as any });
      }).toThrow('Invalid visibility');
    });

    it('should default channels, agents, okrs to empty arrays', () => {
      const project = ProjectEntity.create(validProps);

      expect(project.channelIds).toEqual([]);
      expect(project.agentIds).toEqual([]);
      expect(project.okrIds).toEqual([]);
    });
  });

  describe('status management', () => {
    it('should archive a project', () => {
      const project = ProjectEntity.create(validProps);
      const archived = project.archive();

      expect(archived.status).toBe('archived');
      expect(project.status).toBe('active'); // immutable
    });

    it('should not archive an already archived project', () => {
      const project = ProjectEntity.create({ ...validProps, status: 'archived' });

      expect(() => project.archive()).toThrow('Project is already archived');
    });

    it('should activate a maintenance project', () => {
      const project = ProjectEntity.create({ ...validProps, status: 'maintenance' });
      const activated = project.activate();

      expect(activated.status).toBe('active');
    });

    it('should not activate an active project', () => {
      const project = ProjectEntity.create(validProps);

      expect(() => project.activate()).toThrow('Project is already active');
    });
  });

  describe('association management', () => {
    it('should add a channel', () => {
      const project = ProjectEntity.create(validProps);
      const updated = project.addChannel('channel-001');

      expect(updated.channelIds).toEqual(['channel-001']);
      expect(project.channelIds).toEqual([]); // immutable
    });

    it('should not add duplicate channel', () => {
      const project = ProjectEntity.create({
        ...validProps,
        channelIds: ['channel-001'],
      });

      expect(() => project.addChannel('channel-001')).toThrow('Channel already exists');
    });

    it('should remove a channel', () => {
      const project = ProjectEntity.create({
        ...validProps,
        channelIds: ['channel-001', 'channel-002'],
      });
      const updated = project.removeChannel('channel-001');

      expect(updated.channelIds).toEqual(['channel-002']);
    });

    it('should add an agent', () => {
      const project = ProjectEntity.create(validProps);
      const updated = project.addAgent('agent-001');

      expect(updated.agentIds).toEqual(['agent-001']);
    });

    it('should add an OKR', () => {
      const project = ProjectEntity.create(validProps);
      const updated = project.addOkr('okr-001');

      expect(updated.okrIds).toEqual(['okr-001']);
    });
  });

  describe('immutability', () => {
    it('should return new instance when updating name', () => {
      const project = ProjectEntity.create(validProps);
      const updated = project.updateName('New Name');

      expect(updated.name).toBe('New Name');
      expect(project.name).toBe('Cove');
      expect(updated).not.toBe(project);
    });
  });

  describe('equality', () => {
    it('should be equal when projectId matches', () => {
      const p1 = ProjectEntity.create(validProps);
      const p2 = ProjectEntity.create({ ...validProps, name: 'Different' });

      expect(p1.equals(p2)).toBe(true);
    });

    it('should not be equal when projectId differs', () => {
      const p1 = ProjectEntity.create(validProps);
      const p2 = ProjectEntity.create({ ...validProps, projectId: 'proj-002' });

      expect(p1.equals(p2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const project = ProjectEntity.create({
        ...validProps,
        channelIds: ['channel-001'],
        agentIds: ['agent-001'],
      });
      const json = project.toJSON();

      expect(json.project_id).toBe('proj-001');
      expect(json.name).toBe('Cove');
      expect(json.channels).toEqual(['channel-001']);
      expect(json.agents).toEqual(['agent-001']);
    });

    it('should deserialize from JSON', () => {
      const json = {
        project_id: 'proj-001',
        name: 'Cove',
        display_name: 'Cove 平台',
        description: 'AI Agent 协作平台',
        status: 'active' as const,
        visibility: 'private' as const,
        owner_id: 'user-001',
        channels: ['channel-001'],
        agents: ['agent-001'],
        okrs: ['okr-001'],
        created_at: '2026-04-01T00:00:00.000Z',
      };
      const project = ProjectEntity.fromJSON(json);

      expect(project.projectId).toBe('proj-001');
      expect(project.channelIds).toEqual(['channel-001']);
      expect(project.agentIds).toEqual(['agent-001']);
      expect(project.okrIds).toEqual(['okr-001']);
    });
  });
});
