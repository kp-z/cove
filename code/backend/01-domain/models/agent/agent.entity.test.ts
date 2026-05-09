import { describe, it, expect } from 'vitest';
import { AgentEntity } from './agent.entity';

describe('AgentEntity', () => {
  const validProps = {
    agentId: 'agent-001',
    name: 'Alice',
    displayName: 'Alice Agent',
    description: 'Senior architect agent',
    status: 'active' as const,
    capabilities: ['code-review', 'architecture'],
    tags: ['architect', 'senior'],
    createdBy: 'user-001',
    createdAt: new Date('2026-04-26T00:00:00Z'),
  };

  describe('creation', () => {
    it('should create an agent with valid properties', () => {
      const agent = AgentEntity.create(validProps);

      expect(agent.agentId).toBe('agent-001');
      expect(agent.name).toBe('Alice');
      expect(agent.displayName).toBe('Alice Agent');
      expect(agent.description).toBe('Senior architect agent');
      expect(agent.status).toBe('active');
      expect(agent.capabilities).toEqual(['code-review', 'architecture']);
      expect(agent.tags).toEqual(['architect', 'senior']);
    });

    it('should throw error for empty agentId', () => {
      expect(() => {
        AgentEntity.create({ ...validProps, agentId: '' });
      }).toThrow('Agent ID cannot be empty');
    });

    it('should throw error for empty name', () => {
      expect(() => {
        AgentEntity.create({ ...validProps, name: '' });
      }).toThrow('Agent name cannot be empty');
    });

    it('should throw error for invalid status', () => {
      expect(() => {
        AgentEntity.create({ ...validProps, status: 'running' as any });
      }).toThrow('Invalid agent status');
    });

    it('should create agent with optional fields omitted', () => {
      const minimalProps = {
        agentId: 'agent-002',
        name: 'Bob',
        displayName: 'Bob Agent',
        status: 'idle' as const,
        createdBy: 'user-001',
        createdAt: new Date(),
      };
      const agent = AgentEntity.create(minimalProps);

      expect(agent.description).toBeUndefined();
      expect(agent.capabilities).toEqual([]);
      expect(agent.tags).toEqual([]);
    });
  });

  describe('status management', () => {
    it('should activate an idle agent', () => {
      const agent = AgentEntity.create({ ...validProps, status: 'idle' });
      const activated = agent.activate();

      expect(activated.status).toBe('active');
      expect(agent.status).toBe('idle'); // immutable
    });

    it('should deactivate an active agent', () => {
      const agent = AgentEntity.create(validProps);
      const deactivated = agent.deactivate();

      expect(deactivated.status).toBe('idle');
    });

    it('should not activate an already active agent', () => {
      const agent = AgentEntity.create(validProps);
      expect(() => agent.activate()).toThrow('Agent is already active');
    });

    it('should disable an agent', () => {
      const agent = AgentEntity.create(validProps);
      const disabled = agent.disable();

      expect(disabled.status).toBe('disabled');
    });
  });

  describe('immutability', () => {
    it('should return new instance when updating name', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateName('Bob');

      expect(updated.name).toBe('Bob');
      expect(agent.name).toBe('Alice');
      expect(updated).not.toBe(agent);
    });

    it('should return new instance when updating displayName', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateDisplayName('Bob Agent');

      expect(updated.displayName).toBe('Bob Agent');
      expect(agent.displayName).toBe('Alice Agent');
    });

    it('should return new instance when updating description', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateDescription('Updated description');

      expect(updated.description).toBe('Updated description');
      expect(agent.description).toBe('Senior architect agent');
    });

    it('should return new instance when adding capability', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.addCapability('testing');

      expect(updated.capabilities).toEqual(['code-review', 'architecture', 'testing']);
      expect(agent.capabilities).toEqual(['code-review', 'architecture']);
    });

    it('should not add duplicate capability', () => {
      const agent = AgentEntity.create(validProps);
      expect(() => agent.addCapability('code-review')).toThrow('Capability already exists');
    });

    it('should return new instance when removing capability', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.removeCapability('code-review');

      expect(updated.capabilities).toEqual(['architecture']);
      expect(agent.capabilities).toEqual(['code-review', 'architecture']);
    });

    it('should return new instance when adding tag', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.addTag('backend');

      expect(updated.tags).toEqual(['architect', 'senior', 'backend']);
      expect(agent.tags).toEqual(['architect', 'senior']);
    });

    it('should not add duplicate tag', () => {
      const agent = AgentEntity.create(validProps);
      expect(() => agent.addTag('architect')).toThrow('Tag already exists');
    });

    it('should return new instance when removing tag', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.removeTag('architect');

      expect(updated.tags).toEqual(['senior']);
      expect(agent.tags).toEqual(['architect', 'senior']);
    });
  });

  describe('equality', () => {
    it('should be equal when agentId matches', () => {
      const a1 = AgentEntity.create(validProps);
      const a2 = AgentEntity.create({ ...validProps, name: 'Bob' });

      expect(a1.equals(a2)).toBe(true);
    });

    it('should not be equal when agentId differs', () => {
      const a1 = AgentEntity.create(validProps);
      const a2 = AgentEntity.create({ ...validProps, agentId: 'agent-002' });

      expect(a1.equals(a2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const agent = AgentEntity.create(validProps);
      const json = agent.toJSON();

      expect(json.agent_id).toBe('agent-001');
      expect(json.name).toBe('Alice');
      expect(json.display_name).toBe('Alice Agent');
      expect(json.description).toBe('Senior architect agent');
      expect(json.status).toBe('active');
      expect(json.capabilities).toEqual(['code-review', 'architecture']);
      expect(json.tags).toEqual(['architect', 'senior']);
    });

    it('should deserialize from JSON', () => {
      const json = {
        agent_id: 'agent-001',
        name: 'Alice',
        display_name: 'Alice Agent',
        description: 'Senior architect agent',
        status: 'active' as const,
        capabilities: ['code-review', 'architecture'],
        tags: ['architect'],
        created_by: 'user-001',
        created_at: '2026-04-26T00:00:00.000Z',
      };
      const agent = AgentEntity.fromJSON(json);

      expect(agent.agentId).toBe('agent-001');
      expect(agent.name).toBe('Alice');
      expect(agent.displayName).toBe('Alice Agent');
      expect(agent.description).toBe('Senior architect agent');
      expect(agent.capabilities).toEqual(['code-review', 'architecture']);
    });
  });
});
