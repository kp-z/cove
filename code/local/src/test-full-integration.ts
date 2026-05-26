/**
 * Full integration test - Test actual LLM API call
 */

import { AdapterExecutor } from './adapter-executor';
import { ExecutionRequest } from './types';
import { loadClaudeCodeCLIConfig } from './claude-code-cli-adapter';
import { fetchModelsFromAPI, getRecommendedModel } from './adapter-utils';

async function main() {
  console.log('🚀 Full Integration Test - LLM API Call\n');
  console.log('═'.repeat(60));

  // 1. Load configuration
  console.log('\n1. Loading Claude Code CLI configuration...');
  const config = loadClaudeCodeCLIConfig();
  if (!config) {
    console.log('   ❌ Configuration not available');
    return;
  }
  console.log(`   ✅ Base URL: ${config.baseUrl}`);

  // 2. Get recommended model
  console.log('\n2. Getting recommended model...');
  const models = await fetchModelsFromAPI(config.baseUrl, config.apiKey);
  const model = getRecommendedModel(models);
  console.log(`   ✅ Using model: ${model}`);

  // 3. Initialize AdapterExecutor
  console.log('\n3. Initializing AdapterExecutor...');
  const executor = new AdapterExecutor({
    anthropicApiKey: config.apiKey,
  });
  console.log('   ✅ Executor initialized');

  // 4. Execute a simple request
  console.log('\n4. Executing LLM request...');
  const request: ExecutionRequest = {
    taskId: 'test-full-integration',
    realmId: 'test-realm',
    agentId: 'test-agent',
    input: {
      provider: 'anthropic',
      model: model,
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
    const startTime = Date.now();
    const result = await executor.execute(request);
    const duration = Date.now() - startTime;

    console.log('   ✅ Request successful!\n');
    console.log('   📝 Response:');
    console.log(`   "${result.output}"\n`);
    console.log(`   ⏱️  Execution time: ${result.executionTime}ms (total: ${duration}ms)`);
    
    if (result.usage) {
      console.log(`   📊 Token usage:`);
      console.log(`      Input: ${result.usage.inputTokens}`);
      console.log(`      Output: ${result.usage.outputTokens}`);
      console.log(`      Total: ${result.usage.inputTokens + result.usage.outputTokens}`);
    }

    console.log('\n═'.repeat(60));
    console.log('\n✅ Full integration test PASSED!');
    console.log('\n🎉 AdapterExecutor is working correctly with Claude Code CLI!');
    
  } catch (error) {
    console.log('   ❌ Request failed\n');
    console.error('   Error:', (error as Error).message);
    console.log('\n═'.repeat(60));
    console.log('\n❌ Full integration test FAILED');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
