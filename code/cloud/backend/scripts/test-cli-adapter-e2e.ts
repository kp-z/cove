import { ClaudeCodeCLIAdapter } from '../src/infrastructure/adapters/llm/claude-code-cli-adapter';

/**
 * Manual E2E Test for Claude Code CLI Adapter
 *
 * This script performs a real end-to-end test by:
 * 1. Creating an adapter instance
 * 2. Sending a real message to Claude CLI
 * 3. Receiving and displaying the response
 */

async function runE2ETest() {
  console.log('🧪 Starting E2E Test for Claude Code CLI Adapter\n');

  try {
    // Test 1: Basic message
    console.log('📝 Test 1: Basic message');
    console.log('Creating adapter with haiku model...');

    const adapter = new ClaudeCodeCLIAdapter({
      cliPath: 'claude',
      model: 'haiku',
      timeout: 30000,
    });

    console.log('Sending message: "Say hello in one sentence"');
    const startTime = Date.now();

    const response = await adapter.generateResponse({
      systemPrompt: 'You are a helpful assistant. Be very brief.',
      messages: [
        { role: 'user', content: 'Say hello in one sentence' }
      ],
    });

    const duration = Date.now() - startTime;

    console.log('✅ Response received!');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📄 Response: "${response}"\n`);

    // Test 2: Different model
    console.log('📝 Test 2: Different model (sonnet)');
    const adapter2 = new ClaudeCodeCLIAdapter({
      cliPath: 'claude',
      model: 'sonnet',
      timeout: 30000,
    });

    console.log('Sending message: "What is 2+2? Answer in one word."');
    const response2 = await adapter2.generateResponse({
      systemPrompt: 'You are a math assistant.',
      messages: [
        { role: 'user', content: 'What is 2+2? Answer in one word.' }
      ],
    });

    console.log('✅ Response received!');
    console.log(`📄 Response: "${response2}"\n`);

    // Test 3: Conversation history
    console.log('📝 Test 3: Conversation history');
    const adapter3 = new ClaudeCodeCLIAdapter({
      cliPath: 'claude',
      model: 'haiku',
      timeout: 30000,
    });

    console.log('Sending conversation with history...');
    const response3 = await adapter3.generateResponse({
      systemPrompt: 'You are a helpful assistant.',
      messages: [
        { role: 'user', content: 'My name is Alice' },
        { role: 'assistant', content: 'Hello Alice! Nice to meet you.' },
        { role: 'user', content: 'What is my name?' }
      ],
    });

    console.log('✅ Response received!');
    console.log(`📄 Response: "${response3}"\n`);

    console.log('🎉 All E2E tests passed!\n');
    console.log('Summary:');
    console.log('- ✅ Basic message: Success');
    console.log('- ✅ Different model: Success');
    console.log('- ✅ Conversation history: Success');

    process.exit(0);
  } catch (error) {
    console.error('❌ E2E Test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runE2ETest();
