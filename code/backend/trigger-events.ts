import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './src/infrastructure/api/trpc/router';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/trpc',
    }),
  ],
});

async function triggerEvents() {
  console.log('🎯 Triggering test events...\n');

  try {
    // Test 1: Create a channel (if not exists)
    console.log('📝 Creating test channel...');
    const channel = await client.channel.create.mutate({
      name: 'Test Channel',
      description: 'Channel for subscription testing',
      type: 'public',
      createdBy: 'test-user-123',
    });
    console.log('✅ Channel created:', channel.id);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Send a message
    console.log('\n📨 Sending test message...');
    const message = await client.message.send.mutate({
      channelId: channel.id,
      content: 'Hello from subscription test!',
      senderId: 'test-user-123',
    });
    console.log('✅ Message sent:', message.id);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Create a task
    console.log('\n📋 Creating test task...');
    const task = await client.task.create.mutate({
      channelId: channel.id,
      title: 'Test Task',
      description: 'Task for subscription testing',
      assigneeId: 'test-user-123',
    });
    console.log('✅ Task created:', task.id);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: Update task status
    console.log('\n🔄 Updating task status...');
    await client.task.updateStatus.mutate({
      taskId: task.id,
      status: 'IN_PROGRESS',
    });
    console.log('✅ Task status updated');

    console.log('\n✨ All events triggered successfully!');
    console.log('Check the subscription test output for received events.');

  } catch (error) {
    console.error('❌ Error triggering events:', error);
  }
}

triggerEvents();
