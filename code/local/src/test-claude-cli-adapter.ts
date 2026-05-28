#!/usr/bin/env node
/**
 * Claude CLI Adapter Test Script
 *
 * 快速测试 Claude CLI adapter 是否工作
 */

import { ClaudeCodeCLIAdapter } from './infrastructure/adapters/llm/claude-code-cli-adapter';

async function main() {
  console.log('🧪 Testing Claude CLI Adapter...\n');

  // 1. 检查 Claude CLI 是否可用
  console.log('1️⃣  Checking if Claude CLI is available...');
  const isAvailable = await ClaudeCodeCLIAdapter.isAvailable();
  console.log(`   ${isAvailable ? '✅' : '❌'} Claude CLI ${isAvailable ? 'is' : 'is not'} available\n`);

  if (!isAvailable) {
    console.log('❌ Claude CLI not found. Please ensure:');
    console.log('   1. Claude Code is installed');
    console.log('   2. "claude" command is in your PATH');
    console.log('   3. You are authenticated (run: claude auth login)\n');
    process.exit(1);
  }

  // 2. 创建 adapter 实例
  console.log('2️⃣  Creating adapter instance...');
  const adapter = new ClaudeCodeCLIAdapter({
    model: 'haiku', // 使用 haiku 更快
    timeout: 30000, // 30 seconds
  });
  console.log('   ✅ Adapter created\n');

  // 3. 测试简单的响应
  console.log('3️⃣  Testing simple response...');
  console.log('   Prompt: "What is 2 + 2? Answer with just the number."\n');

  try {
    const response = await adapter.generateResponse({
      systemPrompt: 'You are a helpful assistant.',
      messages: [
        {
          role: 'user',
          content: 'What is 2 + 2? Answer with just the number.',
        },
      ],
    });

    console.log('   ✅ Response received:');
    console.log(`   "${response}"\n`);
  } catch (error) {
    console.error('   ❌ Error:', error);
    process.exit(1);
  }

  // 4. 测试流式响应
  console.log('4️⃣  Testing streaming response...');
  console.log('   Prompt: "Count from 1 to 5."\n');

  try {
    const chunks: string[] = [];
    let statusChanges: string[] = [];
    let usageInfo: any = null;

    const response = await adapter.generateResponse({
      systemPrompt: 'You are a helpful assistant.',
      messages: [
        {
          role: 'user',
          content: 'Count from 1 to 5.',
        },
      ],
      streaming: {
        onThinking: (chunk) => {
          chunks.push(chunk);
          process.stdout.write(chunk);
        },
        onStatusChange: (status) => {
          statusChanges.push(status);
        },
        onUsage: (usage) => {
          usageInfo = usage;
        },
      },
    });

    console.log('\n\n   ✅ Streaming completed');
    console.log(`   Chunks received: ${chunks.length}`);
    console.log(`   Status changes: ${statusChanges.join(' → ')}`);

    if (usageInfo) {
      console.log(`   Token usage:`);
      console.log(`     - Input: ${usageInfo.input_tokens}`);
      console.log(`     - Output: ${usageInfo.output_tokens}`);
      console.log(`     - Total: ${usageInfo.total_tokens}`);
      console.log(`     - Speed: ${usageInfo.latency?.tokens_per_second?.toFixed(2)} tokens/sec`);
    }
    console.log();
  } catch (error) {
    console.error('   ❌ Error:', error);
    process.exit(1);
  }

  // 5. 测试 Adapter Manager 集成
  console.log('5️⃣  Testing Adapter Manager integration...');

  try {
    const { AdapterManager } = await import('./infrastructure/adapters/adapter-manager');
    const manager = new AdapterManager();

    await manager.loadAdapter({
      name: 'claude-cli',
      type: 'custom',
      version: '1.0.0',
      enabled: true,
      config: {
        cliPath: 'claude',
        model: 'haiku',
        timeout: 30000,
      },
    });

    const loadedAdapter = await manager.getAdapter('claude-cli');
    console.log(`   ✅ Adapter loaded: ${loadedAdapter ? 'Yes' : 'No'}`);

    if (loadedAdapter) {
      const testResponse = await loadedAdapter.generateResponse({
        systemPrompt: 'You are a helpful assistant. Be very brief.',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from Adapter Manager!" in one sentence.',
          },
        ],
      });
      console.log(`   ✅ Response: "${testResponse}"\n`);
    }
  } catch (error) {
    console.error('   ❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ All tests passed!\n');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
