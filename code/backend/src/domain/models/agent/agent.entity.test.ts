import { describe, it, expect } from 'vitest';
import { AgentEntity } from './agent.entity';

describe('AgentEntity', () => {
  const validProps = {
    agentId: 'agent-001',
    name: 'test-agent',
    displayName: 'Test Agent',
    description: 'A test agent',
    status: 'idle' as const,
    scope: 'project' as const,
        projectIds: ['project-1'],
    capabilities: ['chat', 'code-review'],
    tags: ['test', 'dev'],
    createdBy: 'user-001',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  describe('create', () => {
    it('should create a valid agent', () => {
      const agent = AgentEntity.create(validProps);
      expect(agent.agentId).toBe('agent-001');
      expect(agent.name).toBe('test-agent');
      expect(agent.displayName).toBe('Test Agent');
      expect(agent.status).toBe('idle');
    });

    it('should throw error for empty agentId', () => {
      expect(() => AgentEntity.create({ ...validProps, agentId: '' })).toThrow();
    });

    it('should throw error for empty name', () => {
      expect(() => AgentEntity.create({ ...validProps, name: '' })).toThrow();
    });

    it('should throw error for invalid status', () => {
      expect(() => AgentEntity.create({ ...validProps, status: 'invalid' as any })).toThrow();
    });
  });

  describe('status management', () => {
    it('should activate an idle agent', () => {
      const agent = AgentEntity.create(validProps);
      const activated = agent.activate();
      expect(activated.status).toBe('active');
    });

    it('should deactivate an active agent', () => {
      const agent = AgentEntity.create({ ...validProps, status: 'active' });
      const deactivated = agent.deactivate();
      expect(deactivated.status).toBe('idle');
    });

    it('should disable an agent', () => {
      const agent = AgentEntity.create(validProps);
      const disabled = agent.disable();
      expect(disabled.status).toBe('disabled');
    });
  });

  describe('sub-config updates', () => {
    it('should update runtime config', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateRuntimeConfig({ model: 'claude-sonnet-4-6', temperature: 0.7 });
      expect(updated.runtimeConfig?.model).toBe('claude-sonnet-4-6');
      expect(updated.runtimeConfig?.temperature).toBe(0.7);
    });

    it('should reject invalid temperature', () => {
      const agent = AgentEntity.create(validProps);
      expect(() => agent.updateRuntimeConfig({ model: 'test', temperature: 3 })).toThrow('Temperature must be between 0 and 2');
    });

    it('should update persona', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updatePersona({ name: 'Bob', role: 'developer', tone: 'friendly' });
      expect(updated.persona?.name).toBe('Bob');
      expect(updated.persona?.role).toBe('developer');
    });

    it('should update skills', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateSkills({ skillIds: ['skill-1', 'skill-2'] });
      expect(updated.skills?.skillIds).toEqual(['skill-1', 'skill-2']);
    });

    it('should update tools', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateTools({ toolIds: ['tool-1'] });
      expect(updated.tools?.toolIds).toEqual(['tool-1']);
    });

    it('should update triggers', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateTriggers({ onMention: true, onDirectMessage: false });
      expect(updated.triggers?.onMention).toBe(true);
    });
  });

  describe('canBeStarted', () => {
    it('should return false without runtime config', () => {
      const agent = AgentEntity.create(validProps);
      expect(agent.canBeStarted()).toBe(false);
    });

    it('should return true with runtime config model', () => {
      const agent = AgentEntity.create(validProps).updateRuntimeConfig({ model: 'claude-sonnet-4-6' });
      expect(agent.canBeStarted()).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON with snake_case', () => {
      const agent = AgentEntity.create(validProps);
      const json = agent.toJSON();
      expect(json.agent_id).toBe('agent-001');
      expect(json.display_name).toBe('Test Agent');
      expect(json.created_by).toBe('user-001');
    });

    it('should deserialize from JSON', () => {
      const agent = AgentEntity.create(validProps);
      const json = agent.toJSON();
      const deserialized = AgentEntity.fromJSON(json);
      expect(deserialized.agentId).toBe(agent.agentId);
      expect(deserialized.name).toBe(agent.name);
    });

    it('should roundtrip sub-configs', () => {
      const agent = AgentEntity.create(validProps)
        .updateRuntimeConfig({ model: 'claude-sonnet-4-6', temperature: 0.5 })
        .updatePersona({ name: 'Helper', role: 'assistant' });
      const json = agent.toJSON();
      const deserialized = AgentEntity.fromJSON(json);
      expect(deserialized.runtimeConfig?.model).toBe('claude-sonnet-4-6');
      expect(deserialized.persona?.name).toBe('Helper');
    });
  });

  describe('equality', () => {
    it('should be equal if agentId matches', () => {
      const a1 = AgentEntity.create(validProps);
      const a2 = AgentEntity.create(validProps);
      expect(a1.equals(a2)).toBe(true);
    });

    it('should not be equal if agentId differs', () => {
      const a1 = AgentEntity.create(validProps);
      const a2 = AgentEntity.create({ ...validProps, agentId: 'agent-002' });
      expect(a1.equals(a2)).toBe(false);
    });
  });
});
