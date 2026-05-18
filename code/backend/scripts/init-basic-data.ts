#!/usr/bin/env tsx
/**
 * Initialize Cove with basic data:
 * - User: kp
 * - Agent: aaron
 * - Adapter: claude-api
 * - Channel: conversation between kp and aaron
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing Cove with basic data...\n');

  try {
    // 1. Create user: kp
    console.log('1️⃣ Creating user: kp');
    const user = await prisma.user.upsert({
      where: { id: 'user-kp' },
      update: {},
      create: {
        id: 'user-kp',
        username: 'kp',
        email: 'kp@example.com',
        displayName: 'KP',
        role: 'user',
        status: 'active',
        profilePath: '.cove/storage/users/user-kp.json',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('   ✅ User ready:', user.id);

    // 2. Create adapter: claude-api
    console.log('\n2️⃣ Creating adapter: claude-api');
    const adapterId = uuidv4();
    const adapterConfig = {
      id: adapterId,
      name: 'claude-api-adapter',
      description: 'Claude API adapter for aaron',
      type: 'anthropic-api',
      scope: 'private',
      owner_id: 'kp',
      created_at: new Date(),
      updated_at: new Date(),
      config: {
        api_key_ref: 'env:ANTHROPIC_API_KEY',
        model: 'claude-sonnet-4-20250514',
        base_url: 'https://api.anthropic.com/v1',
        temperature: 0.7,
        max_tokens: 8192,
        context: {
          max_context_window: 200000,
          compression_threshold: 0.8,
        },
        retry: {
          max_retries: 3,
          backoff_strategy: 'exponential',
        },
      },
    };

    const projectRoot = path.resolve(process.cwd(), '../..');
    const adapterPath = path.join(projectRoot, '.cove', 'adapters', 'private', `${adapterId}.yaml`);
    await fs.mkdir(path.dirname(adapterPath), { recursive: true });
    await fs.writeFile(adapterPath, yaml.dump(adapterConfig, { indent: 2 }), 'utf-8');
    console.log('   ✅ Adapter created:', adapterId);
    console.log('   📁 File:', adapterPath);

    // 3. Create agent: aaron
    console.log('\n3️⃣ Creating agent: aaron');
    const agentId = 'agent-aaron';
    const agent = await prisma.agent.upsert({
      where: { id: agentId },
      update: {},
      create: {
        id: agentId,
        name: 'aaron',
        displayName: 'Aaron',
        status: 'idle',
        scope: 'user',
        projectIds: '[]',
        configPath: `storage/agents/${agentId}`,
        createdBy: 'kp',
        createdAt: new Date(),
      },
    });
    console.log('   ✅ Agent ready:', agent.id);

    // Create agent directory structure
    const agentDir = path.join(projectRoot, '.cove', 'storage', 'agents', agentId);
    await fs.mkdir(agentDir, { recursive: true });

    // Create runtime.yaml
    const runtimeConfig = {
      adapter_id: adapterId,
      model: 'claude-sonnet-4-20250514',
    };
    await fs.writeFile(
      path.join(agentDir, 'runtime.yaml'),
      yaml.dump(runtimeConfig, { indent: 2 }),
      'utf-8'
    );

    // Create persona.yaml
    const personaConfig = {
      name: 'Aaron',
      title: 'AI Assistant',
      description: 'Helpful AI assistant',
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
    await fs.writeFile(
      path.join(agentDir, 'persona.yaml'),
      yaml.dump(personaConfig, { indent: 2 }),
      'utf-8'
    );

    // Create agent.json metadata
    const agentMetadata = {
      description: 'Helpful AI assistant',
      capabilities: [],
      tags: [],
      createdBy: 'kp',
    };
    await fs.writeFile(
      path.join(projectRoot, '.cove', 'storage', 'agents', `${agentId}.json`),
      JSON.stringify(agentMetadata, null, 2),
      'utf-8'
    );
    console.log('   ✅ Agent files created');

    // 4. Create channel: kp and aaron conversation
    console.log('\n4️⃣ Creating channel: kp-aaron-chat');
    const channelId = 'channel-kp-aaron';
    const channel = await prisma.channel.upsert({
      where: { id: channelId },
      update: {},
      create: {
        id: channelId,
        name: 'kp-aaron-chat',
        displayName: 'KP & Aaron Chat',
        type: 'dm',
        status: 'active',
        metadataPath: `.cove/storage/channels/${channelId}.json`,
        memberIds: JSON.stringify(['user-kp', agentId]),
        memberCount: 2,
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('   ✅ Channel ready:', channel.id);
    console.log('   👥 Members: kp, aaron');

    // Create channel metadata file
    const channelMetadata = {
      description: 'Direct message conversation between kp and aaron',
      createdBy: 'kp',
      members: [
        { id: 'user-kp', type: 'human', role: 'member' },
        { id: agentId, type: 'agent', role: 'member' },
      ],
    };
    await fs.writeFile(
      path.join(projectRoot, '.cove', 'storage', 'channels', `${channelId}.json`),
      JSON.stringify(channelMetadata, null, 2),
      'utf-8'
    );
    console.log('   ✅ Channel metadata created');

    console.log('\n✅ Initialization complete!\n');
    console.log('Summary:');
    console.log('  - User: kp (user-kp)');
    console.log('  - Agent: aaron (agent-aaron)');
    console.log('  - Adapter: claude-api-adapter (' + adapterId + ')');
    console.log('  - Channel: kp-aaron-chat (channel-kp-aaron)');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
