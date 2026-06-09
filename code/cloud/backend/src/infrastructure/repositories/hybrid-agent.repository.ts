import { HybridRepository } from './hybrid-repository.base';
import { AgentEntity, AgentStatus, AgentScope } from '../../domain/models/agent/agent.entity';
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
import { getRealmContext } from '../../application/context/realm-context-store';
import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import deepmerge from 'deepmerge';

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
  realmId: string;
  name: string;
  displayName: string;
  status: string;
  scope: string;
  projectIds: string;
  configPath: string;
  // Phase 4 路线 A：Agent 内容真源（JSON 序列化的 AgentContent），可空以兼容历史数据
  contentJson: string | null;
  avatarUrl: string | null;
  avatarType: string;
  createdBy: string;
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
    private readonly coveRoot: string
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
    // Merge avatar fields from database into persona
    const avatar = dbRecord.avatarUrl ? {
      url: dbRecord.avatarUrl,
      type: dbRecord.avatarType as 'uploaded' | 'dicebear' | 'default',
    } : undefined;

    const persona = content.persona ? {
      ...content.persona,
      avatar,
    } : undefined;

    return AgentEntity.create({
      agentId: dbRecord.id,
      realmId: dbRecord.realmId,
      name: dbRecord.name,
      displayName: dbRecord.displayName,
      description: content.description,
      status: dbRecord.status as AgentStatus,
      scope: dbRecord.scope as AgentScope,
      projectIds: JSON.parse(dbRecord.projectIds || '[]'),
      capabilities: content.capabilities,
      tags: content.tags,
      runtimeConfig: content.runtimeConfig,
      persona,
      skills: content.skills,
      tools: content.tools,
      triggers: content.triggers,
      createdBy: content.createdBy,
      createdAt: dbRecord.createdAt,
    });
  }

  toDatabase(entity: AgentEntity): AgentDbRecord {
    // Extract avatar fields from persona
    const persona = entity.persona;
    const avatar = persona?.avatar;

    return {
      id: entity.agentId,
      realmId: entity.realmId,
      name: entity.name,
      displayName: entity.displayName,
      status: entity.status,
      scope: entity.scope,
      projectIds: JSON.stringify(entity.projectIds),
      configPath: '',
      // Phase 4 路线 A：实体内容序列化进 contentJson（DB 为内容真源）
      contentJson: JSON.stringify(this.toStorage(entity)),
      avatarUrl: avatar?.url ?? null,
      avatarType: avatar?.type || 'dicebear',
      createdBy: entity.createdBy,
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

  /**
   * Override saveEntity to create directory structure instead of single JSON file
   * Includes rollback mechanism for atomicity
   */
  protected async saveEntity(entity: AgentEntity, _realmId: string): Promise<void> {
    const entityId = this.getEntityId(entity);
    const entityType = this.getEntityType();
    let filesCreated = false;
    let agentDir: string | undefined;

    try {
      // 1. Create directory structure
      agentDir = path.join(
        this.coveRoot,
        'storage',
        entityType,
        entityId
      );
      await fs.mkdir(agentDir, { recursive: true });
      await fs.mkdir(path.join(agentDir, 'config'), { recursive: true });

      // 2. Write agent.md
      const content = this.toStorage(entity);
      const agentMd = this.generateAgentMd(entity, content);
      await fs.writeFile(path.join(agentDir, 'agent.md'), agentMd, 'utf-8');

      // 3. Write YAML configs if they exist
      if (content.runtimeConfig) {
        await this.writeYamlAtomic(agentDir, 'runtime.yaml', content.runtimeConfig);
      }
      if (content.persona) {
        await this.writeYamlAtomic(agentDir, 'persona.yaml', content.persona);
      }
      if (content.skills) {
        await this.writeYamlAtomic(path.join(agentDir, 'config'), 'skills.yaml', content.skills);
      }
      if (content.tools) {
        await this.writeYamlAtomic(path.join(agentDir, 'config'), 'tools.yaml', content.tools);
      }
      if (content.triggers) {
        await this.writeYamlAtomic(path.join(agentDir, 'config'), 'triggers.yaml', content.triggers);
      }

      filesCreated = true;

      // 4. Save to database with relative path
      const relativePath = path.join('storage', entityType, entityId);
      const dbRecord = this.toDatabase(entity);
      await this.saveToDatabase(dbRecord, relativePath);

      // 5. Validate save result
      const validation = await this.validateEntityConsistency(entityId, _realmId);
      if (!validation.valid) {
        this.logger.warn(`Entity ${entityId} validation failed after save`, {
          issues: validation.issues,
        });
        // Attempt repair
        await this.repairEntityFiles(entityId, _realmId);
      }

      this.logger.info(`Saved agent ${entityId} to directory structure`);
    } catch (error) {
      this.logger.error(`Failed to save agent ${entityId}:`, error instanceof Error ? error : new Error(String(error)));

      // Rollback: if database save failed, delete created files
      if (filesCreated && agentDir) {
        try {
          await fs.rm(agentDir, { recursive: true, force: true });
          this.logger.info(`Rolled back files for agent ${entityId}`);
        } catch (cleanupError) {
          this.logger.error(`Failed to cleanup files after save error`, cleanupError as Error);
        }
      }

      throw error;
    }
  }

  /**
   * Override updateEntity to update directory structure
   */
  protected async updateEntity(entity: AgentEntity, _realmId: string): Promise<void> {
    const entityId = this.getEntityId(entity);
    const entityType = this.getEntityType();

    try {
      // 1. Update directory structure (same as save)
      const agentDir = path.join(
        this.coveRoot,
        'storage',
        entityType,
        entityId
      );
      await fs.mkdir(agentDir, { recursive: true });
      await fs.mkdir(path.join(agentDir, 'config'), { recursive: true });

      // 2. Write agent.md
      const content = this.toStorage(entity);
      const agentMd = this.generateAgentMd(entity, content);
      await fs.writeFile(path.join(agentDir, 'agent.md'), agentMd, 'utf-8');

      // 3. Write YAML configs if they exist
      if (content.runtimeConfig) {
        await this.writeYamlAtomic(agentDir, 'runtime.yaml', content.runtimeConfig);
      }
      if (content.persona) {
        await this.writeYamlAtomic(agentDir, 'persona.yaml', content.persona);
      }
      if (content.skills) {
        await this.writeYamlAtomic(path.join(agentDir, 'config'), 'skills.yaml', content.skills);
      }
      if (content.tools) {
        await this.writeYamlAtomic(path.join(agentDir, 'config'), 'tools.yaml', content.tools);
      }
      if (content.triggers) {
        await this.writeYamlAtomic(path.join(agentDir, 'config'), 'triggers.yaml', content.triggers);
      }

      // 4. Update database
      const relativePath = path.join('storage', entityType, entityId);
      const dbRecord = this.toDatabase(entity);
      await this.updateInDatabase(entityId, dbRecord, relativePath);

      this.logger.info(`Updated agent ${entityId} directory structure`);
    } catch (error) {
      this.logger.error(`Failed to update agent ${entityId}:`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Generate agent.md content from entity
   */
  private generateAgentMd(entity: AgentEntity, content: AgentContent): string {
    const lines: string[] = [];

    lines.push(`# ${entity.displayName}`);
    lines.push('');

    if (content.description) {
      lines.push(content.description);
      lines.push('');
    }

    if (content.capabilities && content.capabilities.length > 0) {
      lines.push('## Capabilities');
      lines.push('');
      content.capabilities.forEach(cap => lines.push(`- ${cap}`));
      lines.push('');
    }

    if (content.tags && content.tags.length > 0) {
      lines.push('## Tags');
      lines.push('');
      content.tags.forEach(tag => lines.push(`- ${tag}`));
      lines.push('');
    }

    lines.push('## Metadata');
    lines.push('');
    lines.push(`**Created By**: ${content.createdBy}`);
    lines.push('');

    return lines.join('\n');
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

  protected async deleteFromDatabase(entityId: string, realmId: string): Promise<void> {
    await this.prisma.agent.delete({
      where: { id: entityId, realmId },
    });
  }

  protected async findInDatabase(entityId: string, realmId: string): Promise<AgentDbRecord | null> {
    
    return await this.prisma.agent.findFirst({
      where: {
        id: entityId,
        realmId,
      },
    });
  }

  protected getContentPath(dbRecord: AgentDbRecord): string {
    return dbRecord.configPath;
  }

  /**
   * 从数据库记录重建 AgentEntity
   * 用于修复缺失或损坏的文件
   */
  protected async reconstructEntity(dbRecord: AgentDbRecord): Promise<AgentEntity> {
    // 从数据库记录创建 AgentEntity，使用默认值填充缺失的字段
    const avatar = dbRecord.avatarUrl ? {
      url: dbRecord.avatarUrl,
      type: dbRecord.avatarType as 'uploaded' | 'dicebear' | 'default',
    } : undefined;

    const persona = avatar ? {
      name: dbRecord.displayName,
      role: 'assistant',
      avatar,
    } : undefined;

    return AgentEntity.create({
      agentId: dbRecord.id,
      realmId: dbRecord.realmId,
      name: dbRecord.name,
      displayName: dbRecord.displayName,
      description: `${dbRecord.displayName} agent`,
      status: dbRecord.status as AgentStatus,
      scope: dbRecord.scope as AgentScope,
      projectIds: JSON.parse(dbRecord.projectIds || '[]'),
      capabilities: [],
      tags: [],
      persona,
      createdBy: dbRecord.createdBy,
      createdAt: dbRecord.createdAt,
    });
  }

  /**
   * 覆盖验证方法（Phase 4 路线 A）
   *
   * 注意：不再调用基类基于 `{id}.json` 的一致性检查 —— Agent 使用目录结构 +
   * contentJson，从不写 `.json` 内容文件，调用基类会必然误报 MISSING_CONTENT_FILE
   * 进而在每次 save 后触发 reconstructEntity 修复，用有损默认值覆盖刚写入的内容。
   *
   * 新的有效性判定：DB 记录存在，且（contentJson 可解析）或（agent.md 非空）。
   */
  protected async validateEntityConsistency(
    entityId: string,
    realmId: string
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    const dbRecord = await this.findInDatabase(entityId, realmId);
    if (!dbRecord) {
      return { valid: false, issues: ['MISSING_DB_RECORD'] };
    }

    // 内容真源：contentJson 存在且可解析即视为有效
    if (dbRecord.contentJson) {
      try {
        JSON.parse(dbRecord.contentJson);
        return { valid: true, issues: [] };
      } catch {
        issues.push('INVALID_CONTENT_JSON');
      }
    }

    // 回退：兼容未回填 contentJson 的历史数据，检查目录 agent.md
    const agentMdPath = path.join(this.coveRoot, dbRecord.configPath, 'agent.md');
    try {
      const content = await fs.readFile(agentMdPath, 'utf-8');
      if (content.trim().length === 0) {
        issues.push('EMPTY_AGENT_MD');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        issues.push('MISSING_AGENT_MD');
      } else {
        this.logger.error(`Failed to validate agent.md for ${entityId}`, error);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * 解析 agent 内容（Phase 4 路线 A）
   *
   * 优先使用 DB 的 contentJson（内容真源）；为空时回退读取目录文件，
   * 兼容尚未回填 contentJson 的历史数据。
   */
  private async resolveContent(dbRecord: AgentDbRecord): Promise<AgentContent> {
    if (dbRecord.contentJson) {
      try {
        const parsed = JSON.parse(dbRecord.contentJson) as Partial<AgentContent>;
        return {
          description: parsed.description,
          capabilities: parsed.capabilities ?? [],
          tags: parsed.tags ?? [],
          runtimeConfig: parsed.runtimeConfig,
          persona: parsed.persona,
          skills: parsed.skills,
          tools: parsed.tools,
          triggers: parsed.triggers,
          createdBy: parsed.createdBy ?? dbRecord.createdBy,
        };
      } catch (error) {
        this.logger.warn(`Invalid contentJson for agent ${dbRecord.id}, falling back to files`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return this.loadAgentContent(this.getContentPath(dbRecord));
  }

  /**
   * 从目录结构加载 agent 内容
   * 所有 agents 都使用目录结构：agent.md + YAML 文件
   */
  private async loadAgentContent(configPath: string): Promise<AgentContent> {
    // this.coveRoot is already the complete cove root path (e.g., /Users/kp/.cove)
    // Don't call getCoveRoot() again as it would add another .cove
    const fullPath = path.join(this.coveRoot, configPath);
    return await this.loadFromDirectory(fullPath);
  }

  /**
   * 从目录结构加载 agent 配置
   */
  private async loadFromDirectory(dirPath: string): Promise<AgentContent> {
    // 读取 agent.md（如果不存在则使用默认值）
    const agentMdPath = path.join(dirPath, 'agent.md');
    let agentMd: string;

    try {
      agentMd = await fs.readFile(agentMdPath, 'utf-8');
    } catch (error) {
      // agent.md 文件不存在，使用默认值
      this.logger.warn(`agent.md not found at ${agentMdPath}, using defaults`, {
        path: agentMdPath,
        error: error instanceof Error ? error.message : String(error),
      });
      agentMd = '# Agent\n\nNo description available.\n\n## Capabilities\n\n## Tags\n';
    }

    // 解析 agent.md
    const parsed = this.parseAgentMd(agentMd);

    // 读取 YAML 配置（可选）
    const runtimeConfig = await this.loadYamlIfExists(path.join(dirPath, 'runtime.yaml'));
    const persona = await this.loadYamlIfExists(path.join(dirPath, 'persona.yaml'));
    const skills = await this.loadYamlIfExists(path.join(dirPath, 'config', 'skills.yaml'));
    const tools = await this.loadYamlIfExists(path.join(dirPath, 'config', 'tools.yaml'));
    const triggers = await this.loadYamlIfExists(path.join(dirPath, 'config', 'triggers.yaml'));

    return {
      description: parsed.description,
      capabilities: parsed.capabilities,
      tags: parsed.tags,
      runtimeConfig,
      persona,
      skills,
      tools,
      triggers,
      createdBy: parsed.createdBy,
    };
  }

  /**
   * 解析 agent.md 文件
   */
  private parseAgentMd(content: string): {
    description: string;
    capabilities: string[];
    tags: string[];
    createdBy: string;
  } {
    const lines = content.split('\n');
    let description = '';
    const capabilities: string[] = [];
    const tags: string[] = [];
    let createdBy = 'system';

    let section = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        continue; // Skip title
      } else if (trimmed.startsWith('## Capabilities')) {
        section = 'capabilities';
      } else if (trimmed.startsWith('## Tags')) {
        section = 'tags';
      } else if (trimmed.startsWith('## Metadata')) {
        section = 'metadata';
      } else if (trimmed.startsWith('## ')) {
        section = '';
      } else if (section === 'capabilities' && trimmed.startsWith('- ')) {
        capabilities.push(trimmed.substring(2));
      } else if (section === 'tags' && trimmed.startsWith('- ')) {
        tags.push(trimmed.substring(2));
      } else if (section === 'metadata' && trimmed.includes('Created By')) {
        const match = trimmed.match(/Created By[*:]*\s*(.+)/);
        if (match && match[1]) createdBy = match[1].trim();
      } else if (!section && trimmed && !trimmed.startsWith('#')) {
        description = trimmed;
      }
    }

    return { description, capabilities, tags, createdBy };
  }

  /**
   * 加载 YAML 文件（如果存在）
   */
  private async loadYamlIfExists(filePath: string): Promise<any> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return YAML.parse(raw);
    } catch {
      return undefined;
    }
  }

  /**
   * 重写 findEntityById 以支持目录结构
   */
  protected async findEntityById(entityId: string, realmId: string): Promise<AgentEntity | null> {
    const dbRecord = await this.findInDatabase(entityId, realmId);
    if (!dbRecord) return null;

    const content = await this.resolveContent(dbRecord);

    return this.toDomain(dbRecord, content);
  }

  /**
   * 重写 loadEntities 以支持目录结构
   */
  protected async loadEntities(dbRecords: AgentDbRecord[]): Promise<AgentEntity[]> {
    return await Promise.all(
      dbRecords.map(async (record) => {
        const content = await this.resolveContent(record);
        return this.toDomain(record, content);
      })
    );
  }

  // ============================================
  // IAgentRepository 接口实现
  // ============================================

  async findById(agentId: string, realmId: string): Promise<AgentEntity | null> {
    return this.findEntityById(agentId, realmId);
  }

  async findByStatus(status: AgentStatus): Promise<AgentEntity[]> {
    const context = getRealmContext();
    const dbRecords = await this.prisma.agent.findMany({
      where: {
        status,
        realmId: context.realmId,
      },
    });
    return this.loadEntities(dbRecords);
  }

  async findByCreator(createdBy: string): Promise<AgentEntity[]> {
    // 需要从文件内容中过滤，因为 createdBy 存储在文件中
    const allAgents = await this.findAll();
    return allAgents.filter(agent => agent.createdBy === createdBy);
  }

  async findAll(): Promise<AgentEntity[]> {
    const context = getRealmContext();
    const dbRecords = await this.prisma.agent.findMany({
      where: { realmId: context.realmId },
    });
    return this.loadEntities(dbRecords);
  }

  async save(agent: AgentEntity): Promise<void> {
    await this.saveEntity(agent, agent.realmId);
  }

  async update(agent: AgentEntity): Promise<void> {
    await this.updateEntity(agent, agent.realmId);
  }

  async delete(agentId: string, realmId: string): Promise<void> {
    await this.deleteEntity(agentId, realmId);
  }

  async exists(agentId: string): Promise<boolean> {
    const context = getRealmContext();
    const count = await this.prisma.agent.count({
      where: {
        id: agentId,
        realmId: context.realmId,
      },
    });
    return count > 0;
  }

  // ============================================
  // IAgentConfigStore 接口实现
  // ============================================

  private getAgentConfigDir(agentId: string): string {
    // Agent configs are stored in .cove/storage/agents/{agentId}/
    return path.join(
      this.coveRoot,
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

  // ===== Phase 4 路线 A：contentJson 读写辅助 =====

  /**
   * 读取 DB 中的 agent 内容（contentJson 解析），不存在或解析失败返回 {}。
   */
  private async readDbContent(agentId: string): Promise<Partial<AgentContent>> {
    const { realmId } = getRealmContext();
    const dbRecord = await this.prisma.agent.findFirst({
      where: { id: agentId, realmId },
      select: { contentJson: true },
    });
    if (!dbRecord?.contentJson) return {};
    try {
      return JSON.parse(dbRecord.contentJson) as Partial<AgentContent>;
    } catch {
      return {};
    }
  }

  /**
   * 将内容字段合并写回 DB contentJson（内容真源）。
   * 仅更新传入的字段，其余保留。
   */
  private async writeDbContentPatch(agentId: string, patch: Partial<AgentContent>): Promise<void> {
    const { realmId } = getRealmContext();
    const current = await this.readDbContent(agentId);
    const merged = { ...current, ...patch };
    await this.prisma.agent.updateMany({
      where: { id: agentId, realmId },
      data: { contentJson: JSON.stringify(merged) },
    });
  }

  /**
   * 读取 YAML 文件（不存在返回 null）—— contentJson 缺失时的回退来源
   */
  private async readYamlFileOrNull<T>(agentId: string, relativePath: string): Promise<T | null> {
    const configPath = path.join(this.getAgentConfigDir(agentId), relativePath);
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      return YAML.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async getRuntime(agentId: string): Promise<AgentRuntimeConfig> {
    // Phase 4：优先 DB contentJson，回退文件，最后默认值
    const dbContent = await this.readDbContent(agentId);
    if (dbContent.runtimeConfig) {
      return dbContent.runtimeConfig as AgentRuntimeConfig;
    }
    return (await this.readYamlFileOrNull<AgentRuntimeConfig>(agentId, 'runtime.yaml')) ?? DEFAULT_RUNTIME_CONFIG;
  }

  async updateRuntime(agentId: string, partial: Record<string, unknown>): Promise<AgentRuntimeConfig> {
    const current = await this.getRuntime(agentId);
    const merged = deepmerge(current, partial) as unknown as AgentRuntimeConfig;
    // 内容真源写 DB；同时 dual-write 文件 shim（供 Local 执行，Increment 2 移除）
    await this.writeDbContentPatch(agentId, { runtimeConfig: merged as unknown as Record<string, unknown> });
    await this.writeYamlAtomic(this.getAgentConfigDir(agentId), 'runtime.yaml', merged);
    return merged;
  }

  async getPersona(agentId: string): Promise<PersonaConfig> {
    const dbContent = await this.readDbContent(agentId);
    const persona = (dbContent.persona as PersonaConfig | undefined)
      ?? (await this.readYamlFileOrNull<PersonaConfig>(agentId, 'persona.yaml'));
    if (persona) return persona;

    // 默认 persona
    const { realmId } = getRealmContext();
    const agent = await this.findById(agentId, realmId);
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

  async updatePersona(agentId: string, partial: Record<string, unknown>): Promise<PersonaConfig> {
    const current = await this.getPersona(agentId);
    const merged = deepmerge(current, partial) as unknown as PersonaConfig;
    await this.writeDbContentPatch(agentId, { persona: merged as unknown as Record<string, unknown> });
    await this.writeYamlAtomic(this.getAgentConfigDir(agentId), 'persona.yaml', merged);
    return merged;
  }

  async getSkills(agentId: string): Promise<SkillsConfig | null> {
    const dbContent = await this.readDbContent(agentId);
    return (dbContent.skills as SkillsConfig | undefined)
      ?? (await this.readYamlFileOrNull<SkillsConfig>(agentId, 'config/skills.yaml'));
  }

  async updateSkills(agentId: string, skills: SkillsConfig): Promise<void> {
    await this.writeDbContentPatch(agentId, { skills: skills as unknown as Record<string, unknown> });
    await this.writeYamlAtomic(this.getAgentConfigDir(agentId), 'config/skills.yaml', skills);
  }

  async getTools(agentId: string): Promise<ToolsConfig | null> {
    const dbContent = await this.readDbContent(agentId);
    return (dbContent.tools as ToolsConfig | undefined)
      ?? (await this.readYamlFileOrNull<ToolsConfig>(agentId, 'config/tools.yaml'));
  }

  async updateTools(agentId: string, tools: ToolsConfig): Promise<void> {
    await this.writeDbContentPatch(agentId, { tools: tools as unknown as Record<string, unknown> });
    await this.writeYamlAtomic(this.getAgentConfigDir(agentId), 'config/tools.yaml', tools);
  }

  async getTriggers(agentId: string): Promise<TriggersConfig | null> {
    const dbContent = await this.readDbContent(agentId);
    return (dbContent.triggers as TriggersConfig | undefined)
      ?? (await this.readYamlFileOrNull<TriggersConfig>(agentId, 'config/triggers.yaml'));
  }

  async updateTriggers(agentId: string, triggers: TriggersConfig): Promise<void> {
    await this.writeDbContentPatch(agentId, { triggers: triggers as unknown as Record<string, unknown> });
    await this.writeYamlAtomic(this.getAgentConfigDir(agentId), 'config/triggers.yaml', triggers);
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
