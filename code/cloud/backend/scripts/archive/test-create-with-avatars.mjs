#!/usr/bin/env node

/**
 * Test script for creating new entities with default avatars
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

async function testCreateAgent() {
  console.log('📋 Test: Create new agent with default avatar');

  const timestamp = Date.now();
  const agentName = `test-agent-${timestamp}`;

  try {
    const result = await trpcCall('agent.create', {
      name: agentName,
      displayName: `Test Agent ${timestamp}`,
      description: 'Test agent for avatar defaults',
      createdBy: 'admin',
    }, 'mutation');

    console.log(`   Agent created: ${result.name}`);
    console.log(`   Avatar URL: ${result.persona?.avatar?.url || 'N/A'}`);
    console.log(`   Avatar Type: ${result.persona?.avatar?.type || 'N/A'}`);

    if (result.persona?.avatar?.url === 'storage/avatars/presets/default-agent.svg' &&
        result.persona?.avatar?.type === 'default') {
      console.log('✅ Agent has correct default avatar\n');
      return result.agent_id;
    } else {
      console.log('❌ Agent default avatar is incorrect\n');
      return null;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
    return null;
  }
}

async function testCreateChannel() {
  console.log('📋 Test: Create new channel with default avatar');

  const timestamp = Date.now();
  const channelName = `test-channel-${timestamp}`;

  try {
    const result = await trpcCall('channel.create', {
      name: channelName,
      description: 'Test channel for avatar defaults',
      type: 'public',
      createdBy: 'admin',
    }, 'mutation');

    console.log(`   Channel created: ${result.name}`);
    console.log(`   Avatar URL: ${result.avatar?.url || 'N/A'}`);
    console.log(`   Avatar Type: ${result.avatar?.type || 'N/A'}`);

    if (result.avatar?.url === 'storage/avatars/presets/default-channel.svg' &&
        result.avatar?.type === 'default') {
      console.log('✅ Channel has correct default avatar\n');
      return result.channel_id;
    } else {
      console.log('❌ Channel default avatar is incorrect\n');
      return null;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
    return null;
  }
}

async function testUpdateAgentAvatar(agentId) {
  if (!agentId) {
    console.log('⏭️  Skipping agent avatar update test\n');
    return;
  }

  console.log('📋 Test: Update agent avatar');

  try {
    const result = await trpcCall('agent.update', {
      agentId,
      data: {
        avatar: {
          url: 'storage/avatars/presets/preset-5.svg',
          type: 'default',
        },
      },
    }, 'mutation');

    console.log(`   Updated avatar URL: ${result.persona?.avatar?.url || 'N/A'}`);
    console.log(`   Updated avatar type: ${result.persona?.avatar?.type || 'N/A'}`);

    if (result.persona?.avatar?.url === 'storage/avatars/presets/preset-5.svg') {
      console.log('✅ Agent avatar update successful\n');
    } else {
      console.log('❌ Agent avatar update failed\n');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
  }
}

async function testUpdateChannelAvatar(channelId) {
  if (!channelId) {
    console.log('⏭️  Skipping channel avatar update test\n');
    return;
  }

  console.log('📋 Test: Update channel avatar');

  try {
    const result = await trpcCall('channel.update', {
      channelId,
      data: {
        avatar: {
          url: 'storage/avatars/presets/preset-6.svg',
          type: 'default',
        },
      },
    }, 'mutation');

    console.log(`   Updated avatar URL: ${result.avatar?.url || 'N/A'}`);
    console.log(`   Updated avatar type: ${result.avatar?.type || 'N/A'}`);

    if (result.avatar?.url === 'storage/avatars/presets/preset-6.svg') {
      console.log('✅ Channel avatar update successful\n');
    } else {
      console.log('❌ Channel avatar update failed\n');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
  }
}

async function runTests() {
  console.log('🚀 Testing Default Avatar Creation\n');
  console.log('='.repeat(50));
  console.log('\n');

  try {
    await login();

    const agentId = await testCreateAgent();
    const channelId = await testCreateChannel();

    await testUpdateAgentAvatar(agentId);
    await testUpdateChannelAvatar(channelId);

    console.log('='.repeat(50));
    console.log('\n✅ All tests completed!\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runTests();
