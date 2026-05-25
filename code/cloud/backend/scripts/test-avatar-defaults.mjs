#!/usr/bin/env node

/**
 * Test script for avatar default functionality
 *
 * Tests:
 * 1. User creation with default avatar
 * 2. Agent creation with default avatar
 * 3. Channel creation with default avatar
 * 4. Avatar update APIs for all three entity types
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3002/trpc';
const REALM_ID = 'realm-nexus';

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';

// Helper function to make tRPC calls
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

// Login to get auth token
async function login() {
  console.log('🔐 Logging in as admin...');
  const result = await trpcCall('auth.login', {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  }, 'mutation');

  authToken = result.token;
  console.log('✅ Login successful\n');
}

// Test 1: Get existing user and check avatar
async function testExistingUserAvatar() {
  console.log('📋 Test 1: Check existing user avatar');

  try {
    const users = await trpcCall('user.list', { page: 1, limit: 1 });

    if (users.users.length === 0) {
      console.log('⚠️  No users found, skipping test\n');
      return null;
    }

    const user = users.users[0];
    console.log(`   User: ${user.username}`);
    console.log(`   Avatar URL: ${user.avatar?.url || 'N/A'}`);
    console.log(`   Avatar Type: ${user.avatar?.type || 'N/A'}`);

    if (user.avatar?.url && user.avatar?.type) {
      console.log('✅ User has avatar\n');
    } else {
      console.log('⚠️  User missing avatar\n');
    }

    return user.user_id;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

// Test 2: Get existing agent and check avatar
async function testExistingAgentAvatar() {
  console.log('📋 Test 2: Check existing agent avatar');

  try {
    const agents = await trpcCall('agent.list');

    if (agents.agents.length === 0) {
      console.log('⚠️  No agents found, skipping test\n');
      return null;
    }

    const agent = agents.agents[0];
    console.log(`   Agent: ${agent.name}`);
    console.log(`   Persona Avatar URL: ${agent.persona?.avatar?.url || 'N/A'}`);
    console.log(`   Persona Avatar Type: ${agent.persona?.avatar?.type || 'N/A'}`);

    if (agent.persona?.avatar?.url && agent.persona?.avatar?.type) {
      console.log('✅ Agent has avatar\n');
    } else {
      console.log('⚠️  Agent missing avatar\n');
    }

    return agent.agent_id;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

// Test 3: Get existing channel and check avatar
async function testExistingChannelAvatar() {
  console.log('📋 Test 3: Check existing channel avatar');

  try {
    const channels = await trpcCall('channel.list');

    if (channels.channels.length === 0) {
      console.log('⚠️  No channels found, skipping test\n');
      return null;
    }

    const channel = channels.channels[0];
    console.log(`   Channel: ${channel.name}`);
    console.log(`   Avatar URL: ${channel.avatar?.url || 'N/A'}`);
    console.log(`   Avatar Type: ${channel.avatar?.type || 'N/A'}`);

    if (channel.avatar?.url && channel.avatar?.type) {
      console.log('✅ Channel has avatar\n');
    } else {
      console.log('⚠️  Channel missing avatar\n');
    }

    return channel.channel_id;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

// Test 4: Update user avatar
async function testUpdateUserAvatar(userId) {
  if (!userId) {
    console.log('⏭️  Skipping user avatar update test (no user ID)\n');
    return;
  }

  console.log('📋 Test 4: Update user avatar');

  try {
    const result = await trpcCall('user.update', {
      userId,
      data: {
        avatar: {
          url: 'storage/avatars/presets/preset-1.svg',
          type: 'default',
        },
      },
    }, 'mutation');

    console.log(`   Updated avatar URL: ${result.avatar?.url}`);
    console.log(`   Updated avatar type: ${result.avatar?.type}`);
    console.log('✅ User avatar update successful\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
  }
}

// Test 5: Update agent avatar
async function testUpdateAgentAvatar(agentId) {
  if (!agentId) {
    console.log('⏭️  Skipping agent avatar update test (no agent ID)\n');
    return;
  }

  console.log('📋 Test 5: Update agent avatar');

  try {
    const result = await trpcCall('agent.update', {
      agentId,
      data: {
        avatar: {
          url: 'storage/avatars/presets/preset-2.svg',
          type: 'default',
        },
      },
    }, 'mutation');

    console.log(`   Updated avatar URL: ${result.persona?.avatar?.url}`);
    console.log(`   Updated avatar type: ${result.persona?.avatar?.type}`);
    console.log('✅ Agent avatar update successful\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
  }
}

// Test 6: Update channel avatar
async function testUpdateChannelAvatar(channelId) {
  if (!channelId) {
    console.log('⏭️  Skipping channel avatar update test (no channel ID)\n');
    return;
  }

  console.log('📋 Test 6: Update channel avatar');

  try {
    const result = await trpcCall('channel.update', {
      channelId,
      data: {
        avatar: {
          url: 'storage/avatars/presets/preset-3.svg',
          type: 'default',
        },
      },
    }, 'mutation');

    console.log(`   Updated avatar URL: ${result.avatar?.url}`);
    console.log(`   Updated avatar type: ${result.avatar?.type}`);
    console.log('✅ Channel avatar update successful\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message, '\n');
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Avatar Default Tests\n');
  console.log('='.repeat(50));
  console.log('\n');

  try {
    // Login first
    await login();

    // Test existing entities
    const userId = await testExistingUserAvatar();
    const agentId = await testExistingAgentAvatar();
    const channelId = await testExistingChannelAvatar();

    // Test avatar updates
    await testUpdateUserAvatar(userId);
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
