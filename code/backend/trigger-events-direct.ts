import { InMemoryEventBus } from './src/infrastructure/events/in-memory-event-bus';

const eventBus = new InMemoryEventBus();

async function triggerEvents() {
  console.log('🎯 Publishing test events directly to EventBus...\n');

  // Test 1: Publish a message.created event
  console.log('📨 Publishing message.created event...');
  eventBus.publish({
    eventId: 'test-event-1',
    eventType: 'message.created',
    aggregateType: 'channel',
    aggregateId: 'test-channel-123',
    timestamp: new Date(),
    payload: {
      channelId: 'test-channel-123',
      messageId: 'test-message-1',
      content: 'Hello from direct event!',
      senderId: 'test-user-123',
    },
  });
  console.log('✅ message.created event published');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Publish a task.created event
  console.log('\n📋 Publishing task.created event...');
  eventBus.publish({
    eventId: 'test-event-2',
    eventType: 'task.created',
    aggregateType: 'task',
    aggregateId: 'test-task-1',
    timestamp: new Date(),
    payload: {
      channelId: 'test-channel-123',
      taskId: 'test-task-1',
      title: 'Test Task',
      description: 'Task from direct event',
      assigneeId: 'test-user-123',
    },
  });
  console.log('✅ task.created event published');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Publish a task.status_changed event
  console.log('\n🔄 Publishing task.status_changed event...');
  eventBus.publish({
    eventId: 'test-event-3',
    eventType: 'task.status_changed',
    aggregateType: 'task',
    aggregateId: 'test-task-1',
    timestamp: new Date(),
    payload: {
      channelId: 'test-channel-123',
      taskId: 'test-task-1',
      oldStatus: 'TODO',
      newStatus: 'IN_PROGRESS',
    },
  });
  console.log('✅ task.status_changed event published');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Publish an agent.status_changed event
  console.log('\n🤖 Publishing agent.status_changed event...');
  eventBus.publish({
    eventId: 'test-event-4',
    eventType: 'agent.status_changed',
    aggregateType: 'agent',
    aggregateId: 'test-agent-1',
    timestamp: new Date(),
    payload: {
      agentId: 'test-agent-1',
      oldStatus: 'idle',
      newStatus: 'processing',
    },
  });
  console.log('✅ agent.status_changed event published');

  console.log('\n✨ All events published successfully!');
  console.log('Check the subscription test output for received events.');
}

triggerEvents();
