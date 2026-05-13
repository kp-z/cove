import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import YAML from 'yaml';
import deepmerge from 'deepmerge';
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

export class FileSystemAgentRepository implements IAgentRepository, IAgentConfigStore {
  constructor(private readonly basePath: string) {}

  // ===== IAgentRepository =====

  async save(agent: AgentEntity): Promise<void> {
    const dir = this.agentDir(agent.agentId);
    await this.createSkeleton(dir);
    await this.writeFrontmatter(dir, agent);
    await this.writeYamlAtomic(dir, 'runtime.yaml', DEFAULT_RUNTIME_CONFIG);
    await this.writeYamlAtomic(dir, 'persona.yaml', this.buildDefaultPersona(agent));
    await this.writeMemoryIndex(dir, agent);
  }

  async findById(agentId: string): Promise<AgentEntity | null> {
    if (!await this.exists(agentId)) return null;
    const dir = this.agentDir(agentId);
    const fm = await this.readFrontmatter(dir);
    return AgentEntity.fromJSON(fm);
  }

  async findByStatus(status: AgentStatus): Promise<AgentEntity[]> {
    const all = await this.findAll();
    return all.filter(a => a.status === status);
  }

  async findByCreator(createdBy: string): Promise<AgentEntity[]> {
    const all = await this.findAll();
    return all.filter(a => a.createdBy === createdBy);
  }

