import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

interface AgentMetadata {
  agent_id: string;
  name: string;
  display_name: string;
  status?: string;
  category?: string;
  capabilities?: string[];
  tags?: string[];
  created_by?: string;
  created_at?: string;
}

interface PersonaConfig {
  name?: string;
  title?: string;
  description?: string;
  language_style?: {
    formality?: string;
    verbosity?: string;
    preferred_language?: string;
  };
  behavior?: {
    proactive?: boolean;
    ask_before_action?: boolean;
  };
}

export class AgentDiscoveryService {
  private readonly agentsDir: string;

  constructor(private readonly prisma: PrismaClient) {
    this.agentsDir = path.join(os.homedir(), '.cove', 'agents');
  }

  async discoverAndSyncAgents(): Promise<void> {
    console.log('[AgentDiscoveryService] Starting agent discovery and sync...');

    try {
      const agentDirs = await this.scanAgentsDirectory();
      console.log(`[AgentDiscoveryService] Found ${agentDirs.length} agent directories`);

      for (const agentDir of agentDirs) {
        await this.syncAgent(agentDir);
      }

      console.log('[AgentDiscoveryService] Agent discovery and sync completed');
    } catch (error) {
      console.error('[AgentDiscoveryService] Failed to discover and sync agents', error);
      throw error;
    }
  }

  private async scanAgentsDirectory(): Promise<string[]> {
    try {
      await fs.access(this.agentsDir);
      const entries = await fs.readdir(this.agentsDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => path.join(this.agentsDir, entry.name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`[AgentDiscoveryService] Agents directory not found: ${this.agentsDir}`);
        return [];
      }
      throw error;
    }
  }

  private async syncAgent(agentDir: string): Promise<void> {
    const agentDirName = path.basename(agentDir);
    console.log(`[AgentDiscoveryService] Syncing agent: ${agentDirName}`);

    try {
      const metadata = await this.readAgentMetadata(agentDir);
      if (!metadata) {
        console.warn(`[AgentDiscoveryService] No valid metadata found for agent: ${agentDirName}`);
        return;
      }

      const persona = await this.readPersonaConfig(agentDir);

      const existingAgent = await this.prisma.agent.findUnique({
        where: { id: metadata.agent_id },
      });

      if (existingAgent) {
        console.log(`[AgentDiscoveryService] Agent ${metadata.agent_id} exists in database, updating (filesystem wins)...`);
        await this.updateAgent(metadata, persona);
      } else {
        console.log(`[AgentDiscoveryService] Agent ${metadata.agent_id} not in database, creating...`);
        await this.createAgent(metadata, persona);
      }
    } catch (error) {
      console.error(`[AgentDiscoveryService] Failed to sync agent ${agentDirName}`, error);
    }
  }

  private async readAgentMetadata(agentDir: string): Promise<AgentMetadata | null> {
    const agentMdPath = path.join(agentDir, 'agent.md');

    try {
      const content = await fs.readFile(agentMdPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!frontmatterMatch || !frontmatterMatch[1]) {
        console.warn(`[AgentDiscoveryService] No frontmatter found in ${agentMdPath}`);
        return null;
      }

      const metadata = yaml.load(frontmatterMatch[1]) as AgentMetadata;

      if (!metadata.agent_id || !metadata.name) {
        console.warn(`[AgentDiscoveryService] Invalid metadata in ${agentMdPath}: missing agent_id or name`);
        return null;
      }

      return metadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`[AgentDiscoveryService] agent.md not found in ${agentDir}`);
      } else {
        console.error(`[AgentDiscoveryService] Failed to read agent.md in ${agentDir}`, error);
      }
      return null;
    }
  }

  private async readPersonaConfig(agentDir: string): Promise<PersonaConfig | null> {
    const personaPath = path.join(agentDir, 'persona.yaml');

    try {
      const content = await fs.readFile(personaPath, 'utf-8');
      return yaml.load(content) as PersonaConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[AgentDiscoveryService] Failed to read persona.yaml in ${agentDir}`, error);
      }
      return null;
    }
  }

  private async createAgent(
    metadata: AgentMetadata,
    persona: PersonaConfig | null,
  ): Promise<void> {
    const now = new Date();
    const coveRoot = path.join(os.homedir(), '.cove');
    const configPath = path.join('storage', 'agents', `${metadata.agent_id}.json`);

    // Create config file with persona data
    const configData = {
      description: persona?.description || '',
      role: metadata.category || 'custom',
      capabilities: metadata.capabilities || [],
      tags: metadata.tags || [],
      createdBy: metadata.created_by || 'system',
      scope: 'user',
    };

    const configFullPath = path.join(coveRoot, configPath);
    await fs.mkdir(path.dirname(configFullPath), { recursive: true });
    await fs.writeFile(configFullPath, JSON.stringify(configData, null, 2), 'utf-8');

    await this.prisma.agent.create({
      data: {
        id: metadata.agent_id,
        name: metadata.name,
        displayName: metadata.display_name || metadata.name,
        status: metadata.status || 'active',
        scope: 'user',
        projectIds: '[]',
        configPath,
        avatarUrl: null,
        avatarType: 'dicebear',
        createdBy: metadata.created_by || 'system',
        createdAt: metadata.created_at ? new Date(metadata.created_at) : now,
      },
    });

    console.log(`[AgentDiscoveryService] Created agent ${metadata.agent_id} in database`);
  }

  private async updateAgent(
    metadata: AgentMetadata,
    persona: PersonaConfig | null,
  ): Promise<void> {
    const coveRoot = path.join(os.homedir(), '.cove');

    // Get existing agent to find configPath
    const existingAgent = await this.prisma.agent.findUnique({
      where: { id: metadata.agent_id },
    });

    if (!existingAgent) {
      throw new Error(`Agent ${metadata.agent_id} not found`);
    }

    // Update config file with persona data
    const configData = {
      description: persona?.description || '',
      role: metadata.category || 'custom',
      capabilities: metadata.capabilities || [],
      tags: metadata.tags || [],
      createdBy: metadata.created_by || 'system',
      scope: 'user',
    };

    const configFullPath = path.join(coveRoot, existingAgent.configPath);
    await fs.mkdir(path.dirname(configFullPath), { recursive: true });
    await fs.writeFile(configFullPath, JSON.stringify(configData, null, 2), 'utf-8');

    await this.prisma.agent.update({
      where: { id: metadata.agent_id },
      data: {
        name: metadata.name,
        displayName: metadata.display_name || metadata.name,
        status: metadata.status || 'active',
      },
    });

    console.log(`[AgentDiscoveryService] Updated agent ${metadata.agent_id} in database (filesystem wins)`);
  }
}
