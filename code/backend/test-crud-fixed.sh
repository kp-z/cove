#!/bin/bash

BASE_URL="http://localhost:3001/trpc"

echo "=== tRPC CRUD 完整测试 ==="
echo ""

# 测试 User CRUD
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
echo $GET_USER | jq '.result.data.username'

echo "更新用户..."
UPDATE_USER=$(curl -s -X POST "$BASE_URL/user.update" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"displayName\":\"Updated User\"}")
echo $UPDATE_USER | jq '.result.data.display_name'

echo "删除用户..."
DELETE_USER=$(curl -s -X POST "$BASE_URL/user.delete" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\"}")
echo $DELETE_USER | jq '.'

echo ""

# 测试 Project CRUD
echo "2. 测试 Project CRUD"
echo "---"

echo "创建项目..."
CREATE_PROJECT=$(curl -s -X POST "$BASE_URL/project.create" \
  -H "Content-Type: application/json" \
  -d '{"name":"CRUD Test Project","ownerId":"test-owner","description":"Test project"}')

PROJECT_ID=$(echo $CREATE_PROJECT | jq -r '.result.data.project_id')
echo "✅ 创建成功，项目ID: $PROJECT_ID"

echo "获取项目详情..."
GET_PROJECT=$(curl -s "$BASE_URL/project.getById?input=%7B%22projectId%22%3A%22$PROJECT_ID%22%7D")
echo $GET_PROJECT | jq '.result.data.name'

echo "更新项目..."
UPDATE_PROJECT=$(curl -s -X POST "$BASE_URL/project.update" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT_ID\",\"name\":\"Updated Project\"}")
echo $UPDATE_PROJECT | jq '.result.data.name'

echo "删除项目..."
DELETE_PROJECT=$(curl -s -X POST "$BASE_URL/project.delete" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT_ID\"}")
echo $DELETE_PROJECT | jq '.'

echo ""

# 测试 Channel CRUD
echo "3. 测试 Channel CRUD"
echo "---"

echo "创建频道..."
CREATE_CHANNEL=$(curl -s -X POST "$BASE_URL/channel.create" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test-project","name":"CRUD Test Channel","channelType":"public"}')

CHANNEL_ID=$(echo $CREATE_CHANNEL | jq -r '.result.data.channel_id')
echo "✅ 创建成功，频道ID: $CHANNEL_ID"

echo "获取频道详情..."
GET_CHANNEL=$(curl -s "$BASE_URL/channel.getById?input=%7B%22channelId%22%3A%22$CHANNEL_ID%22%7D")
echo $GET_CHANNEL | jq '.result.data.name'

echo "更新频道..."
UPDATE_CHANNEL=$(curl -s -X POST "$BASE_URL/channel.update" \
  -H "Content-Type: application/json" \
  -d "{\"channelId\":\"$CHANNEL_ID\",\"name\":\"Updated Channel\"}")
echo $UPDATE_CHANNEL | jq '.result.data.name'

echo "删除频道..."
DELETE_CHANNEL=$(curl -s -X POST "$BASE_URL/channel.delete" \
  -H "Content-Type: application/json" \
  -d "{\"channelId\":\"$CHANNEL_ID\"}")
echo $DELETE_CHANNEL | jq '.'

echo ""

# 测试 Task CRUD
echo "4. 测试 Task CRUD"
echo "---"

echo "创建任务..."
CREATE_TASK=$(curl -s -X POST "$BASE_URL/task.create" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test-project","title":"CRUD Test Task","taskType":"single_agent","priority":"P2","createdBy":"test-user"}')

TASK_ID=$(echo $CREATE_TASK | jq -r '.result.data.task_id')
echo "✅ 创建成功，任务ID: $TASK_ID"

echo "获取任务详情..."
GET_TASK=$(curl -s "$BASE_URL/task.getById?input=%7B%22taskId%22%3A%22$TASK_ID%22%7D")
echo $GET_TASK | jq '.result.data.title'

echo "更新任务状态..."
UPDATE_TASK=$(curl -s -X POST "$BASE_URL/task.updateStatus" \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"$TASK_ID\",\"status\":\"in_progress\"}")
echo $UPDATE_TASK | jq '.result.data.status'

echo "删除任务..."
DELETE_TASK=$(curl -s -X POST "$BASE_URL/task.delete" \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"$TASK_ID\"}")
echo $DELETE_TASK | jq '.'

echo ""

echo "=== CRUD 测试完成 ==="
