import { describe, it, expect } from 'vitest';
import { AgentEntity } from './agent.entity';

describe('AgentEntity', () => {
  const validProps = {
    agentId: 'agent-001',
    name: 'Alice',
    displayName: 'Alice Agent',
    description: 'Senior architect agent',
    framework: 'claude_code' as const,
    agentType: 'session' as const,
    status: 'active' as const,
    category: 'engineering',
    priority: 'high' as const,
    tags: ['architect', 'senior'],
    createdBy: 'user-001',
    createdAt: new Date('2026-04-26T00:00:00Z'),
  };

  describe('create', () => {
    it('should create a valid agent', () => {
      const agent = AgentEntity.create(validProps);

      expect(agent.agentId).toBe('agent-001');
      expect(agent.name).toBe('Alice');
      expect(agent.displayName).toBe('Alice Agent');
      expect(agent.description).toBe('Senior architect agent');
      expect(agent.framework).toBe('claude_code');
      expect(agent.agentType).toBe('session');
      expect(agent.status).toBe('active');
      expect(agent.category).toBe('engineering');
      expect(agent.priority).toBe('high');
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

    it('should throw error for invalid framework', () => {
      expect(() => {
        AgentEntity.create({ ...validProps, framework: 'unknown' as any });
      }).toThrow('Invalid framework');
    });

    it('should throw error for invalid agent type', () => {
      expect(() => {
        AgentEntity.create({ ...validProps, agentType: 'unknown' as any });
      }).toThrow('Invalid agent type');
    });

    it('should throw error for invalid status', () => {
      expect(() => {
        AgentEntity.create({ ...validProps, status: 'unknown' as any });
      }).toThrow('Invalid agent status');
    });

    it('should throw error for invalid priority', () => {
      expect(() => {
        AgentEntity.create({ ...validProps, priority: 'unknown' as any });
      }).toThrow('Invalid priority');
    });
  });

  describe('status management', () => {
    it('should activate an idle agent', () => {
      const agent = AgentEntity.create({ ...validProps, status: 'idle' });
      const activated = agent.activate();

      expect(activated.status).toBe('active');
      expect(activated.updatedAt).toBeDefined();
    });

    it('should throw error when activating an already active agent', () => {
      const agent = AgentEntity.create(validProps);
      expect(() => agent.activate()).toThrow('Agent is already active');
    });

    it('should deactivate an active agent', () => {
      const agent = AgentEntity.create(validProps);
      const deactivated = agent.deactivate();

      expect(deactivated.status).toBe('idle');
      expect(deactivated.updatedAt).toBeDefined();
    });

    it('should disable an agent', () => {
      const agent = AgentEntity.create(validProps);
      const disabled = agent.disable();

      expect(disabled.status).toBe('disabled');
      expect(disabled.updatedAt).toBeDefined();
    });

    it('should mark agent as error', () => {
      const agent = AgentEntity.create(validProps);
      const errored = agent.markAsError();

      expect(errored.status).toBe('error');
      expect(errored.updatedAt).toBeDefined();
    });
  });

  describe('immutable updates', () => {
    it('should update name', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateName('Bob');

      expect(updated.name).toBe('Bob');
      expect(updated.updatedAt).toBeDefined();
      expect(agent.name).toBe('Alice'); // original unchanged
    });

    it('should update display name', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateDisplayName('Bob Agent');

      expect(updated.displayName).toBe('Bob Agent');
      expect(updated.updatedAt).toBeDefined();
    });

    it('should update description', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateDescription('New description');

      expect(updated.description).toBe('New description');
      expect(updated.updatedAt).toBeDefined();
    });

    it('should update category', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updateCategory('design');

      expect(updated.category).toBe('design');
      expect(updated.updatedAt).toBeDefined();
    });

    it('should update priority', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.updatePriority('low');

      expect(updated.priority).toBe('low');
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('tags management', () => {
    it('should add a tag', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.addTag('fullstack');

      expect(updated.tags).toContain('fullstack');
      expect(updated.tags).toHaveLength(3);
      expect(updated.updatedAt).toBeDefined();
    });

    it('should throw error when adding duplicate tag', () => {
      const agent = AgentEntity.create(validProps);
      expect(() => agent.addTag('architect')).toThrow('Tag already exists');
    });

    it('should remove a tag', () => {
      const agent = AgentEntity.create(validProps);
      const updated = agent.removeTag('architect');

      expect(updated.tags).not.toContain('architect');
      expect(updated.tags).toHaveLength(1);
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('config files management', () => {
    it('should update config files', () => {
      const agent = AgentEntity.create(validProps);
      const configFiles = {
        runtime: 'runtime.yaml',
        persona: 'persona.yaml',
        permissions: 'permissions.yaml',
      };
      const updated = agent.updateConfigFiles(configFiles);

      expect(updated.configFiles).toEqual(configFiles);
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('memory config management', () => {
    it('should update memory config', () => {
      const agent = AgentEntity.create(validProps);
      const memoryConfig = {
        loading: {
          always: ['memory/MEMORY.md'],
          onTaskStart: [{
            path: 'memory/knowledge/',
            strategy: 'semantic' as const,
            topK: 3,
            queryFrom: 'task_description',
          }],
        },
        tokenBudget: {
          alwaysTokens: 2000,
          retrievalTokens: 6000,
          totalTokens: 8000,
        },
        vectorIndex: {
          enabled: false,
          provider: 'local' as const,
          model: 'text-embedding-3-small',
          indexPath: 'memory/.index/',
          autoUpdate: true,
        },
      };
      const updated = agent.updateMemoryConfig(memoryConfig);

      expect(updated.memoryConfig).toEqual(memoryConfig);
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('equality', () => {
    it('should be equal if agentId is the same', () => {
      const agent1 = AgentEntity.create(validProps);
      const agent2 = AgentEntity.create(validProps);

      expect(agent1.equals(agent2)).toBe(true);
    });

    it('should not be equal if agentId is different', () => {
      const agent1 = AgentEntity.create(validProps);
      const agent2 = AgentEntity.create({ ...validProps, agentId: 'agent-002' });

      expect(agent1.equals(agent2)).toBe(false);
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
      expect(json.framework).toBe('claude_code');
      expect(json.agent_type).toBe('session');
      expect(json.status).toBe('active');
      expect(json.category).toBe('engineering');
      expect(json.priority).toBe('high');
      expect(json.tags).toEqual(['architect', 'senior']);
      expect(json.created_at).toBe('2026-04-26T00:00:00.000Z');
      expect(json.created_by).toBe('user-001');
    });

    it('should deserialize from JSON', () => {
      const json = {
        agent_id: 'agent-001',
        name: 'Alice',
        display_name: 'Alice Agent',
        description: 'Senior architect agent',
        framework: 'claude_code' as const,
        agent_type: 'session' as const,
        status: 'active' as const,
        category: 'engineering',
        priority: 'high' as const,
        tags: ['architect', 'senior'],
        created_at: '2026-04-26T00:00:00.000Z',
        created_by: 'user-001',
      };

      const agent = AgentEntity.fromJSON(json);

      expect(agent.agentId).toBe('agent-001');
      expect(agent.name).toBe('Alice');
      expect(agent.displayName).toBe('Alice Agent');
      expect(agent.description).toBe('Senior architect agent');
      expect(agent.framework).toBe('claude_code');
      expect(agent.agentType).toBe('session');
      expect(agent.status).toBe('active');
      expect(agent.category).toBe('engineering');
      expect(agent.priority).toBe('high');
      expect(agent.tags).toEqual(['architect', 'senior']);
    });

    it('should serialize and deserialize with memory config', () => {
      const memoryConfig = {
        loading: {
          always: ['memory/MEMORY.md'],
          onTaskStart: [{
            path: 'memory/knowledge/',
            strategy: 'semantic' as const,
            topK: 3,
            queryFrom: 'task_description',
          }],
        },
        tokenBudget: {
          alwaysTokens: 2000,
          retrievalTokens: 6000,
          totalTokens: 8000,
        },
        vectorIndex: {
          enabled: false,
          provider: 'local' as const,
          model: 'text-embedding-3-small',
          indexPath: 'memory/.index/',
          autoUpdate: true,
        },
      };

      const agent = AgentEntity.create({ ...validProps, memoryConfig });
      const json = agent.toJSON();
      const deserialized = AgentEntity.fromJSON(json);

      expect(deserialized.memoryConfig).toEqual(memoryConfig);
    });
  });
});
