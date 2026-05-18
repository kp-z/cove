#!/bin/bash

# 修复 Facade Service 文件中的 context 参数传递

files=(
  "src/application/services/channel/channel.service.ts"
  "src/application/services/message/message.service.ts"
  "src/application/services/workflow/workflow.service.ts"
  "src/application/services/task/task.service.ts"
)

for file in "${files[@]}"; do
  echo "Processing: $file"
  
  # 移除 getServerContext 导入
  sed -i '' '/import.*getServerContext.*from/d' "$file"
  
  # 移除所有 , context 参数传递
  sed -i '' 's/, context)/)/' "$file"
  
  echo "✓ Completed: $file"
done

echo ""
echo "✓ All facade services fixed!"
