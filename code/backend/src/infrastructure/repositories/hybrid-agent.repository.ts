import { HybridRepository } from './hybrid-repository.base';
import { AgentEntity, AgentStatus } from '../../domain/models/agent/agent.entity';
import { IAgentRepository } from '../../application/interfaces/repositories/agent.repository.interface';
import {
  IAgentConfigStore,
  AgentRuntimeConfig,
  PersonaConfig,
  SkillsConfig,
  ToolsConfig,
  TriggersConfig,
  AgentFilePaths,
} from '../../application/interfaces/agent-config-store.interface';
import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import deepmerge from 'deepmerge';
import { CovePathResolver } from '../storage/cove-path-resolver';

const DEFAULT_RUNTIME_CONFIG: AgentRuntimeConfig = {
  model: {
    provider: 'anthropic',
    model_name: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    max_tokens: 8192,
  },
  api: {
    base_url: 'https://api.anthropic.com/v1',
    timeout_seconds: 300,
  },
  context: {
    max_context_window: 200000,
    compression_threshold: 0.8,
  },
  retry: {
    max_retries: 3,
    backoff_strategy: 'exponential',
  },
};

interface AgentDbRecord {
  id: string;
  name: string;
  displayName: string;
  status: string;
  category: string;
  configPath: string;
  createdAt: Date;
}

interface AgentContent {
  description?: string;
  capabilities: string[];
  tags: string[];
  runtimeConfig?: any;
  persona?: any;
  skills?: any;
  tools?: any;
  triggers?: any;
  createdBy: string;
}

