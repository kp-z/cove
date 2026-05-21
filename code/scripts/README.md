# Cove Development Scripts

## dev-start.sh

一键启动和管理 Cove 开发环境的脚本。

### 功能

- 启动 Cloud Backend、Cloud Frontend 和 Local Agent
- 停止所有服务
- 重启所有服务
- 查看服务状态
- 查看实时日志

### 使用方法

```bash
# 启动所有服务
./scripts/dev-start.sh start

# 停止所有服务
./scripts/dev-start.sh stop

# 重启所有服务
./scripts/dev-start.sh restart

# 查看服务状态
./scripts/dev-start.sh status

# 查看实时日志
./scripts/dev-start.sh logs
```

### 服务说明

1. **Cloud Backend** - 后端服务
   - 目录: `code/cloud/backend/`
   - 启动命令: `npm run dev`
   - 默认端口: 3001

2. **Cloud Frontend** - 前端服务
   - 目录: `code/cloud/frontend/`
   - 启动命令: `npm run dev`
   - 默认端口: 5173

3. **Local Agent** - 本地代理
   - 目录: `code/local/`
   - 启动命令: `npm run dev`

### 日志和 PID 文件

- PID 文件存储在: `code/.pids/`
- 日志文件存储在: `code/.logs/`
  - `backend.log` - 后端日志
  - `frontend.log` - 前端日志
  - `local.log` - 本地代理日志

### 注意事项

- 首次运行时，脚本会自动安装依赖（如果 node_modules 不存在）
- 使用 `restart` 命令会先停止所有服务，等待 2 秒后再启动
- 停止服务时会先尝试优雅关闭（SIGTERM），如果 10 秒后仍未停止则强制关闭（SIGKILL）
- 所有服务在后台运行，可以通过 `logs` 命令查看实时日志

### 快速开始

```bash
# 第一次使用
cd /Users/kp/项目/Proj/cove/code
./scripts/dev-start.sh start

# 查看状态
./scripts/dev-start.sh status

# 查看日志
./scripts/dev-start.sh logs

# 重启服务
./scripts/dev-start.sh restart
```
