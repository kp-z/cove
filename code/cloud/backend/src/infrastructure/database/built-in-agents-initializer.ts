/**
 * Built-in Agents Initializer
 *
 * Automatically creates official agents during system initialization.
 * These agents are marked with scope: "built-in" and persist across installations.
 */

import { PrismaClient } from '../../../generated/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ILogger } from '../../application/interfaces/index';
import { BUILT_IN_AGENTS, BuiltInAgentConfig } from './built-in-agents.config';

export interface BuiltInAgentsInitializerOptions {
  prisma: PrismaClient;
  logger: ILogger;
  storageRoot: string; // Path to .cove directory
}

export class BuiltInAgentsInitializer {
  private readonly prisma: PrismaClient;
  private readonly logger: ILogger;
  private readonly storageRoot: string;

  constructor(options: BuiltInAgentsInitializerOptions) {
    this.prisma = options.prisma;
    this.logger = options.logger;
    this.storageRoot = options.storageRoot;
  }

  /**
   * 初始化所有内置 Agent（幂等，可安全重复运行）
   *
   * 职责说明（过渡期）：
   *   ✅ DB upsert（scope: 'built-in'）—— Backend 持久层，理应在这里。
   *   ⚠️  物理文件创建（persona.yaml / agent.md / runtime.yaml）—— 临时 shim：
   *       Local 需要扫描这些文件才能将元数据同步回 Backend。
   *       Phase 4 Increment 2 完成（Local 从 contentJson 物化文件）后，
   *       Backend 可删除此处的文件操作。
   */
  async initialize(): Promise<void> {
    this.logger.debug(`Checking ${BUILT_IN_AGENTS.length} built-in agent(s)...`);

    // 获取默认 Realm（Nexus）
    const defaultRealm = await this.prisma.realm.findFirst({
      where: { name: 'nexus' },
    });

    if (!defaultRealm) {
      this.logger.error('❌ Nexus realm not found, cannot initialize built-in agents');
      return;
    }

    for (const agentConfig of BUILT_IN_AGENTS) {
      try {
        await this.createOrUpdateAgent(agentConfig, defaultRealm.id);
      } catch (error) {
        this.logger.error(`❌ Failed to initialize built-in agent: ${agentConfig.displayName} (${agentConfig.name})`, error as Error);
      }
    }

    // 校验并修复
    if (process.env.SKIP_AGENT_VALIDATION !== 'true') {
      await this.validateAndRepair(defaultRealm.id);
    }
  }

