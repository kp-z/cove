#!/bin/bash
CHROME_PORT=9223
CHROME_USER_DATA="/tmp/cove-chrome-debug-profile"

# 清理已有实例
lsof -ti:$CHROME_PORT | xargs kill -9 2>/dev/null || true

# 启动 Chrome 并启用远程调试
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=$CHROME_PORT \
  --user-data-dir="$CHROME_USER_DATA" \
  --no-first-run \
  --no-default-browser-check \
  http://localhost:5175 &

echo "Chrome launched with remote debugging on port $CHROME_PORT"
echo "CDP endpoint: http://localhost:$CHROME_PORT"
