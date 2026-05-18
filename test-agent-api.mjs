import fetch from 'node-fetch';

async function testAgentAPI() {
  try {
    console.log('Testing agent.getById API...\n');

    const agentId = 'agent-1778995920870-uvd53im';
    const url = `http://localhost:3001/trpc/agent.getById?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { id: agentId } }))}`;

    const response = await fetch(url);
    const data = await response.json();
    const result = data[0].result.data;

    console.log('Agent ID:', result.id);
    console.log('Agent Name:', result.name);
    console.log('Created By:', result.createdBy);
    console.log('\nRuntime adapter_id:', result.runtime?.adapter_id);
    console.log('\nAdapter object:', result.adapter ? 'Present ✓' : 'null ✗');

    if (result.adapter) {
      console.log('\n=== Adapter Details ===');
      console.log('Adapter ID:', result.adapter.id);
      console.log('Adapter Name:', result.adapter.name);
      console.log('Adapter Owner:', result.adapter.owner_id);
      console.log('Adapter Scope:', result.adapter.scope);
      console.log('Model:', result.adapter.model);
      console.log('API Endpoint:', result.adapter.api?.endpoint);
      console.log('\n✅ SUCCESS: Adapter loaded correctly!');
    } else {
      console.log('\n❌ FAILED: Adapter is still null');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAgentAPI();
