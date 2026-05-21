/**
 * Built-in Agents Initializer
 *
 * Automatically creates official agents during system initialization.
 * These agents are marked with scope: "built-in" and persist across installations.
 */

import { PrismaClient } from '@prisma/client';
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
   * Initialize all built-in agents
   * This is idempotent - safe to run multiple times
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing built-in agents...', {
      count: BUILT_IN_AGENTS.length,
    });

    for (const agentConfig of BUILT_IN_AGENTS) {
      try {
        await this.createOrUpdateAgent(agentConfig);
      } catch (error) {
        this.logger.error(`Failed to initialize built-in agent: ${agentConfig.name}`, error as Error);
        // Continue with other agents even if one fails
      }
    }

    this.logger.info('Built-in agents initialization complete');
  }

  /**
   * Create or update a single built-in agent
   */
  private async createOrUpdateAgent(config: BuiltInAgentConfig): Promise<void> {
    this.logger.debug(`Creating/updating built-in agent: ${config.name}`, {
      id: config.id,
    });

    // 1. Upsert agent in database
    const agent = await this.prisma.agent.upsert({
      where: { id: config.id },
      update: {
        displayName: config.displayName,
        status: 'idle',
        avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${config.name}-agent`,
        avatarType: 'dicebear',
        // Don't update scope - keep it as built-in
      },
      create: {
        id: config.id,
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

    this.logger.debug(`Agent database record ready: ${agent.id}`);

    // 2. Create agent directory structure
    const agentDir = path.join(this.storageRoot, 'storage', 'agents', config.id);
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(path.join(agentDir, 'memory'), { recursive: true });
    await fs.mkdir(path.join(agentDir, 'config'), { recursive: true });
    await fs.mkdir(path.join(agentDir, 'workspace'), { recursive: true });
    await fs.mkdir(path.join(agentDir, 'assets'), { recursive: true });

    // 3. Create persona.yaml
    const personaPath = path.join(agentDir, 'persona.yaml');
    await fs.writeFile(
      personaPath,
      yaml.dump(config.persona, { indent: 2 }),
      'utf-8'
    );

    // 4. Create agent.md
    const agentMdPath = path.join(agentDir, 'agent.md');
    const agentMdContent = `# ${config.displayName}

**Name**: ${config.name}
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

    // 5. Create agent.json metadata
    const metadataPath = path.join(this.storageRoot, 'storage', 'agents', `${config.id}.json`);
    const metadata = {
      description: config.description,
      role: config.role,
      capabilities: config.capabilities,
      tags: config.tags,
      createdBy: 'system',
      scope: 'built-in',
    };
    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    // 6. Create runtime.yaml if it doesn't exist (don't overwrite user customizations)
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

    this.logger.info(`Built-in agent initialized: ${config.displayName} (${config.name})`);
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