  async findAll(): Promise<AgentEntity[]> {
    await fs.mkdir(this.basePath, { recursive: true });
    const entries = await fs.readdir(this.basePath, { withFileTypes: true });
    const agents: AgentEntity[] = [];
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const agent = await this.findById(entry.name);
        if (agent) agents.push(agent);
      }
    }
    return agents.sort((a, b) => a.name.localeCompare(b.name));
  }

  async update(agent: AgentEntity): Promise<void> {
    const dir = this.agentDir(agent.agentId);
    await this.writeFrontmatter(dir, agent);
  }

  async delete(agentId: string): Promise<void> {
    const src = this.agentDir(agentId);
    const archiveDir = path.join(this.basePath, '.archived');
    await fs.mkdir(archiveDir, { recursive: true });
    await fs.rename(src, path.join(archiveDir, `${agentId}_${Date.now()}`));
  }

  async exists(agentId: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.agentDir(agentId), 'agent.md'));
      return true;
    } catch {
      return false;
    }
  }

  // ===== IAgentConfigStore =====

  async getRuntime(agentId: string): Promise<AgentRuntimeConfig> {
    return this.readYaml(this.agentDir(agentId), 'runtime.yaml') as Promise<AgentRuntimeConfig>;
  }

  async updateRuntime(agentId: string, partial: Record<string, unknown>): Promise<AgentRuntimeConfig> {
    const dir = this.agentDir(agentId);
    const current = await this.readYaml(dir, 'runtime.yaml');
    const merged = deepmerge(current, partial) as unknown as AgentRuntimeConfig;
    await this.writeYamlAtomic(dir, 'runtime.yaml', merged);
    return merged;
  }

  async getPersona(agentId: string): Promise<PersonaConfig> {
    return this.readYaml(this.agentDir(agentId), 'persona.yaml') as Promise<PersonaConfig>;
  }

  async updatePersona(agentId: string, partial: Record<string, unknown>): Promise<PersonaConfig> {
    const dir = this.agentDir(agentId);
    const current = await this.readYaml(dir, 'persona.yaml');
    const merged = deepmerge(current, partial) as unknown as PersonaConfig;
    await this.writeYamlAtomic(dir, 'persona.yaml', merged);
    return merged;
  }

  async getSkills(agentId: string): Promise<SkillsConfig | null> {
    return this.readYamlOrNull(this.agentDir(agentId), 'config/skills.yaml');
  }

  async updateSkills(agentId: string, skills: SkillsConfig): Promise<void> {
    await this.writeYamlAtomic(this.agentDir(agentId), 'config/skills.yaml', skills);
  }

  async getTools(agentId: string): Promise<ToolsConfig | null> {
    return this.readYamlOrNull(this.agentDir(agentId), 'config/tools.yaml');
  }

  async updateTools(agentId: string, tools: ToolsConfig): Promise<void> {
    await this.writeYamlAtomic(this.agentDir(agentId), 'config/tools.yaml', tools);
  }

  async getTriggers(agentId: string): Promise<TriggersConfig | null> {
    return this.readYamlOrNull(this.agentDir(agentId), 'config/triggers.yaml');
  }

  async updateTriggers(agentId: string, triggers: TriggersConfig): Promise<void> {
    await this.writeYamlAtomic(this.agentDir(agentId), 'config/triggers.yaml', triggers);
  }

  async getFilePaths(agentId: string): Promise<AgentFilePaths> {
    const dir = this.agentDir(agentId);
    return {
      root: dir,
      agent_md: path.join(dir, 'agent.md'),
      runtime_yaml: path.join(dir, 'runtime.yaml'),
      persona_yaml: path.join(dir, 'persona.yaml'),
      permissions_yaml: await this.fileExistsOrNull(dir, 'permissions.yaml'),
      memory_index: path.join(dir, 'memory', 'MEMORY.md'),
      config_dir: path.join(dir, 'config'),
      workspace_dir: path.join(dir, 'workspace'),
      assets_dir: path.join(dir, 'assets'),
    };
  }

  // ===== Private helpers =====

  private agentDir(agentId: string): string {
    return path.join(this.basePath, agentId);
  }

  private async createSkeleton(dir: string): Promise<void> {
    const dirs = [
      dir,
      path.join(dir, 'assets'),
      path.join(dir, 'config'),
      path.join(dir, 'memory'),
      path.join(dir, 'memory', 'knowledge'),
      path.join(dir, 'memory', 'diary'),
      path.join(dir, 'workspace'),
      path.join(dir, 'workspace', 'temp'),
      path.join(dir, 'workspace', 'subtask'),
      path.join(dir, 'workspace', 'conversation'),
    ];
    for (const d of dirs) {
      await fs.mkdir(d, { recursive: true });
    }
  }

  private async writeFrontmatter(dir: string, agent: AgentEntity): Promise<void> {
    const json = agent.toJSON();
    const frontmatter = {
      agent_id: json.agent_id,
      name: json.name,
      display_name: json.display_name,
      status: json.status,
      category: json.category,
      capabilities: json.capabilities,
      tags: json.tags,
      created_by: json.created_by,
      created_at: json.created_at,
    };

    const description = json.description || `${json.display_name} - Cove Agent`;
    const content = matter.stringify(
      `# ${json.display_name}\n\n${description}\n`,
      frontmatter
    );
    await fs.writeFile(path.join(dir, 'agent.md'), content, 'utf-8');
  }

  private async readFrontmatter(dir: string): Promise<any> {
    const raw = await fs.readFile(path.join(dir, 'agent.md'), 'utf-8');
    const { data } = matter(raw);
    return data;
  }

  private buildDefaultPersona(agent: AgentEntity): PersonaConfig {
    return {
      name: agent.displayName,
      title: 'AI Assistant',
      description: agent.description || `${agent.displayName} is a Cove agent.`,
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

  private async writeMemoryIndex(dir: string, agent: AgentEntity): Promise<void> {
    const content = `# ${agent.displayName} Memory Index\n\nThis file is managed by the Agent Runtime. Do not edit manually.\n`;
    await fs.writeFile(path.join(dir, 'memory', 'MEMORY.md'), content, 'utf-8');
  }

  private async readYaml(dir: string, filename: string): Promise<any> {
    const raw = await fs.readFile(path.join(dir, filename), 'utf-8');
    return YAML.parse(raw);
  }

  private async readYamlOrNull(dir: string, filename: string): Promise<any> {
    try {
      return await this.readYaml(dir, filename);
    } catch {
      return null;
    }
  }

  private async writeYamlAtomic(dir: string, filename: string, data: any): Promise<void> {
    const filePath = path.join(dir, filename);
    const tmpPath = filePath + '.tmp';
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tmpPath, YAML.stringify(data), 'utf-8');
    await fs.rename(tmpPath, filePath);
  }

  private async fileExistsOrNull(dir: string, filename: string): Promise<string | null> {
    const filePath = path.join(dir, filename);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }
}
