#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const files = [
  'src/application/services/agent/agent-config.service.ts',
  'src/application/services/agent/agent-response.service.ts',
  'src/application/services/agent/agent-task.service.ts',
  'src/application/services/channel/channel-crud.service.ts',
  'src/application/services/channel/channel-lifecycle.service.ts',
  'src/application/services/channel/channel-member.service.ts',
  'src/application/services/channel/channel-messaging.service.ts',
  'src/application/services/member/member.service.ts',
  'src/application/services/message/message-crud.service.ts',
  'src/application/services/message/message-reaction.service.ts',
  'src/application/services/project/project-composition.service.ts',
  'src/application/services/task/task-assignment.service.ts',
  'src/application/services/task/task-status.service.ts',
  'src/application/services/task/task.service.ts',
  'src/application/services/thread/thread.service.ts',
  'src/application/services/user/user.service.ts',
  'src/application/services/workflow/workflow-crud.service.ts',
  'src/application/services/workflow/workflow-lifecycle.service.ts',
  'src/application/services/workflow/workflow-trigger.service.ts',
];

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  const fullPath = path.join(__dirname, filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 检测方法定义：async methodName(...): ReturnType {
    const methodMatch = line.match(/^(\s+)(async\s+\w+\([^)]*\)\s*:\s*[^{]+\{)\s*$/);

    if (methodMatch) {
      const indent = methodMatch[1];
      const methodDecl = methodMatch[2];

      // 添加方法声明
      result.push(line);
      i++;

      // 检查接下来的行，看是否需要添加 const context = getServerContext();
      // 先跳过空行和注释
      while (i < lines.length && (lines[i].trim() === '' || lines[i].trim().startsWith('//'))) {
        result.push(lines[i]);
        i++;
      }

      // 检查是否已经有 const context = getServerContext();
      if (i < lines.length && lines[i].includes('const context = getServerContext()')) {
        // 已经有了，继续
        result.push(lines[i]);
        i++;
        continue;
      }

      // 检查这个方法是否使用了 context.serverId 或 context.userId
      // 找到方法的结束位置
      let braceCount = 1;
      let methodEnd = i;
      let usesContext = false;

      while (methodEnd < lines.length && braceCount > 0) {
        const l = lines[methodEnd];

        // 检查是否使用了 context
        if (l.includes('context.serverId') || l.includes('context.userId')) {
          usesContext = true;
        }

        // 计算大括号
        for (const char of l) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (braceCount === 0) break;
        }

        methodEnd++;
      }

      // 如果使用了 context，添加 const context = getServerContext();
      if (usesContext) {
        result.push(`${indent}    const context = getServerContext();`);
      }

      continue;
    }

    result.push(line);
    i++;
  }

  fs.writeFileSync(fullPath, result.join('\n'), 'utf-8');
  console.log(`✓ Completed: ${filePath}`);
}

console.log('Adding getServerContext() calls...\n');

for (const file of files) {
  try {
    processFile(file);
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
}

console.log('\n✓ All files processed!');
