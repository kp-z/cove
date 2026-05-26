import { fetchModelsFromAPI, getRecommendedModel } from './adapter-utils';
import { loadClaudeCodeCLIConfig, isClaudeCodeCLIAvailable } from './claude-code-cli-adapter';

async function main() {
  console.log('🧪 Testing Claude Code CLI Adapter\n');
  console.log('═'.repeat(60));

  console.log('\n1. Checking availability...');
  const isAvailable = isClaudeCodeCLIAvailable();
  console.log(`   Available: ${isAvailable ? '✅' : '❌'}`);

  if (!isAvailable) {
    console.log('\n⚠️  Not configured');
    return;
  }

  console.log('\n2. Loading configuration...');
  const config = loadClaudeCodeCLIConfig();
  if (!config) return;
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   API Key: ${config.apiKey.substring(0, 20)}...`);

  console.log('\n3. Fetching models...');
  const models = await fetchModelsFromAPI(config.baseUrl, config.apiKey);
  console.log(`   ✅ Found ${models.length} models:\n`);
  models.forEach((model, i) => {
    console.log(`   ${i + 1}. ${model.id}`);
  });

  console.log('\n4. Getting recommended model...');
  const recommended = getRecommendedModel(models);
  console.log(`   ✅ Recommended: ${recommended}`);

  console.log('\n═'.repeat(60));
  console.log('\n✅ All tests passed!');
}

main().catch(console.error);
