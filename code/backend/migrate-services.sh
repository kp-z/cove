#!/bin/bash

# 批量迁移 Service 文件到 AsyncLocalStorage 方案

cd /Users/kp/项目/Proj/cove/code/backend

files=(
  "src/application/services/agent/agent-config.service.ts"
  "src/application/services/agent/agent-response.service.ts"
  "src/application/services/agent/agent-task.service.ts"
  "src/application/services/agent/agent.service.ts"
  "src/application/services/channel/channel-crud.service.ts"
  "src/application/services/channel/channel-lifecycle.service.ts"
  "src/application/services/channel/channel-member.service.ts"
  "src/application/services/channel/channel-messaging.service.ts"
  "src/application/services/channel/channel.service.ts"
  "src/application/services/member/member.service.ts"
  "src/application/services/message/message-crud.service.ts"
  "src/application/services/message/message-reaction.service.ts"
  "src/application/services/message/message.service.ts"
  "src/application/services/project/project-composition.service.ts"
  "src/application/services/task/task-assignment.service.ts"
  "src/application/services/task/task-status.service.ts"
  "src/application/services/task/task.service.ts"
  "src/application/services/thread/thread.service.ts"
  "src/application/services/user/user.service.ts"
  "src/application/services/workflow/workflow-crud.service.ts"
  "src/application/services/workflow/workflow-lifecycle.service.ts"
  "src/application/services/workflow/workflow-trigger.service.ts"
  "src/application/services/workflow/workflow.service.ts"
)

for file in "${files[@]}"; do
  echo "Processing: $file"

  # 1. 替换 ServerContext 导入为 getServerContext 导入
  sed -i '' 's/import { ServerContext } from .*server-context.*/import { getServerContext } from '\''..\/..\/context\/server-context-store'\'';/g' "$file"

  # 2. 移除方法签名中的 context: ServerContext 参数（有其他参数的情况）
  sed -i '' 's/, context: ServerContext)/)/g' "$file"

  # 3. 移除方法签名中的 context: ServerContext 参数（只有 context 参数的情况）
  sed -i '' 's/(context: ServerContext)/()/g' "$file"

  echo "✓ Completed: $file"
done

echo ""
echo "✓ All files processed!"
echo ""
echo "Next steps:"
echo "1. Manually add 'const context = getServerContext();' to methods that use context"
echo "2. Run 'npm run build' to verify"
