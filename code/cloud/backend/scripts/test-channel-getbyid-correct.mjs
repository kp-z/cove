#!/usr/bin/env node

/**
 * Test channel.getById API with correct channelId
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

async function testGetChannelById(channelId) {
  console.log(`📋 Testing channel.getById with channelId: ${channelId}\n`);

  try {
    const result = await trpcCall('channel.getById', { channelId });

    console.log('✅ Success!');
    console.log(`   Name: ${result.name}`);
    console.log(`   Display Name: ${result.display_name}`);
    console.log(`   Type: ${result.type}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Avatar: ${JSON.stringify(result.avatar, null, 2)}`);

    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing Channel.getById API\n');
  console.log('='.repeat(50));
  console.log('\n');

  try {
    await login();

    // Test with name (should fail)
    console.log('Test 1: Using channel name (should fail)');
    await testGetChannelById('test-channel-1779603928715');

    console.log('\n' + '-'.repeat(50) + '\n');

    // Test with correct channelId (should succeed)
    console.log('Test 2: Using correct channelId (should succeed)');
    await testGetChannelById('channel-1779603928716-vtlogp9');

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Tests completed!\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runTests();
