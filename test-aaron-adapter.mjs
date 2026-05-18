#!/usr/bin/env node

/**
 * Test Aaron's Adapter Configuration
 *
 * This script tests the catcats.net adapter with custom x-api-key header
 */

const BASE_URL = 'http://localhost:3000';
const ADAPTER_ID = 'b7f1aac3-1872-4d84-b6e6-3075d1879139';

async function testAdapterConfig() {
  console.log('🧪 Testing Aaron\'s Adapter Configuration\n');

  try {
    // 1. Get adapter configuration
    console.log('1️⃣ Fetching adapter configuration...');
    const adapterResponse = await fetch(`${BASE_URL}/trpc/adapter.getById?input=${encodeURIComponent(JSON.stringify({ id: ADAPTER_ID, actorId: 'kp' }))}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!adapterResponse.ok) {
      throw new Error(`Failed to fetch adapter: ${adapterResponse.status} ${adapterResponse.statusText}`);
    }

    const adapterData = await adapterResponse.json();
    console.log('✅ Adapter configuration retrieved:');
    console.log('   - ID:', adapterData.result.data.id);
    console.log('   - Name:', adapterData.result.data.name);
    console.log('   - Type:', adapterData.result.data.type);
    console.log('   - Model:', adapterData.result.data.config.model);
    console.log('   - Base URL:', adapterData.result.data.config.base_url);
    console.log('   - Custom Headers:', Object.keys(adapterData.result.data.config.custom_headers || {}));
    console.log('');

    // 2. Verify custom_headers are present
    if (!adapterData.result.data.config.custom_headers) {
      throw new Error('❌ custom_headers not found in adapter config');
    }

    if (!adapterData.result.data.config.custom_headers['x-api-key']) {
      throw new Error('❌ x-api-key not found in custom_headers');
    }

    console.log('✅ Custom headers validation passed');
    console.log('   - x-api-key is present');
    console.log('');

    // 3. Summary
    console.log('📊 Test Summary:');
    console.log('   ✅ Adapter configuration loaded successfully');
    console.log('   ✅ Custom headers (x-api-key) configured correctly');
    console.log('   ✅ Ready for catcats.net API calls');
    console.log('');
    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAdapterConfig();
