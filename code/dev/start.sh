#!/usr/bin/env bash
# Cove 一键开发栈：Backend + Frontend + 单 Local（Nexus）
#
# 用法：
#   ./code/dev/start.sh              # 默认：全栈 + 1 个 Local（Nexus）
#   ./code/dev/start.sh --no-local   # 只要前后端（纯 UI）
#   ./code/dev/start.sh --dual       # 额外再起自定义 Realm 的第二个 Local
#
# 退出（Ctrl+C / 脚本结束）时会杀掉本脚本拉起的全部进程，包括 backend/frontend。
# 设备凭证固定复用，保存在 ~/.cove/dev-stack/（不进 git）。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CODE_DIR="$ROOT/code"
DEV_DIR="$CODE_DIR/dev"
BACKEND_DIR="$CODE_DIR/cloud/backend"
FRONTEND_DIR="$CODE_DIR/cloud/frontend"
LOCAL_DIR="$CODE_DIR/local"

export COVE_DEV_HOME="${COVE_DEV_HOME:-$HOME/.cove/dev-stack}"
export COVE_BACKEND_URL="${COVE_BACKEND_URL:-http://localhost:3002}"
PID_DIR="$COVE_DEV_HOME/pids"
LOG_DIR="$COVE_DEV_HOME/logs"

WITH_LOCAL=1
DUAL_LOCAL=0

for arg in "$@"; do
  case "$arg" in
    --no-local) WITH_LOCAL=0 ;;
    --dual) DUAL_LOCAL=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数: $arg（支持 --no-local / --dual）" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$PID_DIR" "$LOG_DIR"

# 记录本脚本拉起的 PID，cleanup 只杀这些
PIDS=()

log() { printf '[dev] %s\n' "$*"; }

