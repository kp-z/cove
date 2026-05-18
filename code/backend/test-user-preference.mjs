const API_URL = 'http://localhost:3001/trpc';

async function testUserPreference() {
  console.log('🧪 Testing User Preference API\n');

  try {
    // 1. Get user by ID
    console.log('1️⃣ Getting user-kp...');
    const getUserResponse = await fetch(
      `${API_URL}/user.getById?input=${encodeURIComponent(JSON.stringify({ userId: 'user-kp' }))}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!getUserResponse.ok) {
      const error = await getUserResponse.text();
      console.error('❌ Failed to get user:', error);
      return;
    }

    const getUserData = await getUserResponse.json();
    console.log('✅ User data:', JSON.stringify(getUserData.result.data, null, 2));
    console.log('\n📋 Preference field:', getUserData.result.data.preference);

    // 2. Update user preference
    console.log('\n2️⃣ Updating user preference...');
    const updateResponse = await fetch(`${API_URL}/user.update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-kp',
        data: {
          preference: {
            pinned_channels: ['channel-1', 'channel-2', 'channel-3']
          }
        }
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Failed to update user:', error);
      return;
    }

    const updateData = await updateResponse.json();
    console.log('✅ Updated user data:', JSON.stringify(updateData.result.data, null, 2));
    console.log('\n📋 Updated preference:', updateData.result.data.preference);

    // 3. Get user again to verify
    console.log('\n3️⃣ Verifying update...');
    const verifyResponse = await fetch(
      `${API_URL}/user.getById?input=${encodeURIComponent(JSON.stringify({ userId: 'user-kp' }))}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const verifyData = await verifyResponse.json();
    console.log('✅ Verified preference:', verifyData.result.data.preference);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserPreference();
