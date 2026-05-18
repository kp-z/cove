#!/usr/bin/env node

/**
 * 批量迁移 Service 文件到 AsyncLocalStorage 方案
 *
 * 功能：
 * 1. 添加 getServerContext 导入
 * 2. 移除方法签名中的 context: ServerContext 参数
 * 3. 在需要的地方添加 const context = getServerContext();
 */

const fs = require('fs');
const path = require('path');

const files = [
  'src/application/services/agent/agent-config.service.ts',
  'src/application/services/agent/agent-crud.service.ts',
  'src/application/services/agent/agent-response.service.ts',
  'src/application/services/agent/agent-task.service.ts',
  'src/application/services/agent/agent.service.ts',
  'src/application/services/channel/channel-crud.service.ts',
  'src/application/services/channel/channel-lifecycle.service.ts',
  'src/application/services/channel/channel-member.service.ts',
  'src/application/services/channel/channel-messaging.service.ts',
  'src/application/services/channel/channel.service.ts',
  'src/application/services/member/member.service.ts',
  'src/application/services/message/message-crud.service.ts',
  'src/application/services/message/message-reaction.service.ts',
  'src/application/services/message/message.service.ts',
  'src/application/services/project/project-composition.service.ts',
  'src/application/services/task/task-assignment.service.ts',
  'src/application/services/task/task-status.service.ts',
  'src/application/services/task/task.service.ts',
  'src/application/services/thread/thread.service.ts',
  'src/application/services/user/user.service.ts',
  'src/application/services/workflow/workflow-crud.service.ts',
  'src/application/services/workflow/workflow-lifecycle.service.ts',
  'src/application/services/workflow/workflow-trigger.service.ts',
  'src/application/services/workflow/workflow.service.ts',
];

function getRelativeImportPath(filePath) {
  const depth = filePath.split('/').length - 3; // src/application/services/xxx/file.ts
  return '../'.repeat(depth) + 'context/server-context-store';
}

function migrateFile(filePath) {
  console.log(`Processing: ${filePath}`);

  const fullPath = path.join(__dirname, filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');

  // 1. 添加 getServerContext 导入（如果还没有）
  const importPath = getRelativeImportPath(filePath);
  const importStatement = `import { getServerContext } from '${importPath}';`;

  if (!content.includes('getServerContext')) {
    // 找到第一个 import 语句后插入
    const firstImportMatch = content.match(/^import .+;$/m);
    if (firstImportMatch) {
      const insertPos = firstImportMatch.index + firstImportMatch[0].length;
      content = content.slice(0, insertPos) + '\n' + importStatement + content.slice(insertPos);
    }
  }

  // 2. 移除 ServerContext 导入（如果存在）
  content = content.replace(/import\s+{\s*ServerContext\s*}\s+from\s+['"][^'"]+['"];?\n?/g, '');

  // 3. 处理方法签名：移除 context: ServerContext 参数
  // 匹配模式：async methodName(..., context: ServerContext): Promise<...>
  content = content.replace(
    /(\basync\s+\w+\([^)]*),\s*context:\s*ServerContext\s*\)/g,
    '$1)'
  );

  // 处理只有 context 参数的情况
  content = content.replace(
    /(\basync\s+\w+\()context:\s*ServerContext\s*\)/g,
    '$1)'
  );

  // 4. 在使用 context 的方法开头添加 const context = getServerContext();
  // 这个比较复杂，需要找到所有使用 context.serverId 或 context.userId 的方法
  // 并在方法体开头添加 const context = getServerContext();

  // 匹配方法体中使用 context.serverId 或 context.userId 的情况
  const methodRegex = /(async\s+\w+\([^)]*\)[^{]*{\s*)/g;
  const matches = [...content.matchAll(methodRegex)];

  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const methodStart = match.index + match[0].length;

    // 检查这个方法体内是否使用了 context
    const methodEnd = findMatchingBrace(content, methodStart - 1);
    const methodBody = content.slice(methodStart, methodEnd);

    if (methodBody.includes('context.serverId') || methodBody.includes('context.userId')) {
      // 检查是否已经有 getServerContext 调用
      if (!methodBody.trim().startsWith('const context = getServerContext()')) {
        const indent = getIndentation(content, methodStart);
        const contextLine = `${indent}const context = getServerContext();\n`;
        content = content.slice(0, methodStart) + contextLine + content.slice(methodStart);
      }
    }
  }

  // 5. 保存文件
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`✓ Completed: ${filePath}`);
}

function findMatchingBrace(content, startPos) {
  let depth = 0;
  for (let i = startPos; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return content.length;
}

function getIndentation(content, pos) {
  // 向前查找到行首
  let lineStart = pos;
  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--;
  }

  // 提取缩进
  let indent = '';
  for (let i = lineStart; i < content.length && (content[i] === ' ' || content[i] === '\t'); i++) {
    indent += content[i];
  }

  return indent;
}

// 执行迁移
console.log('Starting migration to AsyncLocalStorage...\n');

for (const file of files) {
  try {
    migrateFile(file);
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
}

console.log('\n✓ Migration completed!');
