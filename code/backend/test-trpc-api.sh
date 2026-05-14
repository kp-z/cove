#!/bin/bash

# tRPC API 验证脚本
# 测试所有 8 个 Router 的核心 CRUD 功能

BASE_URL="http://localhost:3001/trpc"

echo "=== tRPC API 验证测试 ==="
echo "开始时间: $(date)"
echo ""

# 1. Health Check
echo "1. 测试 Health Check"
curl -s "$BASE_URL/health.check" | jq '.'
echo ""

# 2. User Router
echo "2. 测试 User Router"
echo "  - User List"
curl -s "$BASE_URL/user.list" | jq '.result.data | length'
echo ""

# 3. Project Router
echo "3. 测试 Project Router"
echo "  - Project List"
curl -s "$BASE_URL/project.list" | jq '.result.data | length'
echo ""

# 4. Agent Router
echo "4. 测试 Agent Router"
echo "  - Agent List"
curl -s "$BASE_URL/agent.list" | jq '.result.data | length'
echo ""

# 5. Channel Router
echo "5. 测试 Channel Router"
echo "  - Channel List"
curl -s "$BASE_URL/channel.list" | jq '.result.data | length'
echo ""

# 6. Task Router
echo "6. 测试 Task Router"
echo "  - Task List"
curl -s "$BASE_URL/task.list" | jq '.result.data | length'
echo ""

# 7. Thread Router
echo "7. 测试 Thread Router"
echo "  - Thread List (需要 channelId)"
curl -s "$BASE_URL/thread.listByChannel?input=%7B%22channelId%22%3A%22test%22%7D" | jq '.'
echo ""

# 8. Message Router
echo "8. 测试 Message Router"
echo "  - Message List (需要 channelId)"
curl -s "$BASE_URL/message.list?input=%7B%22channelId%22%3A%22test%22%7D" | jq '.'
echo ""

# 9. Workflow Router
echo "9. 测试 Workflow Router"
echo "  - Workflow List"
curl -s "$BASE_URL/workflow.list" | jq '.result.data | length'
echo ""

echo "=== 测试完成 ==="
echo "结束时间: $(date)"
