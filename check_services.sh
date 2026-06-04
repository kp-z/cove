#!/bin/bash

echo "=== 🔍 检查服务状态 ==="
echo ""

# 检查 Backend
echo "1. Backend (port 3002):"
if lsof -i :3002 > /dev/null 2>&1; then
  echo "   ✅ 正在运行"
  backend_running=true
else
  echo "   ❌ 未运行"
  backend_running=false
fi

# 检查 Local Device
echo ""
echo "2. Local Device:"
if ps aux | grep -E "npm.*dev.*local|tsx.*local" | grep -v grep > /dev/null; then
  echo "   ✅ 正在运行"
  local_running=true
else
  echo "   ❌ 未运行"
  local_running=false
fi

echo ""
if [ "$backend_running" = true ] && [ "$local_running" = true ]; then
  echo "✅ 所有服务就绪，可以开始测试"
  exit 0
else
  echo "❌ 请先启动所有服务"
  exit 1
fi
