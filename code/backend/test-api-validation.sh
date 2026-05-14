#!/bin/bash

BASE_URL="http://localhost:3001/trpc"
PASS=0
FAIL=0

test_endpoint() {
  local name=$1
  local result=$2
  
  if echo "$result" | jq -e '.result.data' > /dev/null 2>&1; then
    echo "✅ $name"
    ((PASS++))
  else
    echo "❌ $name"
    echo "$result" | jq '.error.message' 2>/dev/null || echo "Unknown error"
    ((FAIL++))
  fi
}

echo "=== tRPC API 后端验证测试 ==="
echo ""

# 1. User Router 测试
echo "【1. User Router】"
USER_CREATE=$(curl -s -X POST "$BASE_URL/user.create" -H "Content-Type: application/json" -d '{"username":"api_test_user","email":"api@test.com","displayName":"API Test"}')
USER_ID=$(echo $USER_CREATE | jq -r '.result.data.user_id')
test_endpoint "User.create" "$USER_CREATE"

USER_GET=$(curl -s "$BASE_URL/user.getById?input=%7B%22userId%22%3A%22$USER_ID%22%7D")
test_endpoint "User.getById" "$USER_GET"

USER_LIST=$(curl -s "$BASE_URL/user.list")
test_endpoint "User.list" "$USER_LIST"

USER_UPDATE=$(curl -s -X POST "$BASE_URL/user.update" -H "Content-Type: application/json" -d "{\"userId\":\"$USER_ID\",\"displayName\":\"Updated Name\"}")
test_endpoint "User.update" "$USER_UPDATE"

USER_DELETE=$(curl -s -X POST "$BASE_URL/user.delete" -H "Content-Type: application/json" -d "{\"userId\":\"$USER_ID\"}")
test_endpoint "User.delete" "$USER_DELETE"
echo ""

# 2. Project Router 测试
echo "【2. Project Router】"
# 先创建一个 owner
OWNER_CREATE=$(curl -s -X POST "$BASE_URL/user.create" -H "Content-Type: application/json" -d '{"username":"project_owner","email":"owner@test.com","displayName":"Owner"}')
OWNER_ID=$(echo $OWNER_CREATE | jq -r '.result.data.user_id')

PROJECT_CREATE=$(curl -s -X POST "$BASE_URL/project.create" -H "Content-Type: application/json" -d "{\"name\":\"API Test Project\",\"ownerId\":\"$OWNER_ID\"}")
PROJECT_ID=$(echo $PROJECT_CREATE | jq -r '.result.data.project_id')
test_endpoint "Project.create" "$PROJECT_CREATE"

PROJECT_GET=$(curl -s "$BASE_URL/project.getById?input=%7B%22projectId%22%3A%22$PROJECT_ID%22%7D")
test_endpoint "Project.getById" "$PROJECT_GET"

PROJECT_LIST=$(curl -s "$BASE_URL/project.list")
test_endpoint "Project.list" "$PROJECT_LIST"

PROJECT_UPDATE=$(curl -s -X POST "$BASE_URL/project.update" -H "Content-Type: application/json" -d "{\"projectId\":\"$PROJECT_ID\",\"name\":\"Updated Project\"}")
test_endpoint "Project.update" "$PROJECT_UPDATE"

PROJECT_DELETE=$(curl -s -X POST "$BASE_URL/project.delete" -H "Content-Type: application/json" -d "{\"projectId\":\"$PROJECT_ID\"}")
test_endpoint "Project.delete" "$PROJECT_DELETE"

# 清理 owner
curl -s -X POST "$BASE_URL/user.delete" -H "Content-Type: application/json" -d "{\"userId\":\"$OWNER_ID\"}" > /dev/null
echo ""

# 3. Channel Router 测试
echo "【3. Channel Router】"
# 创建测试用户和项目
CH_USER=$(curl -s -X POST "$BASE_URL/user.create" -H "Content-Type: application/json" -d '{"username":"ch_user","email":"ch@test.com","displayName":"CH User"}')
CH_USER_ID=$(echo $CH_USER | jq -r '.result.data.user_id')

CH_PROJECT=$(curl -s -X POST "$BASE_URL/project.create" -H "Content-Type: application/json" -d "{\"name\":\"CH Project\",\"ownerId\":\"$CH_USER_ID\"}")
CH_PROJECT_ID=$(echo $CH_PROJECT | jq -r '.result.data.project_id')

CHANNEL_CREATE=$(curl -s -X POST "$BASE_URL/channel.create" -H "Content-Type: application/json" -d "{\"name\":\"API Test Channel\",\"type\":\"public\",\"projectId\":\"$CH_PROJECT_ID\",\"createdBy\":\"$CH_USER_ID\"}")
CHANNEL_ID=$(echo $CHANNEL_CREATE | jq -r '.result.data.channel_id')
test_endpoint "Channel.create" "$CHANNEL_CREATE"

CHANNEL_GET=$(curl -s "$BASE_URL/channel.getById?input=%7B%22channelId%22%3A%22$CHANNEL_ID%22%7D")
test_endpoint "Channel.getById" "$CHANNEL_GET"

