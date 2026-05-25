#!/usr/bin/env node

/**
 * Add existing users and agents to general channel
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3002/trpc';
const REALM_ID = 'realm-nexus';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';

async function trpcCall(procedure, input = {}, method = 'query') {
  const url = method === 'query'
    ? `${API_BASE}/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`
    : `${API_BASE}/${procedure}`;

  const options = {
    method: method === 'query' ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-realm-id': REALM_ID,
    },
  };

  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (method === 'mutation') {
    options.body = JSON.stringify(input);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`tRPC call failed: ${JSON.stringify(data)}`);
  }

  return data.result?.data;
}

async function login() {
  console.log('🔐 Logging in...');
  const result = await trpcCall('auth.login', {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  }, 'mutation');

  authToken = result.token;
  console.log('✅ Login successful\n');
}

async function getGeneralChannel() {
  const channels = await trpcCall('channel.list');
  return channels.channels.find(ch => ch.name === 'general');
}

async function getAllUsers() {
  const result = await trpcCall('user.list', { page: 1, limit: 100 });
  return result.users;
}

async function getAllAgents() {
  const result = await trpcCall('agent.list');
  return result.agents;
}

async function addMemberToChannel(channelId, memberId) {
  try {
    await trpcCall('channel.addMember', {
      channelId,
      memberId,
    }, 'mutation');
    return true;
  } catch (error) {
    // Check if already a member
    if (error.message.includes('already a member')) {
      return 'already';
    }
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Adding Existing Members to General Channel\n');
  console.log('='.repeat(60));
  console.log('\n');

  try {
    await login();

    console.log('📋 Getting general channel...');
    const general = await getGeneralChannel();
    if (!general) {
      console.log('❌ General channel not found!');
      return;
    }
    console.log(`✅ Found general channel: ${general.channel_id}\n`);

    console.log('📋 Getting all users...');
    const users = await getAllUsers();
    console.log(`✅ Found ${users.length} users\n`);

    console.log('📋 Getting all agents...');
    const agents = await getAllAgents();
    console.log(`✅ Found ${agents.length} agents\n`);

    console.log('='.repeat(60));
    console.log('\n👥 Adding users to general channel...\n');

    let addedUsers = 0;
    let skippedUsers = 0;
    let errorUsers = 0;

    for (const user of users) {
      try {
        const result = await addMemberToChannel(general.channel_id, user.user_id);
        if (result === 'already') {
          console.log(`⏭️  ${user.username} - already a member`);
          skippedUsers++;
        } else {
          console.log(`✅ ${user.username} - added`);
          addedUsers++;
        }
      } catch (error) {
        console.log(`❌ ${user.username} - failed: ${error.message}`);
        errorUsers++;
      }
    }

    console.log('\n🤖 Adding agents to general channel...\n');

    let addedAgents = 0;
    let skippedAgents = 0;
    let errorAgents = 0;

    for (const agent of agents) {
      try {
        const result = await addMemberToChannel(general.channel_id, agent.agent_id);
        if (result === 'already') {
          console.log(`⏭️  ${agent.name} - already a member`);
          skippedAgents++;
        } else {
          console.log(`✅ ${agent.name} - added`);
          addedAgents++;
        }
      } catch (error) {
        console.log(`❌ ${agent.name} - failed: ${error.message}`);
        errorAgents++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:\n');
    console.log(`Users:`);
    console.log(`  Added: ${addedUsers}`);
    console.log(`  Skipped: ${skippedUsers}`);
    console.log(`  Errors: ${errorUsers}`);
    console.log('');
    console.log(`Agents:`);
    console.log(`  Added: ${addedAgents}`);
    console.log(`  Skipped: ${skippedAgents}`);
    console.log(`  Errors: ${errorAgents}`);
    console.log('');
    console.log(`Total added: ${addedUsers + addedAgents}`);
    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
