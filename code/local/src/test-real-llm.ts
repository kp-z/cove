import { AdapterExecutor } from './adapter-executor';
import { ExecutionRequest } from './types';

async function main() {
  console.log('🚀 Real LLM API Call Test\n');
  console.log('═'.repeat(60));

  const executor = new AdapterExecutor({
    anthropicApiKey: process.env.ANTHROPIC_AUTH_TOKEN || '',
  });

  const request: ExecutionRequest = {
    taskId: 'test-real-llm',
    realmId: 'test-realm',
    agentId: 'test-agent',
    input: {
      provider: 'anthropic',
      model: 'claude-opus-4-7',
      messages: [
        {
          role: 'user',
          content: '请用中文说"你好，我是 Claude！"',
        },
      ],
      maxTokens: 100,
      temperature: 1.0,
    },
  };

  try {
    console.log('\n📤 Sending request to Claude Opus 4.7...\n');
    const result = await executor.execute(request);

    console.log('✅ Success!\n');
    console.log('📝 Response:');
    console.log(`   "${result.output}"\n`);
    console.log(`⏱️  Execution time: ${result.executionTime}ms`);
    
    if (result.usage) {
      console.log(`📊 Token usage:`);
      console.log(`   Input: ${result.usage.inputTokens}`);
      console.log(`   Output: ${result.usage.outputTokens}`);
      console.log(`   Total: ${result.usage.inputTokens + result.usage.outputTokens}`);
    }

    console.log('\n═'.repeat(60));
    console.log('\n🎉 AdapterExecutor 完全正常工作！');
    
  } catch (error) {
    console.log('❌ Failed:', (error as Error).message);
    process.exit(1);
  }
}

main().catch(console.error);
