/**
 * Integration test for AdapterExecutor using Claude Code CLI
 * No API keys needed - uses Claude Code's built-in adapter
 */

import { AdapterExecutor } from './adapter-executor';
import { ExecutionRequest } from './types';

async function testWithClaudeCodeCLI() {
  console.log('🧪 Testing AdapterExecutor with Claude Code CLI...\n');

  // Test 1: Simple Anthropic request
  console.log('Test 1: Simple Anthropic API call');
  const executor = new AdapterExecutor({
    anthropicApiKey: 'dummy-key-for-claude-code-cli',
  });

  const request: ExecutionRequest = {
    taskId: 'test-1',
    realmId: 'test-realm',
    agentId: 'test-agent',
    input: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Claude!" and nothing else.',
        },
      ],
      maxTokens: 100,
      temperature: 1.0,
    },
  };

  try {
    console.log('   Executing request...');
    const result = await executor.execute(request);
    console.log('   ✅ Success!');
    console.log('   Output:', result.output);
    console.log('   Execution time:', result.executionTime, 'ms');
    console.log('   Usage:', result.usage);
    console.log('');
    return true;
  } catch (error) {
    console.error('   ❌ Failed:', (error as Error).message);
    console.log('');
    return false;
  }
}

async function testErrorHandling() {
  console.log('Test 2: Error handling (no API key)');

  const executor = new AdapterExecutor({});

  const request: ExecutionRequest = {
    taskId: 'test-error',
    realmId: 'test-realm',
    agentId: 'test-agent',
    input: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
      messages: [{ role: 'user', content: 'Hello' }],
    },
  };

  try {
    await executor.execute(request);
    console.log('   ❌ Should have thrown error');
    console.log('');
    return false;
  } catch (error) {
    if ((error as Error).message.includes('API key not configured')) {
      console.log('   ✅ Correctly threw error');
      console.log('');
      return true;
    } else {
      console.log('   ❌ Wrong error:', (error as Error).message);
      console.log('');
      return false;
    }
  }
}

async function testTaskManagement() {
  console.log('Test 3: Task management');

  const executor = new AdapterExecutor({
    anthropicApiKey: 'dummy-key',
  });

  const initialCount = executor.getActiveTaskCount();
  console.log('   Initial active tasks:', initialCount);

  if (initialCount !== 0) {
    console.log('   ❌ Initial count should be 0');
    console.log('');
    return false;
  }

  executor.cancelTask('non-existent-task');
  const afterCancel = executor.getActiveTaskCount();
  console.log('   After cancel:', afterCancel);

  if (afterCancel !== 0) {
    console.log('   ❌ Count should still be 0');
    console.log('');
    return false;
  }

  console.log('   ✅ Task management works correctly');
  console.log('');
  return true;
}

async function testUnsupportedProvider() {
  console.log('Test 4: Unsupported provider');

  const executor = new AdapterExecutor({
    anthropicApiKey: 'dummy-key',
  });

  const request: ExecutionRequest = {
    taskId: 'test-unsupported',
    realmId: 'test-realm',
    agentId: 'test-agent',
    input: {
      provider: 'unsupported' as any,
      model: 'model',
      messages: [{ role: 'user', content: 'Hello' }],
    },
  };

  try {
    await executor.execute(request);
    console.log('   ❌ Should have thrown error');
    console.log('');
    return false;
  } catch (error) {
    if ((error as Error).message.includes('Unsupported provider')) {
      console.log('   ✅ Correctly threw error');
      console.log('');
      return true;
    } else {
      console.log('   ❌ Wrong error:', (error as Error).message);
      console.log('');
      return false;
    }
  }
}

async function main() {
  console.log('🚀 AdapterExecutor Integration Test\n');
  console.log('Using Claude Code CLI adapter (no API keys needed)\n');
  console.log('═'.repeat(60));
  console.log('');

  const results = {
    claudeCodeCLI: false,
    errorHandling: false,
    taskManagement: false,
    unsupportedProvider: false,
  };

  // Run tests
  results.claudeCodeCLI = await testWithClaudeCodeCLI();
  results.errorHandling = await testErrorHandling();
  results.taskManagement = await testTaskManagement();
  results.unsupportedProvider = await testUnsupportedProvider();

  // Summary
  console.log('═'.repeat(60));
  console.log('\n📊 Test Summary:\n');
  console.log('   Claude Code CLI:', results.claudeCodeCLI ? '✅ PASS' : '❌ FAIL');
  console.log('   Error Handling:', results.errorHandling ? '✅ PASS' : '❌ FAIL');
  console.log('   Task Management:', results.taskManagement ? '✅ PASS' : '❌ FAIL');
  console.log('   Unsupported Provider:', results.unsupportedProvider ? '✅ PASS' : '❌ FAIL');

  const allPassed = Object.values(results).every((r) => r);

  console.log('');
  if (allPassed) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
