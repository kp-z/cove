# Cove Deploy Toolkit

基于协议的前后端自动部署工具，支持 Docker 容器化部署。

## 特性

- ✅ **协议驱动**：通过 `cove.deploy.json` 配置文件定义部署行为
- ✅ **自动验证**：部署前自动验证配置文件是否符合规范
- ✅ **Docker 支持**：自动生成 Dockerfile 和 Nginx 配置
- ✅ **健康检查**：后端服务自动进行健康检查
- ✅ **环境变量**：支持通过 `.env` 文件注入环境变量
- ✅ **前后端统一**：一套工具同时支持前后端部署

## 安装

```bash
cd deploy-toolkit/cli
npm install
npm run build
npm link  # 全局安装
```

## 快速开始

### 1. 创建配置文件

在项目根目录创建 `cove.deploy.json`：

**后端示例**：
```json
{
  "version": "1.0",
  "type": "backend",
  "runtime": {
    "type": "node",
    "version": "20"
  },
  "build": {
    "command": "npm run build",
    "outputDir": "dist"
  },
  "start": {
    "command": "node dist/main.js",
    "port": 3000
  },
  "health": {
    "endpoint": "/health",
    "timeout": 30
  }
}
```

**前端示例**：
```json
{
  "version": "1.0",
  "type": "frontend",
  "runtime": {
    "type": "node",
    "version": "20"
  },
  "build": {
    "command": "npm run build",
    "outputDir": "dist"
  },
  "serve": {
    "type": "static",
    "spa": true
  }
}
```

### 2. 部署

```bash
# 部署项目
cove-deploy deploy

# 指定配置文件
cove-deploy deploy -c custom.deploy.json

# 使用环境变量文件
cove-deploy deploy -e .env.production
```

### 3. 管理服务

```bash
# 查看日志
cove-deploy logs -t backend -f

# 停止服务
cove-deploy stop -t backend

# 验证配置
cove-deploy validate
```

## 配置文件规范

详见 `docs/protocol.md`

## 目录结构

```
deploy-toolkit/
├── cli/                    # CLI 工具
│   ├── src/
│   │   ├── commands/       # 命令实现
│   │   ├── validators/     # 配置验证器
│   │   ├── utils/          # 工具函数
│   │   └── index.ts        # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── schemas/                # JSON Schema
│   └── deploy-config.schema.json
├── templates/              # 配置模板
│   └── config/
│       ├── backend.cove.deploy.json
│       └── frontend.cove.deploy.json
└── docs/                   # 文档
    └── protocol.md
```

## 开发

```bash
# 安装依赖
cd cli
npm install

# 开发模式
npm run dev deploy

# 构建
npm run build
```

## License

MIT
