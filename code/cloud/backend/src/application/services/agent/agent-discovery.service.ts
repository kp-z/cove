import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { getRealmContext } from '../../context/realm-context-store';

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

export class AgentDiscoveryService {
  private readonly agentsDir: string;

  constructor(private readonly prisma: PrismaClient) {
    this.agentsDir = path.join(os.homedir(), '.cove', 'storage', 'agents');
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

      const existingAgent = await this.prisma.agent.findUnique({
        where: { id: metadata.agent_id },
      });

      if (existingAgent) {
        console.log(`[AgentDiscoveryService] Agent ${metadata.agent_id} exists in database, updating (filesystem wins)...`);
        await this.updateAgent(metadata);
      } else {
        console.log(`[AgentDiscoveryService] Agent ${metadata.agent_id} not in database, creating...`);
        await this.createAgent(metadata);
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

  private async createAgent(
    metadata: AgentMetadata,
  ): Promise<void> {
    const now = new Date();
    const agentDir = path.join(os.homedir(), '.cove', 'storage', 'agents', metadata.agent_id);
    const configPath = path.join('storage', 'agents', metadata.agent_id);

    // Get default realm ID (agents discovered from filesystem belong to default realm)
    const defaultRealm = await this.prisma.realm.findFirst({
      where: { name: 'default' },
    });

    if (!defaultRealm) {
      console.error(`[AgentDiscoveryService] Default realm not found, cannot create agent ${metadata.agent_id}`);
      return;
    }

    await this.prisma.agent.create({
      data: {
        id: metadata.agent_id,
        realmId: defaultRealm.id,
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

    console.log(`[AgentDiscoveryService] Created agent ${metadata.agent_id} in database (workspace: ${agentDir})`);
  }

  private async updateAgent(
    metadata: AgentMetadata,
  ): Promise<void> {
    const agentDir = path.join(os.homedir(), '.cove', 'storage', 'agents', metadata.agent_id);
    const configPath = path.join('storage', 'agents', metadata.agent_id);

    await this.prisma.agent.update({
      where: { id: metadata.agent_id },
      data: {
        name: metadata.name,
        displayName: metadata.display_name || metadata.name,
        status: metadata.status || 'active',
        configPath,  // Fix old .json format paths
      },
    });

    console.log(`[AgentDiscoveryService] Updated agent ${metadata.agent_id} in database (filesystem wins, workspace: ${agentDir})`);
  }
}
