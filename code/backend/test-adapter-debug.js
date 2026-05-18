const yaml = require('yaml');
const fs = require('fs');

// Read adapter config
const adapterPath = '/Users/kp/项目/Proj/cove/.cove/adapters/private/5d6822ff-43a4-443b-a5eb-65d5015a445c.yaml';
const adapterContent = fs.readFileSync(adapterPath, 'utf-8');
const adapter = yaml.parse(adapterContent);

console.log('Adapter config:');
console.log('  ID:', adapter.id);
console.log('  Owner ID:', adapter.owner_id);
console.log('  Scope:', adapter.scope);
console.log('');

// Read agent metadata
const agentPath = '/Users/kp/项目/Proj/cove/.cove/storage/agents/agent-1778995920870-uvd53im/agent.json';
const agentContent = fs.readFileSync(agentPath, 'utf-8');
const agent = JSON.parse(agentContent);

console.log('Agent metadata:');
console.log('  ID:', agent.id);
console.log('  Name:', agent.name);
console.log('  Created By:', agent.createdBy);
console.log('');

console.log('Permission check:');
console.log('  Adapter owner_id:', adapter.owner_id);
console.log('  Agent createdBy:', agent.createdBy);
console.log('  Match?', adapter.owner_id === agent.createdBy);
