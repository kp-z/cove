/**
 * tRPC Subscription 测试脚本
 *
 * 测试内容：
 * 1. WebSocket 连接建立
 * 2. Channel 事件订阅
 * 3. Task 事件订阅
 * 4. Agent 事件订阅
 */

import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import type { AppRouter } from './src/infrastructure/trpc/routers';
import ws from 'ws';

const PORT = 3001;
const WS_URL = `ws://localhost:${PORT}`;

// 创建 WebSocket 客户端
const wsClient = createWSClient({
  url: WS_URL,
  WebSocket: ws as any,
});

// 创建 tRPC 客户端
const client = createTRPCClient<AppRouter>({
  links: [wsLink({ client: wsClient })],
});

async function testSubscriptions() {
  console.log('🚀 Starting tRPC Subscription Tests...\n');

  try {
    // 测试 1: Message 事件订阅（所有频道）
    console.log('📡 Test 1: Subscribing to message events...');
    const messageSub = client.subscription.onMessage.subscribe(
      {},
      {
        onData: (data) => {
          console.log('✅ Received message event:', JSON.stringify(data, null, 2));
        },
        onError: (err) => {
          console.error('❌ Message subscription error:', err.message);
        },
      }
    );

    // 测试 2: Task 事件订阅（所有频道）
    console.log('📡 Test 2: Subscribing to task events...');
    const taskSub = client.subscription.onTask.subscribe(
      {},
      {
        onData: (data) => {
          console.log('✅ Received task event:', JSON.stringify(data, null, 2));
        },
        onError: (err) => {
          console.error('❌ Task subscription error:', err.message);
        },
      }
    );

    // 测试 3: Agent 状态订阅
    console.log('📡 Test 3: Subscribing to agent status events...');
    const agentSub = client.subscription.onAgentStatus.subscribe(
      { agentId: 'test-agent-1' },
      {
        onData: (data) => {
          console.log('✅ Received agent status event:', JSON.stringify(data, null, 2));
        },
        onError: (err) => {
          console.error('❌ Agent subscription error:', err.message);
        },
      }
    );

    console.log('\n✅ All subscriptions established successfully!');
    console.log('⏳ Waiting for events... (Press Ctrl+C to exit)\n');

    // 保持连接打开
    await new Promise((resolve) => {
      process.on('SIGINT', () => {
        console.log('\n\n🛑 Stopping subscriptions...');
        messageSub.unsubscribe();
        taskSub.unsubscribe();
        agentSub.unsubscribe();
        wsClient.close();
        console.log('✅ Cleanup complete');
        resolve(void 0);
      });
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    wsClient.close();
    process.exit(1);
  }
}

// 运行测试
testSubscriptions().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
