#!/bin/bash
set -e

PROJECT_ROOT="/Users/kp/项目/Proj/cove/code"

echo "🚀 Starting Cove with debugging enabled..."

# 启动后端
cd "$PROJECT_ROOT/backend"
npm run dev &
BACKEND_PID=$!

# 启动前端
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

# 等待服务启动
sleep 5

# 启动 Chrome 调试
bash "$PROJECT_ROOT/frontend/scripts/dev-debug.sh"

echo "✅ Cove development environment ready!"
echo "  Frontend:  http://localhost:5175"
echo "  Backend:   http://localhost:3001"
echo "  Chrome CDP: http://localhost:9223"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
