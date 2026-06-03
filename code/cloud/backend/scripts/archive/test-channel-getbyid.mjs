#!/usr/bin/env node

/**
 * Test channel.getById API
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

  console.log(`\n📡 Calling: ${procedure}`);
  console.log(`   Method: ${method}`);
  console.log(`   Input: ${JSON.stringify(input, null, 2)}`);

  const response = await fetch(url, options);
  const data = await response.json();

  console.log(`   Status: ${response.status}`);
  console.log(`   Response: ${JSON.stringify(data, null, 2)}`);

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

async function testGetChannelById(channelId) {
  console.log(`\n📋 Testing channel.getById with channelId: ${channelId}`);

  try {
    const result = await trpcCall('channel.getById', {
      channelId,
    });

    console.log('\n✅ Success!');
    console.log('Channel data:');
    console.log(`   Name: ${result.name}`);
    console.log(`   Type: ${result.type}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Avatar: ${JSON.stringify(result.avatar)}`);

    return result;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return null;
  }
}

async function testListChannels() {
  console.log('\n📋 Testing channel.list to see all channels');

  try {
    const result = await trpcCall('channel.list');

    console.log(`\n✅ Found ${result.total} channels:`);
    result.channels.forEach(ch => {
      console.log(`   - ${ch.channel_id}: ${ch.name} (${ch.type})`);
    });

    return result;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing Channel.getById API\n');
  console.log('='.repeat(50));

  try {
    await login();

    // First list all channels to see what's available
    await testListChannels();

    // Test with the specific channel ID
    await testGetChannelById('test-channel-1779603928715');

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Tests completed!\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runTests();
