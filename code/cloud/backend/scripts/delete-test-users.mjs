#!/usr/bin/env node

/**
 * Delete test users
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3002/trpc';
const REALM_ID = 'realm-nexus';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';

const usersToDelete = [
  'test_avatar_user',
  'test_avatar_fix',
  'test_avatar_final',
  'test_avatar_v2',
  'test_avatar_v3',
  'test_avatar_v4',
  'testuser_1779463863',
  'testuser_1779463872',
  'qatest_1779463906',
  'dbtest_1779464132',
  'testuser789',
  'newuser001',
  'finaltest',
  'verify_1779469849',
  'final_1779469949',
];

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

async function getAllUsers() {
  const result = await trpcCall('user.list', { page: 1, limit: 100 });
  return result.users;
}

async function deleteUser(userId, username) {
  try {
    await trpcCall('user.delete', { userId }, 'mutation');
    console.log(`✅ Deleted: ${username} (${userId})`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to delete ${username}: ${error.message}`);
    return false;
  }
}

async function runDelete() {
  console.log('🚀 Deleting Test Users\n');
  console.log('='.repeat(60));
  console.log('\n');

  try {
    await login();

    console.log('📋 Getting all users...');
    const allUsers = await getAllUsers();
    console.log(`✅ Found ${allUsers.length} users\n`);

    console.log('🗑️  Deleting test users...\n');

    let deleted = 0;
    let notFound = 0;

    for (const username of usersToDelete) {
      const user = allUsers.find(u => u.username === username);

      if (user) {
        const success = await deleteUser(user.user_id, username);
        if (success) deleted++;
      } else {
        console.log(`⚠️  Not found: ${username}`);
        notFound++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Deletion complete!`);
    console.log(`   Deleted: ${deleted}`);
    console.log(`   Not found: ${notFound}`);
    console.log(`   Total attempted: ${usersToDelete.length}\n`);

  } catch (error) {
    console.error('\n❌ Delete failed:', error.message);
    process.exit(1);
  }
}

runDelete();
