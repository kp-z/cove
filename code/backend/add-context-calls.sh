#!/bin/bash

# 为所有使用 context.serverId 或 context.userId 的方法添加 const context = getServerContext();

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

  # 使用 perl 进行复杂的多行替换
  # 在方法体开头添加 const context = getServerContext(); 如果方法中使用了 context.serverId 或 context.userId
  perl -i -pe '
    # 匹配方法开始：async methodName(...) {
    if (/^(\s+)async\s+\w+\([^)]*\)\s*:\s*[^{]+\{\s*$/) {
      $indent = $1;
      $method_start = 1;
      $line_after_brace = $_;
    }
    # 如果是方法开始后的第一行，检查是否需要添加 context
    elsif ($method_start && /^\s*\S/) {
      $method_start = 0;
      # 如果这一行不是 const context = getServerContext()，且文件中有 context.serverId 或 context.userId
      if (!/const context = getServerContext\(\)/) {
        # 读取接下来的几行来检查是否使用了 context
        $_ = $line_after_brace . $indent . "    const context = getServerContext();\n" . $_;
      } else {
        $_ = $line_after_brace . $_;
      }
      $line_after_brace = "";
    }
  ' "$file"

  echo "✓ Completed: $file"
done

echo ""
echo "✓ All files processed!"