  /**
   * Create or update a single built-in agent
   */
  private async createOrUpdateAgent(config: BuiltInAgentConfig, realmId: string): Promise<void> {
    // 1. Upsert agent in database
    const agent = await this.prisma.agent.upsert({
      where: { id: config.id },
      update: {
        // Don't update any fields - preserve all user customizations
        // (displayName, avatarUrl, avatarType, status, etc.)
        // Only ensure the agent exists in the database
      },
      create: {
        id: config.id,
        realmId: realmId,
        name: config.name,
        displayName: config.displayName,
        status: 'idle',
        scope: 'built-in', // Mark as built-in
        projectIds: '[]',
        configPath: `storage/agents/${config.id}`, // Point to the agent directory
        avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${config.name}-agent`,
        avatarType: 'dicebear',
        createdBy: 'system',
        createdAt: new Date(),
      },
    });

    this.logger.debug(`Agent DB record ready: ${agent.id}`);

    // 2. Create agent directory structure
    const agentDir = path.join(this.storageRoot, 'storage', 'agents', config.id);
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(path.join(agentDir, 'memory'), { recursive: true });
    await fs.mkdir(path.join(agentDir, 'config'), { recursive: true });
    await fs.mkdir(path.join(agentDir, 'workspace'), { recursive: true });
    await fs.mkdir(path.join(agentDir, 'assets'), { recursive: true });

    // 3. Create persona.yaml if it doesn't exist (don't overwrite user customizations)
    const personaPath = path.join(agentDir, 'persona.yaml');
    try {
      await fs.access(personaPath);
      this.logger.debug(`Persona config already exists, skipping: ${personaPath}`);
    } catch {
      // File doesn't exist, create default persona config
      await fs.writeFile(
        personaPath,
        yaml.dump(config.persona, { indent: 2 }),
        'utf-8'
      );
      this.logger.debug(`Created default persona config: ${personaPath}`);
    }

    // 4. Create agent.md if it doesn't exist (don't overwrite user customizations)
    const agentMdPath = path.join(agentDir, 'agent.md');
    try {
      await fs.access(agentMdPath);
      this.logger.debug(`Agent metadata already exists, skipping: ${agentMdPath}`);
    } catch {
      // File doesn't exist, create default agent.md
      const frontmatter = {
        agent_id: config.id,
        name: config.name,
        display_name: config.displayName,
        description: config.description,
        status: 'active',
        category: config.role,
        capabilities: config.capabilities,
        tags: config.tags,
      };
      const agentMdContent = `---
${yaml.dump(frontmatter, { indent: 2 }).trim()}
---

# ${config.displayName}

**Role**: ${config.role}
**Description**: ${config.description}

## Capabilities
${config.capabilities.map(cap => `- ${cap}`).join('\n')}

## Tags
${config.tags.join(', ')}

---
*This is a built-in agent managed by the system.*
`;
      await fs.writeFile(agentMdPath, agentMdContent, 'utf-8');
      this.logger.debug(`Created default agent metadata: ${agentMdPath}`);
    }

    // 5. Create runtime.yaml if it doesn't exist (don't overwrite user customizations)
    const runtimePath = path.join(agentDir, 'runtime.yaml');
    try {
      await fs.access(runtimePath);
      this.logger.debug(`Runtime config already exists, skipping: ${runtimePath}`);
    } catch {
      // File doesn't exist, create default runtime config
      const runtimeConfig = {
        // Default runtime config - users can customize this
        model: 'claude-sonnet-4-20250514',
        // adapter_id will be set by user or admin
      };
      await fs.writeFile(
        runtimePath,
        yaml.dump(runtimeConfig, { indent: 2 }),
        'utf-8'
      );
      this.logger.debug(`Created default runtime config: ${runtimePath}`);
    }

    this.logger.debug(`Built-in agent ready: ${config.displayName} (${config.name})`);
  }

  /**
   * Validate and repair built-in agents
   * Checks for missing or empty agent.md files and repairs them
   */
  private async validateAndRepair(realmId: string): Promise<void> {
    let repairedCount = 0;

    for (const agentConfig of BUILT_IN_AGENTS) {
      const agentMdPath = path.join(
        this.storageRoot,
        'storage',
        'agents',
        agentConfig.id,
        'agent.md'
      );

      try {
        const content = await fs.readFile(agentMdPath, 'utf-8');
        if (content.trim().length === 0) {
          this.logger.warn(`⚠️  agent.md is empty for ${agentConfig.displayName}, repairing...`);
          await this.createOrUpdateAgent(agentConfig, realmId);
          repairedCount++;
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          this.logger.warn(`⚠️  agent.md missing for ${agentConfig.displayName}, repairing...`);
          await this.createOrUpdateAgent(agentConfig, realmId);
          repairedCount++;
        }
      }
    }

    if (repairedCount > 0) {
      this.logger.info(`🔧 Repaired ${repairedCount} built-in agent(s)`);
    }
    // 校验通过时静默（info 级别不再重复打印 "all valid"）
  }

  /**
   * Check if built-in agents need initialization
   * Returns true if any built-in agent is missing
   */
  async needsInitialization(): Promise<boolean> {
    for (const agentConfig of BUILT_IN_AGENTS) {
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentConfig.id },
      });

      if (!agent) {
        this.logger.debug(`Built-in agent missing: ${agentConfig.name}`);
        return true;
      }
    }

    return false;
  }
}