kill_tree() {
  local pid="$1"
  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  # 先杀子进程再杀自己（覆盖 tsx watch / npm 包装进程）
  local children
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  for c in $children; do
    kill_tree "$c"
  done
  kill "$pid" 2>/dev/null || true
  sleep 0.2
  kill -9 "$pid" 2>/dev/null || true
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  log "正在回收进程…"
  # 倒序杀掉，先 local/frontend，再 backend
  local i
  for ((i=${#PIDS[@]}-1; i>=0; i--)); do
    kill_tree "${PIDS[$i]}"
  done
  # 兜底：若 PID 文件里还有残留
  if [[ -d "$PID_DIR" ]]; then
    for f in "$PID_DIR"/*.pid; do
      [[ -f "$f" ]] || continue
      kill_tree "$(cat "$f" 2>/dev/null || true)"
      rm -f "$f"
    done
  fi
  log "已回收。凭证仍保留在 $COVE_DEV_HOME （固定复用）"
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

track_pid() {
  local name="$1"
  local pid="$2"
  PIDS+=("$pid")
  echo "$pid" > "$PID_DIR/$name.pid"
  log "已启动 $name (pid=$pid)"
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

wait_http() {
  local url="$1"
  local timeout_s="${2:-60}"
  local label="${3:-service}"
  local log_file="${4:-}"
  local i
  local elapsed=0
  for ((i=0; i<timeout_s*2; i++)); do
    if curl -sf --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    # 每 10 秒打一次进度，避免误以为卡死
    if (( i > 0 && i % 20 == 0 )); then
      elapsed=$((i / 2))
      log "等待 $label 就绪… ${elapsed}s/${timeout_s}s"
      if [[ -n "$log_file" && -f "$log_file" ]]; then
        # tsx watch 卡在 Restarting 时给提示
        if tail -n 5 "$log_file" 2>/dev/null | grep -q 'Restarting'; then
          log "检测到 $label 日志停在 Restarting，可能被本机高负载拖死"
        fi
        tail -n 2 "$log_file" 2>/dev/null | sed 's/^/[dev:log] /' || true
      fi
    fi
    sleep 0.5
  done
  return 1
}

start_backend() {
  if port_in_use 3002; then
    log "3002 已被占用，先停掉旧进程再以开发栈配置重启…"
    local existing
    existing="$(lsof -tiTCP:3002 -sTCP:LISTEN 2>/dev/null || true)"
    for p in $existing; do
      kill_tree "$p"
    done
    sleep 0.5
  fi

  # 步骤1：启动 backend（不用 tsx watch，避免改文件后 Restarting 卡死）
  log "启动 backend…"
  : >"$LOG_DIR/backend.log"
  (
    cd "$BACKEND_DIR"
    # 开发栈需要放宽 generateDeviceStartCommand 权限（见 realm.router.ts）
    export NODE_ENV="${NODE_ENV:-development}"
    export COVE_DEV_STACK=1
    # 开发栈用无 watch 启动更稳；需要热重载可另开 npm run dev
    npx tsx src/main.ts
  ) >>"$LOG_DIR/backend.log" 2>&1 &
  track_pid backend $!

  # 步骤2：等待 health（高负载下冷启动可能 >90s）
  if ! wait_http "$COVE_BACKEND_URL/health" 180 "backend" "$LOG_DIR/backend.log"; then
    log "backend 未就绪，最近日志："
    tail -n 60 "$LOG_DIR/backend.log" || true
    exit 1
  fi
  log "backend 就绪: $COVE_BACKEND_URL"
}

start_frontend() {
  if port_in_use 5174; then
    log "5174 已被占用 —— 纳入管理，退出时杀掉"
    local existing
    existing="$(lsof -tiTCP:5174 -sTCP:LISTEN 2>/dev/null | head -1 || true)"
    if [[ -n "$existing" ]]; then
      track_pid frontend "$existing"
    fi
    return 0
  fi

  log "启动 frontend…"
  : >"$LOG_DIR/frontend.log"
  (
    cd "$FRONTEND_DIR"
    npm run dev
  ) >>"$LOG_DIR/frontend.log" 2>&1 &
  track_pid frontend $!

  if ! wait_http "http://localhost:5174" 180 "frontend" "$LOG_DIR/frontend.log"; then
    log "frontend 未就绪，最近日志："
    tail -n 60 "$LOG_DIR/frontend.log" || true
    exit 1
  fi
  log "frontend 就绪: http://localhost:5174"
}

provision_devices() {
  log "准备 Local 设备凭证（固定复用，默认仅 Nexus）…"
  if [[ "$DUAL_LOCAL" -eq 1 ]]; then
    COVE_DUAL=1 node "$DEV_DIR/provision.mjs"
  else
    node "$DEV_DIR/provision.mjs"
  fi
}

start_local() {
  local name="$1"
  local config="$2"
  if [[ ! -f "$config" ]]; then
    log "缺少配置: $config"
    exit 1
  fi
  log "启动 local:$name …"
  : >"$LOG_DIR/local-$name.log"
  (
    cd "$LOCAL_DIR"
    # 开发栈用无 watch 启动，避免热重载卡死；--config 读固定凭证
    npx tsx src/main.ts --config "$config"
  ) >>"$LOG_DIR/local-$name.log" 2>&1 &
  track_pid "local-$name" $!
}

# ---- main ----
log "ROOT=$ROOT"
log "DEV_HOME=$COVE_DEV_HOME"

start_backend

if [[ "$WITH_LOCAL" -eq 1 ]]; then
  provision_devices
fi

start_frontend

if [[ "$WITH_LOCAL" -eq 1 ]]; then
  start_local nexus "$COVE_DEV_HOME/nexus.config.json"
  if [[ "$DUAL_LOCAL" -eq 1 ]]; then
    start_local custom "$COVE_DEV_HOME/custom.config.json"
  fi
fi

log "=========================================="
log "开发栈已就绪"
log "  Frontend : http://localhost:5174"
log "  Backend  : $COVE_BACKEND_URL"
log "  Health   : $COVE_BACKEND_URL/health"
if [[ "$WITH_LOCAL" -eq 1 ]]; then
  log "  Local    : nexus$([ "$DUAL_LOCAL" -eq 1 ] && echo ' + custom')"
  log "  凭证目录 : $COVE_DEV_HOME"
fi
log "  日志目录 : $LOG_DIR"
log "Ctrl+C 退出并回收全部进程"
log "=========================================="

# 前台等待任一子进程退出；cleanup trap 会收尾
wait
