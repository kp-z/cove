# CORS 修复说明

## 问题描述

前端（http://localhost:5175）无法访问后端 API（http://localhost:3001），浏览器报错：
```
Access to fetch at 'http://localhost:3001/trpc/agent.list' from origin 'http://localhost:5175' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 根本原因

后端 HTTP 服务器没有处理 CORS 预检请求（OPTIONS method），也没有在响应中添加必要的 CORS 头。

## 解决方案

在 `backend/src/main.ts` 的 HTTP 服务器请求处理器中添加：

### 1. 处理 OPTIONS 预检请求
```typescript
// Handle CORS preflight requests
if (req.method === 'OPTIONS') {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-trpc-source',
    'Access-Control-Max-Age': '86400',
  });
  res.end();
  return;
}
```

### 2. 为所有响应添加 CORS 头
```typescript
// Set CORS headers for all responses
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-trpc-source');
```

## 验证结果

### CORS 预检请求测试
```bash
curl -X OPTIONS -H "Origin: http://localhost:5175" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v http://localhost:3001/trpc/agent.list
```

**响应头**：
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-user-id, x-trpc-source
Access-Control-Max-Age: 86400
```

### 实际 API 请求测试
```bash
curl -H "Origin: http://localhost:5175" http://localhost:3001/trpc/agent.list
```

**结果**：✅ 成功返回数据

## WebSocket 连接问题

浏览器控制台还显示 WebSocket 连接失败。这是因为前端 tRPC 客户端配置了 WebSocket，但连接参数格式不正确。

### WebSocket 连接 URL 格式问题
前端发送：`ws://localhost:3001/?connectionParams=1`
后端期望：`ws://localhost:3001/?userId=xxx&userType=human`

### 临时解决方案
WebSocket 连接失败不影响 HTTP API 调用。如果不需要实时订阅功能，可以暂时忽略这个错误。

### 完整解决方案（可选）
修改 `frontend/src/lib/trpc.ts` 中的 WebSocket 客户端配置，确保 connectionParams 正确传递。

## 测试步骤

1. 重启后端服务器（已自动完成）
2. 刷新浏览器页面：http://localhost:5175/agents
3. 检查浏览器控制台，CORS 错误应该消失
4. Agent 列表应该正常显示

## 注意事项

⚠️ **生产环境配置**

当前使用 `Access-Control-Allow-Origin: *` 允许所有来源，这在开发环境是可以的，但在生产环境应该：

1. 限制允许的来源：
```typescript
const allowedOrigins = [
  'https://your-production-domain.com',
  'https://app.your-domain.com'
];

const origin = req.headers.origin;
if (origin && allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

2. 使用环境变量配置：
```typescript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
```

## 相关文件

- `backend/src/main.ts` - HTTP 服务器和 CORS 配置
- `frontend/src/lib/trpc.ts` - tRPC 客户端配置
- `frontend/src/core/config/env.ts` - 前端环境配置

## 修复时间

2026-05-15 15:27 UTC+8