CHANNEL_LIST=$(curl -s "$BASE_URL/channel.list")
test_endpoint "Channel.list" "$CHANNEL_LIST"

CHANNEL_UPDATE=$(curl -s -X POST "$BASE_URL/channel.update" -H "Content-Type: application/json" -d "{\"channelId\":\"$CHANNEL_ID\",\"name\":\"Updated Channel\"}")
test_endpoint "Channel.update" "$CHANNEL_UPDATE"

CHANNEL_DELETE=$(curl -s -X POST "$BASE_URL/channel.delete" -H "Content-Type: application/json" -d "{\"channelId\":\"$CHANNEL_ID\"}")
test_endpoint "Channel.delete" "$CHANNEL_DELETE"

# 清理
curl -s -X POST "$BASE_URL/project.delete" -H "Content-Type: application/json" -d "{\"projectId\":\"$CH_PROJECT_ID\"}" > /dev/null
curl -s -X POST "$BASE_URL/user.delete" -H "Content-Type: application/json" -d "{\"userId\":\"$CH_USER_ID\"}" > /dev/null
echo ""

# 4. Task Router 测试
echo "【4. Task Router】"
# 创建测试数据
TASK_USER=$(curl -s -X POST "$BASE_URL/user.create" -H "Content-Type: application/json" -d '{"username":"task_user","email":"task@test.com","displayName":"Task User"}')
TASK_USER_ID=$(echo $TASK_USER | jq -r '.result.data.user_id')

TASK_PROJECT=$(curl -s -X POST "$BASE_URL/project.create" -H "Content-Type: application/json" -d "{\"name\":\"Task Project\",\"ownerId\":\"$TASK_USER_ID\"}")
TASK_PROJECT_ID=$(echo $TASK_PROJECT | jq -r '.result.data.project_id')

TASK_CHANNEL=$(curl -s -X POST "$BASE_URL/channel.create" -H "Content-Type: application/json" -d "{\"name\":\"Task Channel\",\"type\":\"public\",\"projectId\":\"$TASK_PROJECT_ID\",\"createdBy\":\"$TASK_USER_ID\"}")
TASK_CHANNEL_ID=$(echo $TASK_CHANNEL | jq -r '.result.data.channel_id')

TASK_CREATE=$(curl -s -X POST "$BASE_URL/task.create" -H "Content-Type: application/json" -d "{\"projectId\":\"$TASK_PROJECT_ID\",\"channelId\":\"$TASK_CHANNEL_ID\",\"title\":\"API Test Task\",\"taskType\":\"single_agent\",\"priority\":\"P2\",\"createdBy\":\"$TASK_USER_ID\"}")
TASK_ID=$(echo $TASK_CREATE | jq -r '.result.data.task_id')
test_endpoint "Task.create" "$TASK_CREATE"

TASK_GET=$(curl -s "$BASE_URL/task.getById?input=%7B%22taskId%22%3A%22$TASK_ID%22%7D")
test_endpoint "Task.getById" "$TASK_GET"

TASK_LIST=$(curl -s "$BASE_URL/task.list")
test_endpoint "Task.list" "$TASK_LIST"

TASK_STATUS=$(curl -s -X POST "$BASE_URL/task.updateStatus" -H "Content-Type: application/json" -d "{\"taskId\":\"$TASK_ID\",\"status\":\"in_progress\"}")
test_endpoint "Task.updateStatus" "$TASK_STATUS"

TASK_DELETE=$(curl -s -X POST "$BASE_URL/task.delete" -H "Content-Type: application/json" -d "{\"taskId\":\"$TASK_ID\"}")
test_endpoint "Task.delete" "$TASK_DELETE"

# 清理
curl -s -X POST "$BASE_URL/channel.delete" -H "Content-Type: application/json" -d "{\"channelId\":\"$TASK_CHANNEL_ID\"}" > /dev/null
curl -s -X POST "$BASE_URL/project.delete" -H "Content-Type: application/json" -d "{\"projectId\":\"$TASK_PROJECT_ID\"}" > /dev/null
curl -s -X POST "$BASE_URL/user.delete" -H "Content-Type: application/json" -d "{\"userId\":\"$TASK_USER_ID\"}" > /dev/null
echo ""

# 5. Agent Router 测试
echo "【5. Agent Router】"
AGENT_LIST=$(curl -s "$BASE_URL/agent.list")
test_endpoint "Agent.list" "$AGENT_LIST"
echo ""

# 6. Workflow Router 测试
echo "【6. Workflow Router】"
WORKFLOW_LIST=$(curl -s "$BASE_URL/workflow.list")
test_endpoint "Workflow.list" "$WORKFLOW_LIST"
echo ""

# 7. Thread Router 测试
echo "【7. Thread Router】"
echo "  (需要实际的 channelId，跳过详细测试)"
echo ""

# 8. Message Router 测试
echo "【8. Message Router】"
echo "  (需要实际的 channelId，跳过详细测试)"
echo ""

echo "==================================="
echo "测试结果: ✅ $PASS 通过, ❌ $FAIL 失败"
echo "==================================="
