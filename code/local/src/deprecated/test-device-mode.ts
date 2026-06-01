/**
 * Device 模式端到端测试
 *
 * 测试完整的消息处理流程：
 * 1. 启动 Local Device
 * 2. 连接到 Cloud Backend
 * 3. 接收消息
 * 4. 使用 Claude Code CLI 处理消息
 * 5. 返回响应
 */

import { ClaudeCodeCLIAdapter } from './infrastructure/adapters/llm/claude-code-cli-adapter';
import { MessageOrchestrator } from './domain/agent-runtime/message-orchestrator';
import { DeviceProcessor } from './domain/agent-runtime/device-processor';
import { BackendProcessor } from './domain/agent-runtime/backend-processor';
import { TrpcBackendGateway } from './infrastructure/gateway/trpc-backend-gateway';
import { SqliteMessageQueue } from './infrastructure/storage/sqlite-message-queue';
import { SqliteTaskStore } from './infrastructure/storage/sqlite-task-store';
import { PrismaClient } from '@prisma/client';

async function testDeviceMode() {
  console.log('🚀 开始测试 Device 模式...\n');

  // 1. 检查 Claude CLI 是否可用
  console.log('📋 步骤 1: 检查 Claude CLI 是否可用');
  const isAvailable = await ClaudeCodeCLIAdapter.isAvailable();
  if (!isAvailable) {
    console.error('❌ Claude CLI 不可用，请确保已安装 Claude Code CLI');
    console.log('   安装方法: https://docs.anthropic.com/claude/docs/claude-code');
    process.exit(1);
  }
  console.log('✅ Claude CLI 可用\n');

  // 2. 初始化组件
  console.log('📋 步骤 2: 初始化组件');

  // 创建 Prisma 客户端
  const prisma = new PrismaClient();

  // 创建 Backend Gateway
  const backendGateway = new TrpcBackendGateway(
    'http://localhost:3000/trpc'
  );

  // 创建存储层
  const messageQueue = new SqliteMessageQueue(prisma);
  const taskStore = new SqliteTaskStore(prisma);

  // 创建 Claude CLI Adapter
  const claudeAdapter = new ClaudeCodeCLIAdapter({
    model: 'opus',
    thinkingEnabled: true,
    timeout: 120000,
  });

  // 创建处理器
  const backendProcessor = new BackendProcessor();
  const deviceProcessor = new DeviceProcessor({
    llmAdapter: claudeAdapter,
    backendGateway,
  });

  // 创建 MessageOrchestrator
  const orchestrator = new MessageOrchestrator(
    backendGateway,
    backendProcessor,
    deviceProcessor,
    messageQueue,
    taskStore,
    {
      maxAttempts: 3,
      pollInterval: 1000,
    }
  );

  console.log('✅ 组件初始化完成\n');

  // 3. 测试消息处理
  console.log('📋 步骤 3: 测试消息处理');

  const testMessage = {
    messageId: `test-${Date.now()}`,
    channelId: 'test-channel-1',
    content: 'Hello! Please respond with a simple greeting.',
    priority: 0,
  };

  console.log(`   消息 ID: ${testMessage.messageId}`);
  console.log(`   内容: ${testMessage.content}`);

  try {
    // 将消息加入队列
    console.log('\n   ⏳ 将消息加入队列...');
    const taskId = await orchestrator.enqueue(testMessage);
    console.log(`   ✅ 消息已入队，任务 ID: ${taskId}`);

    // 处理消息
    console.log('\n   ⏳ 开始处理消息...');
    console.log('   （这可能需要几秒钟，Claude 正在思考...）\n');

    const processed = await orchestrator.processNext();

    if (processed) {
      console.log('   ✅ 消息处理完成！\n');

      // 获取任务状态
      const task = await taskStore.get(testMessage.messageId);
      if (task) {
        console.log('📊 任务状态:');
        console.log(`   状态: ${task.state}`);
        console.log(`   执行模式: ${task.executionMode}`);
        console.log(`   尝试次数: ${task.attempts}/${task.maxAttempts}`);
        if (task.completedAt) {
          console.log(`   完成时间: ${task.completedAt.toISOString()}`);
        }
        if (task.error) {
          console.log(`   错误: ${task.error}`);
        }
      }
    } else {
      console.log('   ⚠️  没有消息被处理（队列可能为空）');
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('   错误详情:', error.message);
      console.error('   堆栈:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n✅ 测试完成！');
}

// 运行测试
testDeviceMode().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
