#!/usr/bin/env node

/**
 * Check if general channel has all users and agents
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
  console.log('📋 Getting general channel...');

  const channels = await trpcCall('channel.list');
  const general = channels.channels.find(ch => ch.name === 'general');

  if (!general) {
    console.log('❌ General channel not found\n');
    return null;
  }

  console.log(`✅ Found general channel: ${general.channel_id}\n`);
  return general;
}

async function getAllUsers() {
  console.log('📋 Getting all users...');
  const result = await trpcCall('user.list', { page: 1, limit: 100 });
  console.log(`✅ Found ${result.total} users\n`);
  return result.users;
}

async function getAllAgents() {
  console.log('📋 Getting all agents...');
  const result = await trpcCall('agent.list');
  console.log(`✅ Found ${result.total} agents\n`);
  return result.agents;
}

async function runCheck() {
  console.log('🚀 Checking General Channel Members\n');
  console.log('='.repeat(60));
  console.log('\n');

  try {
    await login();

    const general = await getGeneralChannel();
    if (!general) {
      return;
    }

    const users = await getAllUsers();
    const agents = await getAllAgents();

    console.log('='.repeat(60));
    console.log('\n📊 Analysis:\n');

    // Check members
    console.log(`General channel members: ${general.members.length}`);
    console.log(`Total users in system: ${users.length}`);
    console.log(`Total agents in system: ${agents.length}`);
    console.log(`Expected total members: ${users.length + agents.length}`);

    console.log('\n' + '-'.repeat(60) + '\n');

    // List members
    if (general.members.length > 0) {
      console.log('Current members in general channel:');
      general.members.forEach(m => {
        console.log(`  - ${m.member_id} (${m.member_type}, role: ${m.role})`);
      });
    } else {
      console.log('⚠️  General channel has NO members!');
    }

    console.log('\n' + '-'.repeat(60) + '\n');

    // Check if all users are members
    const memberIds = new Set(general.members.map(m => m.member_id));
    const missingUsers = users.filter(u => !memberIds.has(u.user_id));
    const missingAgents = agents.filter(a => !memberIds.has(a.agent_id));

    if (missingUsers.length > 0) {
      console.log(`❌ Missing ${missingUsers.length} users:`);
      missingUsers.forEach(u => {
        console.log(`  - ${u.user_id} (${u.username})`);
      });
    } else {
      console.log('✅ All users are members of general channel');
    }

    console.log('');

    if (missingAgents.length > 0) {
      console.log(`❌ Missing ${missingAgents.length} agents:`);
      missingAgents.forEach(a => {
        console.log(`  - ${a.agent_id} (${a.name})`);
      });
    } else {
      console.log('✅ All agents are members of general channel');
    }

    console.log('\n' + '='.repeat(60));

    if (missingUsers.length === 0 && missingAgents.length === 0 && general.members.length > 0) {
      console.log('\n✅ General channel has all users and agents!\n');
    } else {
      console.log('\n⚠️  General channel is missing some members!\n');
    }

  } catch (error) {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  }
}

runCheck();
