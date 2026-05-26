/**
 * Integration test for AdapterExecutor
 * Tests real API calls to Anthropic and OpenAI
 */

import { AdapterExecutor } from './adapter-executor';
import { ExecutionRequest } from './types';

async function testAnthropicAPI() {
  console.log('🧪 Testing Anthropic API...');

  const executor = new AdapterExecutor({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });

  const request: ExecutionRequest = {
    taskId: 'test-anthropic-1',
    realmId: 'test-realm',
    agentId: 'test-agent',
    input: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
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
    const result = await executor.execute(request);
    console.log('✅ Anthropic API test passed');
    console.log('   Output:', result.output);
    console.log('   Execution time:', result.executionTime, 'ms');
    console.log('   Usage:', result.usage);
    return true;
  } catch (error) {
    console.error('❌ Anthropic API test failed:', error);
    return false;
  }
}

async function testOpenAIAPI() {
  console.log('\n🧪 Testing OpenAI API...');

  const executor = new AdapterExecutor({
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  const request: ExecutionRequest = {
    taskId: 'test-openai-1',
    realmId: 'test-realm',
    agentId: 'test-agent',
    input: {
      provider: 'openai',
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from GPT!" and nothing else.',
        },
      ],
      maxTokens: 100,
      temperature: 1.0,
    },
  };

  try {
    const result = await executor.execute(request);
    console.log('✅ OpenAI API test passed');
    console.log('   Output:', result.output);
    console.log('   Execution time:', result.executionTime, 'ms');
    console.log('   Usage:', result.usage);
    return true;
  } catch (error) {
    console.error('❌ OpenAI API test failed:', error);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🧪 Testing error handling...');

  const executor = new AdapterExecutor({});

  const request: ExecutionRequest = {
    taskId: 'test-error-1',
    realmId: 'test-realm',
    agentId: 'test-agent',
    input: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hello' }],
    },
  };

  try {
    await executor.execute(request);
    console.error('❌ Error handling test failed: should have thrown error');
    return false;
  } catch (error) {
    if ((error as Error).message.includes('API key not configured')) {
      console.log('✅ Error handling test passed');
      return true;
    } else {
      console.error('❌ Error handling test failed: wrong error message');
      return false;
    }
  }
}

async function testTaskManagement() {
  console.log('\n🧪 Testing task management...');

  const executor = new AdapterExecutor({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('   Initial active tasks:', executor.getActiveTaskCount());

  if (executor.getActiveTaskCount() !== 0) {
    console.error('❌ Task management test failed: initial count should be 0');
    return false;
  }

  executor.cancelTask('non-existent-task');
  console.log('   After cancel non-existent:', executor.getActiveTaskCount());

  console.log('✅ Task management test passed');
  return true;
}

async function main() {
  console.log('🚀 Starting AdapterExecutor Integration Tests\n');

  const results = {
    anthropic: false,
    openai: false,
    errorHandling: false,
    taskManagement: false,
  };

  // Test Anthropic API
  if (process.env.ANTHROPIC_API_KEY) {
    results.anthropic = await testAnthropicAPI();
  } else {
    console.log('⚠️  Skipping Anthropic test: ANTHROPIC_API_KEY not set');
  }

  // Test OpenAI API
  if (process.env.OPENAI_API_KEY) {
    results.openai = await testOpenAIAPI();
  } else {
    console.log('⚠️  Skipping OpenAI test: OPENAI_API_KEY not set');
  }

  // Test error handling
  results.errorHandling = await testErrorHandling();

  // Test task management
  results.taskManagement = await testTaskManagement();

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('   Anthropic API:', results.anthropic ? '✅' : '⚠️  Skipped');
  console.log('   OpenAI API:', results.openai ? '✅' : '⚠️  Skipped');
  console.log('   Error Handling:', results.errorHandling ? '✅' : '❌');
  console.log('   Task Management:', results.taskManagement ? '✅' : '❌');

  const allPassed =
    results.errorHandling &&
    results.taskManagement &&
    (results.anthropic || !process.env.ANTHROPIC_API_KEY) &&
    (results.openai || !process.env.OPENAI_API_KEY);

  if (allPassed) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
