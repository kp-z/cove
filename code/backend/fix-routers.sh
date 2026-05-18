#!/bin/bash

# 批量修复 tRPC router 文件

ROUTER_DIR="src/infrastructure/trpc/routers"

# 找到所有 router 文件
ROUTER_FILES=$(find "$ROUTER_DIR" -name "*.router.ts" -type f)

for file in $ROUTER_FILES; do
  echo "Processing $file..."

  # 1. 添加 runWithServerContext 导入（如果还没有）
  if ! grep -q "runWithServerContext" "$file"; then
    # 在 ServerContext 导入后添加
    sed -i '' '/import.*ServerContext.*from/a\
import { runWithServerContext } from '\''../../../application/context/server-context-store'\'';
' "$file"
  fi

  # 2. 移除 Service 方法调用中的 context 参数
  # 匹配模式: methodName(args, context) -> methodName(args)
  sed -i '' 's/\(Service\.[a-zA-Z]*([^)]*\), context)/\1)/g' "$file"

  echo "✓ Fixed $file"
done

echo "All router files processed!"
