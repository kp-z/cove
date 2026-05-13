# Cove 部署协议规范 v1.0

## 概述

任何前后端项目只要遵循本协议，即可使用 Cove 部署工具进行一键部署。

## 配置文件

### 位置
- 文件名：`cove.deploy.json`
- 位置：项目根目录（与 `package.json` 同级）

### 基本结构

```json
{
  "version": "1.0",
  "type": "backend" | "frontend",
  "runtime": { ... },
  "build": { ... },
  "start": { ... },      // 后端必需
  "health": { ... },     // 后端必需
  "serve": { ... }       // 前端必需
}
```

## 字段说明

### 通用字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `version` | string | ✅ | 协议版本（当前为 "1.0"） |
| `type` | "backend" \| "frontend" | ✅ | 项目类型 |
| `runtime.type` | "node" \| "python" \| "go" | ✅ | 运行时类型 |
| `runtime.version` | string | ✅ | 运行时版本（如 "20", "3.11", "1.21"） |
| `build.command` | string | ✅ | 构建命令（如 "npm run build"） |
| `build.outputDir` | string | ✅ | 构建输出目录（如 "dist"） |
| `build.env` | object | ❌ | 构建时环境变量 |

### 后端特有字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `start.command` | string | ✅ | 启动命令（如 "node dist/main.js"） |
| `start.port` | number | ✅ | 监听端口（1-65535） |
| `start.env` | object | ❌ | 运行时环境变量 |
| `health.endpoint` | string | ✅ | 健康检查端点（必须以 / 开头） |
| `health.timeout` | number | ❌ | 启动超时秒数（默认 30） |
| `health.interval` | number | ❌ | 健康检查间隔秒数（默认 5） |

### 前端特有字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `serve.type` | "static" \| "ssr" | ✅ | 服务类型 |
| `serve.port` | number | ❌ | 服务端口（默认 80） |
| `serve.spa` | boolean | ❌ | 是否为 SPA（默认 false） |
| `serve.headers` | object | ❌ | 自定义 HTTP 响应头 |

### 可选字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `dependencies` | object | 外部服务依赖（如数据库、Redis） |
| `resources.memory` | string | 内存限制（如 "512M", "2G"） |
| `resources.cpu` | string | CPU 限制（如 "1", "0.5"） |

## 环境变量注入

使用 `${VAR_NAME}` 语法引用环境变量，部署工具会自动替换：

```json
{
  "build": {
    "env": {
      "VITE_API_URL": "${BACKEND_URL}"
    }
  }
}
```

## 健康检查要求

后端必须提供健康检查端点，返回 HTTP 200 状态码和 JSON 格式：

```json
{
  "status": "ok",
  "timestamp": "2026-05-10T10:00:00Z"
}
```

### 示例实现（NestJS）

```typescript
@Get('/health')
async health() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
}
```

## 完整示例

### 后端配置

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
    "port": 3000,
    "env": {
      "NODE_ENV": "production"
    }
  },
  "health": {
    "endpoint": "/health",
    "timeout": 30,
    "interval": 5
  },
  "dependencies": {
    "postgres": {
      "version": "16",
      "required": true
    },
    "redis": {
      "version": "7",
      "required": true
    }
  },
  "resources": {
    "memory": "512M",
    "cpu": "1"
  }
}
```

### 前端配置

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
    "outputDir": "dist",
    "env": {
      "VITE_API_URL": "${BACKEND_URL}"
    }
  },
  "serve": {
    "type": "static",
    "port": 80,
    "spa": true,
    "headers": {
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  },
  "resources": {
    "memory": "256M",
    "cpu": "0.5"
  }
}
```

## 协议验证

部署前会自动验证配置文件，不符合规范会拒绝部署：

```bash
cove-deploy validate
```

验证内容包括：
- JSON 格式正确性
- 必需字段完整性
- 字段类型正确性
- 业务逻辑合法性（端口范围、路径格式等）

## 前后端代码规范

详见：
- 前端规范：`frontend-guide.md`
- 后端规范：`backend-guide.md`