export class HybridAgentRepository
  extends HybridRepository<AgentEntity, AgentDbRecord, AgentContent>
  implements IAgentRepository, IAgentConfigStore
{
  constructor(
    prisma: any,
    storage: any,
    logger: any,
    private readonly projectRoot: string
  ) {
    super(prisma, storage, logger);
  }

  getEntityType(): string {
    return 'agents';
  }

  getEntityId(entity: AgentEntity): string {
    return entity.agentId;
  }

  toDomain(dbRecord: AgentDbRecord, content: AgentContent): AgentEntity {
    return AgentEntity.create({
      agentId: dbRecord.id,
      name: dbRecord.name,
      displayName: dbRecord.displayName,
      description: content.description,
      status: dbRecord.status as AgentStatus,
      category: dbRecord.category as any,
      capabilities: content.capabilities,
      tags: content.tags,
      runtimeConfig: content.runtimeConfig,
      persona: content.persona,
      skills: content.skills,
      tools: content.tools,
      triggers: content.triggers,
      createdBy: content.createdBy,
      createdAt: dbRecord.createdAt,
    });
  }

  toDatabase(entity: AgentEntity): AgentDbRecord {
    return {
      id: entity.agentId,
      name: entity.name,
      displayName: entity.displayName,
      status: entity.status,
      category: entity.category,
      configPath: '',
      createdAt: entity.createdAt,
    };
  }

  toStorage(entity: AgentEntity): AgentContent {
    return {
      description: entity.description,
      capabilities: entity.capabilities ? [...entity.capabilities] : [],
      tags: entity.tags ? [...entity.tags] : [],
      runtimeConfig: entity.runtimeConfig,
      persona: entity.persona,
      skills: entity.skills,
      tools: entity.tools,
      triggers: entity.triggers,
      createdBy: entity.createdBy,
    };
  }

  protected async saveToDatabase(
    dbRecord: AgentDbRecord,
    contentPath: string
  ): Promise<void> {
    await this.prisma.agent.create({
      data: {
        ...dbRecord,
        configPath: contentPath,
      },
    });
  }

  protected async updateInDatabase(
    entityId: string,
    dbRecord: AgentDbRecord,
    contentPath: string
  ): Promise<void> {
    await this.prisma.agent.update({
      where: { id: entityId },
      data: {
        ...dbRecord,
        configPath: contentPath,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string): Promise<void> {
    await this.prisma.agent.delete({
      where: { id: entityId },
    });
  }

  protected async findInDatabase(entityId: string): Promise<AgentDbRecord | null> {
    return await this.prisma.agent.findUnique({
      where: { id: entityId },
    });
  }

  protected getContentPath(dbRecord: AgentDbRecord): string {
    return dbRecord.configPath;
  }

  // ============================================
  // IAgentRepository 接口实现
  // ============================================

  async findById(agentId: string): Promise<AgentEntity | null> {
    return this.findEntityById(agentId);
  }

  async findByStatus(status: AgentStatus): Promise<AgentEntity[]> {
    const dbRecords = await this.prisma.agent.findMany({
      where: { status },
    });
    return this.loadEntities(dbRecords);
  }

  async findByCreator(createdBy: string): Promise<AgentEntity[]> {
    // 需要从文件内容中过滤，因为 createdBy 存储在文件中
    const allAgents = await this.findAll();
    return allAgents.filter(agent => agent.createdBy === createdBy);
  }

  async findAll(): Promise<AgentEntity[]> {
    const dbRecords = await this.prisma.agent.findMany();
    return this.loadEntities(dbRecords);
  }

  async save(agent: AgentEntity): Promise<void> {
    await this.saveEntity(agent);
  }

  async update(agent: AgentEntity): Promise<void> {
    await this.updateEntity(agent);
  }

  async delete(agentId: string): Promise<void> {
    await this.deleteEntity(agentId);
  }

  async exists(agentId: string): Promise<boolean> {
    const count = await this.prisma.agent.count({
      where: { id: agentId },
    });
    return count > 0;
  }

  // ============================================
  // IAgentConfigStore 接口实现
  // ============================================

  private getAgentConfigDir(agentId: string): string {
    // Agent configs are stored in .cove/storage/agents/{agentId}/
    return path.join(
      CovePathResolver.getCoveRoot(this.projectRoot),
      'storage',
      'agents',
      agentId
    );
  }

  private async writeYamlAtomic(dir: string, filename: string, data: any): Promise<void> {
    const filePath = path.join(dir, filename);
    const tmpPath = filePath + '.tmp';
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tmpPath, YAML.stringify(data), 'utf-8');
    await fs.rename(tmpPath, filePath);
  }

  async getRuntime(agentId: string): Promise<AgentRuntimeConfig> {
    const configPath = path.join(this.getAgentConfigDir(agentId), 'runtime.yaml');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      return YAML.parse(raw) as AgentRuntimeConfig;
    } catch {
      return DEFAULT_RUNTIME_CONFIG;
    }
  }

  async updateRuntime(agentId: string, partial: Record<string, unknown>): Promise<AgentRuntimeConfig> {
    const current = await this.getRuntime(agentId);
    const merged = deepmerge(current, partial) as unknown as AgentRuntimeConfig;
    const dir = this.getAgentConfigDir(agentId);
    await this.writeYamlAtomic(dir, 'runtime.yaml', merged);
    return merged;
  }

  async getPersona(agentId: string): Promise<PersonaConfig> {
    const configPath = path.join(this.getAgentConfigDir(agentId), 'persona.yaml');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      return YAML.parse(raw) as PersonaConfig;
    } catch {
      // Return default persona
      const agent = await this.findById(agentId);
      return {
        name: agent?.displayName || 'Agent',
        title: 'AI Assistant',
        description: agent?.description || 'Cove agent',
        language_style: {
          formality: 'professional',
          verbosity: 'concise',
          preferred_language: 'zh-CN',
        },
        behavior: {
          proactive: false,
          ask_before_action: true,
        },
      };
    }
  }

  async updatePersona(agentId: string, partial: Record<string, unknown>): Promise<PersonaConfig> {
    const current = await this.getPersona(agentId);
    const merged = deepmerge(current, partial) as unknown as PersonaConfig;
    const dir = this.getAgentConfigDir(agentId);
    await this.writeYamlAtomic(dir, 'persona.yaml', merged);
    return merged;
  }

  async getSkills(agentId: string): Promise<SkillsConfig | null> {
    const configPath = path.join(this.getAgentConfigDir(agentId), 'config', 'skills.yaml');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      return YAML.parse(raw) as SkillsConfig;
    } catch {
      return null;
    }
  }

  async updateSkills(agentId: string, skills: SkillsConfig): Promise<void> {
    const dir = this.getAgentConfigDir(agentId);
    await this.writeYamlAtomic(dir, 'config/skills.yaml', skills);
  }

  async getTools(agentId: string): Promise<ToolsConfig | null> {
    const configPath = path.join(this.getAgentConfigDir(agentId), 'config', 'tools.yaml');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      return YAML.parse(raw) as ToolsConfig;
    } catch {
      return null;
    }
  }

  async updateTools(agentId: string, tools: ToolsConfig): Promise<void> {
    const dir = this.getAgentConfigDir(agentId);
    await this.writeYamlAtomic(dir, 'config/tools.yaml', tools);
  }

  async getTriggers(agentId: string): Promise<TriggersConfig | null> {
    const configPath = path.join(this.getAgentConfigDir(agentId), 'config', 'triggers.yaml');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      return YAML.parse(raw) as TriggersConfig;
    } catch {
      return null;
    }
  }

  async updateTriggers(agentId: string, triggers: TriggersConfig): Promise<void> {
    const dir = this.getAgentConfigDir(agentId);
    await this.writeYamlAtomic(dir, 'config/triggers.yaml', triggers);
  }

  async getFilePaths(agentId: string): Promise<AgentFilePaths> {
    const dir = this.getAgentConfigDir(agentId);
    return {
      root: dir,
      agent_md: path.join(dir, 'agent.md'),
      runtime_yaml: path.join(dir, 'runtime.yaml'),
      persona_yaml: path.join(dir, 'persona.yaml'),
      permissions_yaml: null, // Optional file
      memory_index: path.join(dir, 'memory', 'MEMORY.md'),
      config_dir: path.join(dir, 'config'),
      workspace_dir: path.join(dir, 'workspace'),
      assets_dir: path.join(dir, 'assets'),
    };
  }
}
