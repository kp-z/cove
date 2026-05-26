import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HybridAgentRepository } from './hybrid-agent.repository';
import { AgentEntity, AgentStatus, AgentScope } from '../../domain/models/agent/agent.entity';
import { StorageService } from '../storage/storage.service';
import { TestDatabaseHelper } from './test-database.helper';
import { Logger } from '../../application/interfaces/logger.interface';
import fs from 'fs/promises';
import path from 'path';

describe('HybridAgentRepository', () => {
  let repository: HybridAgentRepository;
  let testDb: TestDatabaseHelper;
  let storage: StorageService;
  let logger: Logger;
  let testCoveRoot: string;

  beforeEach(async () => {
    console.log('🧪 Starting test suite...');
    testDb = new TestDatabaseHelper();
    await testDb.setup();
    await testDb.createTestRealm(); // Use helper method

    testCoveRoot = path.join(process.cwd(), '.test-storage', `test-${Date.now()}`);
    await fs.mkdir(testCoveRoot, { recursive: true });

    logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    storage = new StorageService(testCoveRoot, logger);
    repository = new HybridAgentRepository(testDb.prisma, storage, logger, testCoveRoot);
  });

  afterEach(async () => {
    await testDb.teardown();
    // Clean up test storage directory
    try {
      await fs.rm(testCoveRoot, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    console.log('✅ Test suite completed');
  });

  const createTestAgent = (overrides?: Partial<any>): AgentEntity => {
    return AgentEntity.create({
      realmId: 'test-realm',
      agentId: 'agent-1',
      name: 'test-agent',
      displayName: 'Test Agent',
      description: 'A test agent',
      status: 'idle' as AgentStatus,
      scope: 'user' as AgentScope,
      projectIds: [],
      capabilities: ['coding', 'testing'],
      tags: ['backend', 'typescript'],
      createdBy: 'user-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    });
  };

  const createAgentDirectory = async (agentId: string, content: {
    description?: string;
    capabilities?: string[];
    tags?: string[];
    createdBy?: string;
    runtimeConfig?: any;
    persona?: any;
    skills?: any;
    tools?: any;
    triggers?: any;
  }) => {
    const agentDir = path.join(testCoveRoot, 'storage', 'agents', agentId);
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(path.join(agentDir, 'config'), { recursive: true });

    // Create agent.md
    const agentMd = `# ${agentId}

${content.description || 'Test agent description'}

## Capabilities
${(content.capabilities || []).map(c => `- ${c}`).join('\n')}

## Tags
${(content.tags || []).map(t => `- ${t}`).join('\n')}

## Metadata
Created By: ${content.createdBy || 'system'}
`;
    await fs.writeFile(path.join(agentDir, 'agent.md'), agentMd, 'utf-8');

    // Create YAML files if provided
    if (content.runtimeConfig) {
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(agentDir, 'runtime.yaml'),
        yaml.stringify(content.runtimeConfig),
        'utf-8'
      );
    }

    if (content.persona) {
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(agentDir, 'persona.yaml'),
        yaml.stringify(content.persona),
        'utf-8'
      );
    }

    if (content.skills) {
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(agentDir, 'config', 'skills.yaml'),
        yaml.stringify(content.skills),
        'utf-8'
      );
    }

    if (content.tools) {
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(agentDir, 'config', 'tools.yaml'),
        yaml.stringify(content.tools),
        'utf-8'
      );
    }

    if (content.triggers) {
      const yaml = require('yaml');
      await fs.writeFile(
        path.join(agentDir, 'config', 'triggers.yaml'),
        yaml.stringify(content.triggers),
        'utf-8'
      );
    }

    return agentDir;
  };

  describe('save', () => {
    it('should save agent to database and create directory structure', async () => {
      const agent = createTestAgent();

      await repository.save(agent, 'realm-1');

      const found = await repository.findById('agent-1');
      expect(found).toBeDefined();
      expect(found?.agentId).toBe('agent-1');
      expect(found?.name).toBe('test-agent');
      expect(found?.displayName).toBe('Test Agent');
      expect(found?.status).toBe('idle');
      expect(found?.scope).toBe('user');
    });

    it('should save agent with all optional fields', async () => {
      const agent = createTestAgent({
        description: 'Full test agent',
        capabilities: ['coding', 'testing', 'debugging'],
        tags: ['backend', 'typescript', 'nodejs'],
        runtimeConfig: {
          model: 'claude-sonnet-4',
          temperature: 0.8,
          maxTokens: 4096,
        },
        persona: {
          name: 'Test Bot',
          role: 'Developer',
          tone: 'professional',
        },
      });

      await repository.save(agent, 'realm-1');

      const found = await repository.findById('agent-1');
      expect(found?.description).toBe('Full test agent');
      expect(found?.capabilities).toEqual(['coding', 'testing', 'debugging']);
      expect(found?.tags).toEqual(['backend', 'typescript', 'nodejs']);
      expect(found?.runtimeConfig).toBeDefined();
      expect(found?.persona).toBeDefined();
    });

    it('should save project-scoped agent with projectIds', async () => {
      const agent = createTestAgent({
        scope: 'project' as AgentScope,
        projectIds: ['project-1', 'project-2'],
      });

      await repository.save(agent, 'realm-1');

      const found = await repository.findById('agent-1');
      expect(found?.scope).toBe('project');
      expect(found?.projectIds).toEqual(['project-1', 'project-2']);
    });
  });

  describe('update', () => {
    it('should update agent in database and storage', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const updated = agent.updateDisplayName('Updated Agent');
      await repository.update(updated, 'realm-1');

      const found = await repository.findById('agent-1');
      expect(found?.displayName).toBe('Updated Agent');
    });

    it('should update agent status', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const activated = agent.activate();
      await repository.update(activated, 'realm-1');

      const found = await repository.findById('agent-1');
      expect(found?.status).toBe('active');
    });
  });

  describe('delete', () => {
    it('should delete agent from database', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      await repository.delete('agent-1');

      const found = await repository.findById('agent-1');
      expect(found).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return null for non-existent agent', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should find agent by id', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const found = await repository.findById('agent-1');
      expect(found).toBeDefined();
      expect(found?.agentId).toBe('agent-1');
    });
  });

  describe('findByStatus', () => {
    it('should find agents by status', async () => {
      const agent1 = createTestAgent({ agentId: 'agent-1', status: 'active' as AgentStatus });
      const agent2 = createTestAgent({ agentId: 'agent-2', status: 'idle' as AgentStatus });
      const agent3 = createTestAgent({ agentId: 'agent-3', status: 'active' as AgentStatus });

      await repository.save(agent1, 'realm-1');
      await repository.save(agent2, 'realm-1');
      await repository.save(agent3, 'realm-1');

      const activeAgents = await repository.findByStatus('active');
      expect(activeAgents).toHaveLength(2);
      expect(activeAgents.map(a => a.agentId).sort()).toEqual(['agent-1', 'agent-3']);
    });

    it('should return empty array when no agents match status', async () => {
      const agent = createTestAgent({ status: 'idle' as AgentStatus });
      await repository.save(agent, 'realm-1');

      const activeAgents = await repository.findByStatus('active');
      expect(activeAgents).toHaveLength(0);
    });
  });

  describe('findByCreator', () => {
    it('should find agents by creator', async () => {
      const agent1 = createTestAgent({ agentId: 'agent-1', createdBy: 'user-1' });
      const agent2 = createTestAgent({ agentId: 'agent-2', createdBy: 'user-2' });
      const agent3 = createTestAgent({ agentId: 'agent-3', createdBy: 'user-1' });

      await repository.save(agent1, 'realm-1');
      await repository.save(agent2, 'realm-1');
      await repository.save(agent3, 'realm-1');

      const user1Agents = await repository.findByCreator('user-1');
      expect(user1Agents).toHaveLength(2);
      expect(user1Agents.map(a => a.agentId).sort()).toEqual(['agent-1', 'agent-3']);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no agents exist', async () => {
      const agents = await repository.findAll();
      expect(agents).toHaveLength(0);
    });

    it('should return all agents', async () => {
      const agent1 = createTestAgent({ agentId: 'agent-1' });
      const agent2 = createTestAgent({ agentId: 'agent-2' });

      await repository.save(agent1, 'realm-1');
      await repository.save(agent2, 'realm-1');

      const agents = await repository.findAll();
      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.agentId).sort()).toEqual(['agent-1', 'agent-2']);
    });
  });

  describe('exists', () => {
    it('should return false for non-existent agent', async () => {
      const exists = await repository.exists('non-existent');
      expect(exists).toBe(false);
    });

    it('should return true for existing agent', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const exists = await repository.exists('agent-1');
      expect(exists).toBe(true);
    });
  });

  describe('IAgentConfigStore - Runtime Config', () => {
    it('should get default runtime config when file does not exist', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const runtime = await repository.getRuntime('agent-1');
      expect(runtime).toBeDefined();
      expect(runtime.model).toBeDefined();
    });

    it('should update runtime config', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const updated = await repository.updateRuntime('agent-1', {
        model: { model_name: 'claude-opus-4' },
      });

      expect(updated.model.model_name).toBe('claude-opus-4');

      const retrieved = await repository.getRuntime('agent-1');
      expect(retrieved.model.model_name).toBe('claude-opus-4');
    });
  });

  describe('IAgentConfigStore - Persona', () => {
    it('should get default persona when file does not exist', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const persona = await repository.getPersona('agent-1');
      expect(persona).toBeDefined();
      expect(persona.name).toBeDefined();
    });

    it('should update persona config', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const updated = await repository.updatePersona('agent-1', {
        name: 'Custom Bot',
        title: 'Senior Developer',
      });

      expect(updated.name).toBe('Custom Bot');
      expect(updated.title).toBe('Senior Developer');

      const retrieved = await repository.getPersona('agent-1');
      expect(retrieved.name).toBe('Custom Bot');
    });
  });

  describe('IAgentConfigStore - Skills', () => {
    it('should return null when skills file does not exist', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const skills = await repository.getSkills('agent-1');
      expect(skills).toBeNull();
    });

    it('should update and retrieve skills', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const skillsConfig = {
        enabled: ['skill-1', 'skill-2'],
        disabled: ['skill-3'],
      };

      await repository.updateSkills('agent-1', skillsConfig);

      const retrieved = await repository.getSkills('agent-1');
      expect(retrieved).toEqual(skillsConfig);
    });
  });

  describe('IAgentConfigStore - Tools', () => {
    it('should return null when tools file does not exist', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const tools = await repository.getTools('agent-1');
      expect(tools).toBeNull();
    });

    it('should update and retrieve tools', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const toolsConfig = {
        enabled: ['tool-1', 'tool-2'],
        disabled: ['tool-3'],
      };

      await repository.updateTools('agent-1', toolsConfig);

      const retrieved = await repository.getTools('agent-1');
      expect(retrieved).toEqual(toolsConfig);
    });
  });

  describe('IAgentConfigStore - Triggers', () => {
    it('should return null when triggers file does not exist', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const triggers = await repository.getTriggers('agent-1');
      expect(triggers).toBeNull();
    });

    it('should update and retrieve triggers', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const triggersConfig = {
        onMention: true,
        onDirectMessage: true,
        onSchedule: '0 9 * * *',
      };

      await repository.updateTriggers('agent-1', triggersConfig);

      const retrieved = await repository.getTriggers('agent-1');
      expect(retrieved).toEqual(triggersConfig);
    });
  });

  describe('IAgentConfigStore - File Paths', () => {
    it('should return correct file paths for agent', async () => {
      const agent = createTestAgent();
      await repository.save(agent, 'realm-1');

      const paths = await repository.getFilePaths('agent-1');

      expect(paths.root).toContain('agents/agent-1');
      expect(paths.agent_md).toContain('agent.md');
      expect(paths.runtime_yaml).toContain('runtime.yaml');
      expect(paths.persona_yaml).toContain('persona.yaml');
      expect(paths.config_dir).toContain('config');
      expect(paths.workspace_dir).toContain('workspace');
      expect(paths.memory_index).toContain('MEMORY.md');
    });
  });

  describe('Agent Scopes', () => {
    it('should save and retrieve built-in agent', async () => {
      const agent = createTestAgent({
        scope: 'built-in' as AgentScope,
      });

      await repository.save(agent, 'realm-1');

      const found = await repository.findById('agent-1');
      expect(found?.scope).toBe('built-in');
    });

    it('should save and retrieve admin agent', async () => {
      const agent = createTestAgent({
        scope: 'admin' as AgentScope,
      });

      await repository.save(agent, 'realm-1');

      const found = await repository.findById('agent-1');
      expect(found?.scope).toBe('admin');
    });
  });

  describe('Agent Status Transitions', () => {
    it('should handle status transitions correctly', async () => {
      const agent = createTestAgent({ status: 'idle' as AgentStatus });
      await repository.save(agent, 'realm-1');

      // Activate
      const activated = agent.activate();
      await repository.update(activated, 'realm-1');
      let found = await repository.findById('agent-1');
      expect(found?.status).toBe('active');

      // Deactivate
      const deactivated = activated.deactivate();
      await repository.update(deactivated, 'realm-1');
      found = await repository.findById('agent-1');
      expect(found?.status).toBe('idle');

      // Disable
      const disabled = deactivated.disable();
      await repository.update(disabled, 'realm-1');
      found = await repository.findById('agent-1');
      expect(found?.status).toBe('disabled');
    });
  });
});
