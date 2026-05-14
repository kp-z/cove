#!/bin/bash

BASE_URL="http://localhost:3001/trpc"

echo "=== tRPC CRUD 完整测试 ==="
echo ""

# 1. 先创建一个 User 作为 owner 和 creator
echo "0. 准备测试数据 - 创建测试用户"
echo "---"
CREATE_OWNER=$(curl -s -X POST "$BASE_URL/user.create" \
  -H "Content-Type: application/json" \
  -d '{"username":"test_owner","email":"owner@test.com","displayName":"Test Owner"}')
OWNER_ID=$(echo $CREATE_OWNER | jq -r '.result.data.user_id')
echo "✅ 创建 Owner 用户，ID: $OWNER_ID"
echo ""

# 2. 测试 User CRUD
echo "1. 测试 User CRUD"
echo "---"

echo "创建用户..."
CREATE_USER=$(curl -s -X POST "$BASE_URL/user.create" \
  -H "Content-Type: application/json" \
  -d '{"username":"crud_test_user","email":"crud@test.com","displayName":"CRUD Test User"}')
USER_ID=$(echo $CREATE_USER | jq -r '.result.data.user_id')
echo "✅ 创建成功，用户ID: $USER_ID"

echo "获取用户详情..."
GET_USER=$(curl -s "$BASE_URL/user.getById?input=%7B%22userId%22%3A%22$USER_ID%22%7D")
USERNAME=$(echo $GET_USER | jq -r '.result.data.username')
echo "  用户名: $USERNAME"

echo "更新用户..."
UPDATE_USER=$(curl -s -X POST "$BASE_URL/user.update" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"displayName\":\"Updated User\"}")
UPDATED_NAME=$(echo $UPDATE_USER | jq -r '.result.data.display_name')
echo "  更新后名称: $UPDATED_NAME"

echo "删除用户..."
DELETE_USER=$(curl -s -X POST "$BASE_URL/user.delete" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\"}")
if echo $DELETE_USER | jq -e '.result.data' > /dev/null 2>&1; then
  echo "✅ 删除成功"
else
  echo "❌ 删除失败"
fi
echo ""

# 3. 测试 Project CRUD
echo "2. 测试 Project CRUD"
echo "---"

echo "创建项目..."
CREATE_PROJECT=$(curl -s -X POST "$BASE_URL/project.create" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"CRUD Test Project\",\"ownerId\":\"$OWNER_ID\",\"description\":\"Test project\"}")

if echo $CREATE_PROJECT | jq -e '.error' > /dev/null 2>&1; then
  echo "❌ 创建失败:"
  echo $CREATE_PROJECT | jq '.error.message'
else
  PROJECT_ID=$(echo $CREATE_PROJECT | jq -r '.result.data.project_id')
  echo "✅ 创建成功，项目ID: $PROJECT_ID"
  
  echo "获取项目详情..."
  GET_PROJECT=$(curl -s "$BASE_URL/project.getById?input=%7B%22projectId%22%3A%22$PROJECT_ID%22%7D")
  PROJECT_NAME=$(echo $GET_PROJECT | jq -r '.result.data.name')
  echo "  项目名: $PROJECT_NAME"
  
  echo "更新项目..."
  UPDATE_PROJECT=$(curl -s -X POST "$BASE_URL/project.update" \
    -H "Content-Type: application/json" \
    -d "{\"projectId\":\"$PROJECT_ID\",\"name\":\"Updated Project\"}")
  UPDATED_PROJECT_NAME=$(echo $UPDATE_PROJECT | jq -r '.result.data.name')
  echo "  更新后名称: $UPDATED_PROJECT_NAME"
  
  echo "删除项目..."
  DELETE_PROJECT=$(curl -s -X POST "$BASE_URL/project.delete" \
    -H "Content-Type: application/json" \
    -d "{\"projectId\":\"$PROJECT_ID\"}")
  if echo $DELETE_PROJECT | jq -e '.result.data' > /dev/null 2>&1; then
    echo "✅ 删除成功"
  else
    echo "❌ 删除失败"
  fi
fi
echo ""

# 4. 测试 Channel CRUD
echo "3. 测试 Channel CRUD"
echo "---"

echo "创建频道..."
CREATE_CHANNEL=$(curl -s -X POST "$BASE_URL/channel.create" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"test-project\",\"name\":\"CRUD Test Channel\",\"type\":\"public\",\"createdBy\":\"$OWNER_ID\"}")

if echo $CREATE_CHANNEL | jq -e '.error' > /dev/null 2>&1; then
  echo "❌ 创建失败:"
  echo $CREATE_CHANNEL | jq '.error.message'
