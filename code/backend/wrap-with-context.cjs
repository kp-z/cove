const fs = require('fs');
const path = require('path');

function processRouterFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 1. 确保导入了 runWithServerContext
  if (!content.includes('runWithServerContext')) {
    const serverContextImport = content.match(/import\s*{[^}]*ServerContext[^}]*}\s*from\s*['"][^'"]+['"]/);
    if (serverContextImport) {
      content = content.replace(
        serverContextImport[0],
        serverContextImport[0] + '\nimport { runWithServerContext } from \'../../../application/context/server-context-store\';'
      );
      modified = true;
    }
  }

  // 2. 包装 Service 调用
  // 匹配模式: const context = ServerContext.create(...); ... await service.method(...)
  const procedurePattern = /\.(?:query|mutation)\(async\s*\(\s*{\s*input,\s*ctx\s*}\s*\)\s*=>\s*{[\s\S]*?}\s*\)/g;

  content = content.replace(procedurePattern, (match) => {
    // 检查是否已经有 runWithServerContext
    if (match.includes('runWithServerContext')) {
      return match;
    }

    // 检查是否创建了 ServerContext
    const hasContextCreation = match.includes('ServerContext.create');
    if (!hasContextCreation) {
      return match;
    }

    // 提取 context 创建语句
    const contextMatch = match.match(/const\s+context\s*=\s*ServerContext\.create\([^)]+\);/);
    if (!contextMatch) {
      return match;
    }

    const contextStatement = contextMatch[0];

    // 找到 try 块的内容
    const tryMatch = match.match(/try\s*{([\s\S]*?)}\s*catch/);
    if (!tryMatch) {
      return match;
    }

    let tryContent = tryMatch[1];

    // 移除 context 创建语句
    tryContent = tryContent.replace(contextStatement, '').trim();

    // 移除所有 Service 调用中的 context 参数
    // 处理单行调用: service.method(arg1, arg2, context)
    tryContent = tryContent.replace(/(\w+Service\.\w+\([^)]*),\s*context\)/g, '$1)');

    // 处理多行调用
    tryContent = tryContent.replace(/(\w+Service\.\w+\([^)]*),\s*context\s*\)/gs, '$1)');

    // 用 runWithServerContext 包装
    const newTryContent = `try {
          const context = ServerContext.create(ctx.serverId || 'default-server', ctx.userId || 'system');
          return runWithServerContext(context, async () => {
            ${tryContent}
          });
        } catch`;

    modified = true;
    return match.replace(/try\s*{[\s\S]*?}\s*catch/, newTryContent);
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Wrapped ${filePath}`);
    return true;
  }

  return false;
}

// 处理所有 router 文件
const routerDir = path.join(__dirname, 'src/infrastructure/trpc/routers');
const files = fs.readdirSync(routerDir).filter(f => f.endsWith('.router.ts'));

let count = 0;
files.forEach(file => {
  const filePath = path.join(routerDir, file);
  if (processRouterFile(filePath)) {
    count++;
  }
});

console.log(`\nProcessed ${count} router files.`);
