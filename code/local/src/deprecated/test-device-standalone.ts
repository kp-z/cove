/**
 * Device 模式独立测试（不依赖 Cloud Backend）
 *
 * 直接测试 DeviceProcessor 和 Claude Code CLI Adapter
 */

import { ClaudeCodeCLIAdapter } from './infrastructure/adapters/llm/claude-code-cli-adapter';
import { DeviceProcessor } from './domain/agent-runtime/device-processor';
import type { MessageTask } from './domain/agent-runtime/message-orchestrator.interface';

async function testDeviceProcessorStandalone() {
  console.log('🚀 开始测试 Device Processor（独立模式）...\n');

  // 1. 检查 Claude CLI 是否可用
  console.log('📋 步骤 1: 检查 Claude CLI 是否可用');
  const isAvailable = await ClaudeCodeCLIAdapter.isAvailable();
  if (!isAvailable) {
    console.error('❌ Claude CLI 不可用，请确保已安装 Claude Code CLI');
    console.log('   安装方法: https://docs.anthropic.com/claude/docs/claude-code');
    process.exit(1);
  }
  console.log('✅ Claude CLI 可用\n');

  // 2. 创建 Claude CLI Adapter
  console.log('📋 步骤 2: 初始化 Claude CLI Adapter');
  const claudeAdapter = new ClaudeCodeCLIAdapter({
    model: 'opus',
    thinkingEnabled: true,
    timeout: 120000,
  });
  console.log('✅ Adapter 初始化完成\n');

  // 3. 创建 DeviceProcessor（不需要 BackendGateway）
  console.log('📋 步骤 3: 初始化 DeviceProcessor');
  const deviceProcessor = new DeviceProcessor({
    llmAdapter: claudeAdapter,
  });
  console.log('✅ DeviceProcessor 初始化完成\n');

  // 4. 创建测试消息任务
  console.log('📋 步骤 4: 创建测试消息');
  const testTask: MessageTask = {
    id: `task-${Date.now()}`,
    messageId: `msg-${Date.now()}`,
    channelId: 'test-channel',
    content: 'Hello! Please respond with a simple greeting in one sentence.',
    state: 'PENDING',
    executionMode: 'device',
    attempts: 0,
    maxAttempts: 3,
    priority: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log(`   任务 ID: ${testTask.id}`);
  console.log(`   消息 ID: ${testTask.messageId}`);
  console.log(`   内容: ${testTask.content}\n`);

  // 5. 处理消息
  console.log('📋 步骤 5: 处理消息');
  console.log('   ⏳ 调用 Claude Code CLI...');
  console.log('   （这可能需要几秒钟，Claude 正在思考...）\n');

  const startTime = Date.now();

  try {
    const result = await deviceProcessor.process(testTask);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    if (result.success) {
      console.log('   ✅ 消息处理成功！\n');
      console.log('📊 处理结果:');
      console.log(`   成功: ${result.success}`);
      console.log(`   耗时: ${duration} 秒`);
      if (result.response) {
        console.log(`   响应: ${result.response}`);
      }
    } else {
      console.log('   ❌ 消息处理失败\n');
      console.log('📊 错误信息:');
      console.log(`   成功: ${result.success}`);
      console.log(`   错误: ${result.error}`);
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('   错误详情:', error.message);
      console.error('   堆栈:', error.stack);
    }
    process.exit(1);
  }

  console.log('\n✅ 测试完成！');
  console.log('\n💡 提示:');
  console.log('   - Device Processor 可以独立工作，不需要 Cloud Backend');
  console.log('   - 使用 Claude Code CLI 作为 LLM 提供者');
  console.log('   - 适合本地开发和测试');
}

// 运行测试
testDeviceProcessorStandalone().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
