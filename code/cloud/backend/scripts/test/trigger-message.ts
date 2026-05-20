import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './src/infrastructure/api/trpc/router';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/trpc',
    }),
  ],
});

async function triggerMessage() {
  console.log('🎯 Triggering message event...\n');

  try {
    // First, create a test channel
    console.log('📝 Creating test channel...');
    const channel = await client.channel.create.mutate({
      name: 'Test Channel',
      type: 'public',
      createdBy: 'test-user-123',
    });
    console.log('✅ Channel created:', channel.channel_id);

    // Add the user as a member
    console.log('\n👥 Adding user as member...');
    await client.channel.addMember.mutate({
      channelId: channel.channel_id,
      memberId: 'test-user-123',
    });
    console.log('✅ User added as member');

    // Send message to the newly created channel
    console.log(`\n📨 Sending message to channel ${channel.channel_id}...`);
    const message = await client.message.send.mutate({
      channelId: channel.channel_id,
      senderId: 'test-user-123',
      content: `Test message at ${new Date().toISOString()}`,
    });
    console.log('✅ Message sent:', message.message_id);

    console.log('\n✨ Message event triggered successfully!');
    console.log('Check the subscription test output for received events.');
    console.log(`\n💡 Update test-subscription.ts to listen to channel: ${channel.channel_id}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

triggerMessage();
