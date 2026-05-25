# Cove Development Scripts

## dev.sh (推荐使用)

一键启动和管理 Cove 开发环境的脚本，支持 npm workspaces。

### 功能

- 自动检查和安装根目录依赖（npm workspaces）
- 启动 Cloud Backend、Cloud Frontend 和 Local Agent
- 停止所有服务
- 重启所有服务
- 查看服务状态
- 查看实时日志

### 使用方法

```bash
# 启动所有服务（推荐）
./code/scripts/dev.sh start

# 停止所有服务
./code/scripts/dev.sh stop

# 重启所有服务
./code/scripts/dev.sh restart

# 查看服务状态
./code/scripts/dev.sh status

# 查看实时日志
./code/scripts/dev.sh logs
```

### 依赖管理（重要）

Cove 使用 **npm workspaces** 管理多个子项目，所有依赖安装在**根目录**的 `node_modules`。

**自动依赖检查**:
- `dev.sh start` 会自动检查根目录依赖
- 如果缺少依赖（如 `react-markdown`, `remark-gfm`），会自动运行 `npm install`
- 无需手动在子目录中安装依赖

**手动安装依赖**:
```bash
# 在项目根目录运行（不是在 code/cloud/frontend 目录）
cd /path/to/cove
npm install
```

### 服务说明

1. **Cloud Backend** - 后端服务
   - 目录: `code/cloud/backend/`
   - 启动命令: `npm run dev`
   - 默认端口: 3002

2. **Cloud Frontend** - 前端服务
   - 目录: `code/cloud/frontend/`
   - 启动命令: `npm run dev`
   - 默认端口: 5174

3. **Local Agent** - 本地代理
   - 目录: `code/local/`
   - 启动命令: `npm run dev`

### 日志和 PID 文件

- PID 文件存储在: `.pids/`（项目根目录）
- 日志文件存储在: `.logs/`（项目根目录）
  - `backend.log` - 后端日志
  - `frontend.log` - 前端日志
  - `local.log` - 本地代理日志

### 注意事项

- **首次运行**: 脚本会自动检查并安装根目录依赖
- **依赖更新**: 如果 package.json 更新，运行 `./code/scripts/dev.sh start` 会自动安装新依赖
- **端口冲突**: 脚本会自动清理占用的端口（3002, 5174）
- **后台运行**: 所有服务在后台运行，可以通过 `logs` 命令查看实时日志
- **优雅关闭**: 停止服务时会先尝试优雅关闭，10 秒后强制关闭

### 快速开始

```bash
# 第一次使用（从项目根目录）
cd /path/to/cove
./code/scripts/dev.sh start

# 查看状态
./code/scripts/dev.sh status

# 查看日志
./code/scripts/dev.sh logs

# 重启服务
./code/scripts/dev.sh restart
```

### 故障排查

**问题**: 前端报错找不到模块（如 `remark-gfm`）
**解决**: 
```bash
# 方案 1: 使用脚本自动修复
./code/scripts/dev.sh start

# 方案 2: 手动安装
cd /path/to/cove  # 注意：在根目录，不是 code/cloud/frontend
npm install
```

**问题**: 端口被占用
**解决**: 
```bash
# 脚本会自动清理端口，或手动停止
./code/scripts/dev.sh stop
```

---

## dev-start.sh (旧版本)

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