else
  CHANNEL_ID=$(echo $CREATE_CHANNEL | jq -r '.result.data.channel_id')
  echo "✅ 创建成功，频道ID: $CHANNEL_ID"
  
  echo "获取频道详情..."
  GET_CHANNEL=$(curl -s "$BASE_URL/channel.getById?input=%7B%22channelId%22%3A%22$CHANNEL_ID%22%7D")
  CHANNEL_NAME=$(echo $GET_CHANNEL | jq -r '.result.data.name')
  echo "  频道名: $CHANNEL_NAME"
  
  echo "更新频道..."
  UPDATE_CHANNEL=$(curl -s -X POST "$BASE_URL/channel.update" \
    -H "Content-Type: application/json" \
    -d "{\"channelId\":\"$CHANNEL_ID\",\"name\":\"Updated Channel\"}")
  UPDATED_CHANNEL_NAME=$(echo $UPDATE_CHANNEL | jq -r '.result.data.name')
  echo "  更新后名称: $UPDATED_CHANNEL_NAME"
  
  echo "删除频道..."
  DELETE_CHANNEL=$(curl -s -X POST "$BASE_URL/channel.delete" \
    -H "Content-Type: application/json" \
    -d "{\"channelId\":\"$CHANNEL_ID\"}")
  if echo $DELETE_CHANNEL | jq -e '.result.data' > /dev/null 2>&1; then
    echo "✅ 删除成功"
  else
    echo "❌ 删除失败"
  fi
fi
echo ""

# 5. 测试 Task CRUD（需要先创建 Channel）
echo "4. 测试 Task CRUD"
echo "---"

# 先创建一个 Channel 用于 Task
CREATE_TASK_CHANNEL=$(curl -s -X POST "$BASE_URL/channel.create" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"test-project\",\"name\":\"Task Test Channel\",\"type\":\"public\",\"createdBy\":\"$OWNER_ID\"}")
TASK_CHANNEL_ID=$(echo $CREATE_TASK_CHANNEL | jq -r '.result.data.channel_id')

if [ "$TASK_CHANNEL_ID" != "null" ]; then
  echo "创建任务..."
  CREATE_TASK=$(curl -s -X POST "$BASE_URL/task.create" \
    -H "Content-Type: application/json" \
    -d "{\"projectId\":\"test-project\",\"title\":\"CRUD Test Task\",\"taskType\":\"single_agent\",\"priority\":\"P2\",\"channelId\":\"$TASK_CHANNEL_ID\",\"createdBy\":\"$OWNER_ID\"}")
  
  if echo $CREATE_TASK | jq -e '.error' > /dev/null 2>&1; then
    echo "❌ 创建失败:"
    echo $CREATE_TASK | jq '.error.message'
  else
    TASK_ID=$(echo $CREATE_TASK | jq -r '.result.data.task_id')
    echo "✅ 创建成功，任务ID: $TASK_ID"
    
    echo "获取任务详情..."
    GET_TASK=$(curl -s "$BASE_URL/task.getById?input=%7B%22taskId%22%3A%22$TASK_ID%22%7D")
    TASK_TITLE=$(echo $GET_TASK | jq -r '.result.data.title')
    echo "  任务标题: $TASK_TITLE"
    
    echo "更新任务状态..."
    UPDATE_TASK=$(curl -s -X POST "$BASE_URL/task.updateStatus" \
      -H "Content-Type: application/json" \
      -d "{\"taskId\":\"$TASK_ID\",\"status\":\"in_progress\"}")
    TASK_STATUS=$(echo $UPDATE_TASK | jq -r '.result.data.status')
    echo "  更新后状态: $TASK_STATUS"
    
    echo "删除任务..."
    DELETE_TASK=$(curl -s -X POST "$BASE_URL/task.delete" \
      -H "Content-Type: application/json" \
      -d "{\"taskId\":\"$TASK_ID\"}")
    if echo $DELETE_TASK | jq -e '.result.data' > /dev/null 2>&1; then
      echo "✅ 删除成功"
    else
      echo "❌ 删除失败"
    fi
  fi
  
  # 清理测试 Channel
  curl -s -X POST "$BASE_URL/channel.delete" \
    -H "Content-Type: application/json" \
    -d "{\"channelId\":\"$TASK_CHANNEL_ID\"}" > /dev/null
else
  echo "❌ 无法创建测试 Channel，跳过 Task 测试"
fi
echo ""

# 清理测试 Owner
curl -s -X POST "$BASE_URL/user.delete" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$OWNER_ID\"}" > /dev/null

echo "=== CRUD 测试完成 ==="
